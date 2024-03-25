import { AsyncLocalStorage } from "async_hooks";
import Bun from "bun";
import { randomBytes, createHash } from "crypto";
import { getSessionResponseHeaders } from "./app/session";

export const asyncLocalStorage = new AsyncLocalStorage<{
  match: Bun.MatchedRoute;
  request: Request;
  params: Record<string, string>;
}>();

export function getContext() {
  const store = asyncLocalStorage.getStore();
  if (!store) throw new Error("No request in context");
  return store;
}

class StatusCode {
  code: number;
  constructor(code: number) {
    this.code = code;
  }
}

export function statusCode(code: number) {
  return new StatusCode(code);
}

export function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  });
}

export type DataFunctionArgs = {
  request: Request;
  params: Record<string, string>;
};

export async function run({
  match,
  request,
  params,
  fn,
}: {
  match: Bun.MatchedRoute;
  request: Request;
  params: Record<string, string>;
  fn: () => AsyncGenerator<any, any, any>;
}) {
  return asyncLocalStorage.run({ match, request, params }, () => {
    const { promise, resolve, reject } = Promise.withResolvers();

    let statusCode = 200;
    let headers = new Headers();
    let resolved = false;
    let hasBody = false;
    let enqueue = (_chunk: any) => {};
    let close = () => {};

    const stream = new ReadableStream({
      start(controller: ReadableStreamController<unknown>) {
        enqueue = controller.enqueue.bind(controller);
        close = controller.close.bind(controller);
      },
    });

    function mergeHeaders(headers: Headers) {
      const responseHeaders = getSessionResponseHeaders();
      for (const [key, value] of responseHeaders.entries())
        headers.set(key, value);
    }

    function resolveResponse() {
      const res = new Response(hasBody ? stream : "", {
        status: statusCode,
        headers,
      });
      mergeHeaders(res.headers);
      resolve(res);

      resolved = true;
    }

    async function handleResultValue(result: any) {
      if (result === undefined) return;
      else if (result instanceof StatusCode) {
        statusCode = result.code;
      } else if (result instanceof Headers) {
        for (const [key, value] of result.entries()) headers.set(key, value);
      } else if (typeof result === "string" || result instanceof JSXNode) {
        hasBody = true;

        if (!resolved) {
          if (!headers.has("Content-Type"))
            headers.set("Content-Type", "text/html");
          if (headers.get("Content-Type") === "text/html")
            enqueue("<!DOCTYPE html>");

          resolveResponse();
        }

        if (result instanceof JSXNode) {
          for await (const chunk of result.toAsyncGenerator()) {
            enqueue(chunk);
          }
        } else {
          enqueue(result.toString());
        }
      }
    }

    const gen = fn();

    gen
      .next()
      .then(async (result) => {
        await handleResultValue(result.value);
        for await (let result of gen) {
          await handleResultValue(result);
        }

        const deferredGenerators =
          deferredGeneratorsWeakMap.get(getContext()) || [];

        for await (let result of combineGenerators([...deferredGenerators])) {
          await handleResultValue(result);
        }
      })
      .catch(async (value) => {
        if (value instanceof Response) {
          mergeHeaders(value.headers);
          resolve(value);
          resolved = true;
        } else if (!(value instanceof Error)) {
          await handleResultValue(value);
        } else {
          console.error(value);
          reject(value);
        }
      })
      .finally(() => {
        if (!resolved) {
          resolveResponse();
        }
        close();
      });

    return promise;
  });
}

export function js<T extends unknown[]>(
  fn: (...args: T) => void,
  ...args: T
): string {
  return `(${fn.toString()})(...${JSON.stringify(args)})`;
}

export function script<T extends unknown[]>(
  fn: (...args: T) => void,
  ...args: T
): string {
  return `<script>${js(fn, ...args)}</script>`;
}

export function bind<E extends Event, T extends unknown[]>(
  selector: string,
  event: string,
  fn: (event: E, ...args: T) => void,
  ...args: any[]
) {
  const safeEvent = JSON.stringify(event);
  const safeSelector = JSON.stringify(selector);
  const safeArgs = JSON.stringify(args);
  const safeFn = fn.toString();

  return `<script>document.body.addEventListener(${safeEvent},(event) => event.target.matches(${safeSelector}) && (${safeFn})(event, ...${safeArgs}))</script>`;
}

const onceWeakMap = new WeakMap<Request, Set<string>>();
export function once(str: string) {
  const req = getContext().request;
  if (!onceWeakMap.has(req)) onceWeakMap.set(req, new Set());
  if (onceWeakMap.get(req)!.has(str)) return "";
  onceWeakMap.get(req)!.add(str);
  return str;
}

export function css(
  strings: TemplateStringsArray,
  ...values: (string | number)[]
) {
  const style = strings.reduce(
    (acc, str, i) => acc + str + (values[i] || ""),
    ""
  );
  return `<style>${style}</style>`;
}

function styledInternal(
  Type: string,
  styles: string,
  variants: Record<string, Record<string, string>> = {},
  defaultVariants: Record<string, string> = {}
) {
  const removeTags = (x: string) =>
    x.replace(/^<style>/, "").replace(/<\/style>$/, "");
  const cn =
    "x" + createHash("sha256").update(styles).digest("hex").slice(0, 8);
  let cleanedStyles = `.${cn}{${removeTags(styles)}}`;

  return async function* ({ children, class: className, ...props }: any) {
    yield once(`<style>${cleanedStyles}</style>`);

    const allProps = {
      ...defaultVariants,
      ...props,
    };

    const classNames: string[] = className ? [cn, className] : [cn];
    for (const key of Object.keys(allProps)) {
      if (!variants[key]) continue;
      const variant = variants[key];
      const value = allProps[key] as keyof typeof variant;
      if (value === undefined) continue;
      classNames.push(variant[value] ?? "");
    }

    yield (
      <Type class={classNames.join(" ") || undefined} {...props}>
        {children}
      </Type>
    );
  };
}

export const styled = new Proxy(styledInternal, {
  get(_, prop) {
    return (
      styles: string,
      variants: Record<string, Record<string, string>>,
      defaultVariants?: Record<string, string>
    ) => styledInternal(prop.toString(), styles, variants, defaultVariants);
  },
}) as typeof styledInternal & {
  [key: string]: (
    styles: string,
    variants?: Record<string, Record<string, string>>,
    defaultVariants?: Record<string, string>
  ) => (props: any) => JSXNode<any, any>;
};

export async function* combine(...functions: (() => AsyncGenerator<any>)[]) {
  return yield* combineGenerators(functions.map((fn) => fn()));
}

export async function* combineGenerators(gens: AsyncGenerator<any>[]) {
  let generators = gens.map((gen) => {
    return [gen, gen.next()] as const;
  });

  while (generators.length > 0) {
    const promises = generators.map(
      async ([gen, promise]) => [gen, await promise] as const
    );

    const [gen, completed] = await Promise.race(promises);

    if (completed.done) {
      generators = generators.filter(([g]) => g !== gen);
    } else {
      // replace the completed promise with the next one
      generators = generators.map(([g, p]) => [g, g === gen ? g.next() : p]);
      yield completed.value;
    }
  }
}

export class JSXNode<
  Props,
  Type extends
    | string
    | ((fn: Props) => AsyncGenerator<string | number | JSXNode<any, any>>),
> {
  type: Type;
  props: Props;

  constructor(type: Type, props: Props) {
    this.type = type;
    this.props = props;
  }

  async *toAsyncGenerator(): AsyncGenerator<string> {
    if (typeof this.type === "function") {
      const gen = this.type(this.props);
      if (gen instanceof JSXNode) yield* gen.toAsyncGenerator();
      else if (gen[Symbol.asyncIterator]) {
        while (true) {
          // Can't use for await here because exiting the loop
          // calls return on the generator.

          let next = await gen.next();

          if (next.value) {
            if (next.value === flushObj) {
              deferGenerator(gen);
              break;
            } else if (next.value instanceof JSXNode) {
              yield* next.value.toAsyncGenerator();
            } else {
              yield typeof next.value === "number"
                ? next.value.toLocaleString()
                : next.value;
            }
          }

          if (next.done) break;
        }
      } else {
        throw new Error("Invalid JSX function");
      }
      return;
    }

    let { children, ...props } = this.props as any;

    const abort = (msg: string) => {
      throw new Error(msg);
    };

    if (this.type !== "fragment") {
      let opening = `<${this.type}`;

      for (const key in props) {
        if (props[key] === undefined) continue;
        opening += ` ${key}="${
          typeof props[key] === "function"
            ? abort("Define a server or client action instead of a function")
            : props[key].toString()
        }"`;
      }
      opening += ">";
      yield opening;
    }

    if (!Array.isArray(children)) children = [children];
    for (const child of children.flat()) {
      if (!child && child !== 0) continue;
      if (child instanceof JSXNode) yield* child.toAsyncGenerator();
      else yield typeof child === "number" ? child.toLocaleString() : child;
    }

    if (this.type !== "fragment") yield `</${this.type}>`;
  }
}

export const actionParam = "_action";

const serverActionsWeakMap = new WeakMap<
  Record<any, string>,
  Record<string, () => AsyncGenerator<any, any, any>>
>();

export function createServerActions<
  Server extends Record<string, () => AsyncGenerator<any, any, any>>,
>(server: Server) {
  type Return = Record<keyof Server, string>;
  const obj: Partial<Return> = {};

  for (const key of Object.keys(server)) {
    Object.defineProperty(obj, key, {
      get: () => {
        const { request } = getContext();
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);
        search.set(actionParam, key);
        const newUrl = new URL(url.toString());
        newUrl.search = search.toString();
        return newUrl.toString();
      },
    });
  }

  serverActionsWeakMap.set(obj as Record<string, string>, server);

  return obj as Return;
}

export function getServerActions(obj: Record<string, string>) {
  if (!serverActionsWeakMap.has(obj))
    throw new Error("Server actions not found");

  return serverActionsWeakMap.get(obj)!;
}

const flushObj = {};
export function defer() {
  return flushObj;
}

const deferredGeneratorsWeakMap = new WeakMap<
  ReturnType<typeof getContext>,
  Set<AsyncGenerator<any, any, any>>
>();

function deferGenerator(gen: AsyncGenerator<any, any, any>) {
  const context = getContext();
  if (!deferredGeneratorsWeakMap.has(context))
    deferredGeneratorsWeakMap.set(context, new Set());
  const deferredGenerators = deferredGeneratorsWeakMap.get(context)!;
  deferredGenerators.add(gen);
}

export function* swap(selector: string, node: JSXNode<any, any>) {
  const name = "__swap__";

  yield once(
    script((name) => {
      document.currentScript?.remove();
      //@ts-expect-error
      window[name] = async function swap(selector: string) {
        let el = document.querySelector(selector);
        if (!el) throw new Error("Element not found: " + selector);
        const template = document.currentScript
          ?.previousElementSibling as HTMLTemplateElement;
        template?.parentElement?.removeChild(template);
        el!.replaceWith(template.content.firstElementChild!);
      };
    }, name)
  );
  yield <template>{node}</template>;
  yield script(
    (name, selector) =>
      (
        //@ts-expect-error
        window[name](selector), document.currentScript?.remove()
      ),
    name,
    selector
  );
}

export function createBookmark() {
  const id = "x" + randomBytes(4).toString("hex");
  let firstWrite = true;

  return async function* write(node: JSXNode<any, any>) {
    if (firstWrite) {
      firstWrite = false;
      yield <script type="text/placeholder" id={id} />;
      yield node;
    } else {
      yield* swap(`#${id} + *`, node);
    }
  };
}
