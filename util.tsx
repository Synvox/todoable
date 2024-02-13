import { AsyncLocalStorage } from "async_hooks";
import Bun from "bun";
import { randomBytes } from "crypto";
import { getSessionResponseHeaders } from "./app/session";

export const asyncLocalStorage = new AsyncLocalStorage<{
  match: Bun.MatchedRoute;
  request: Request;
  params: Record<string, string>;
  functions: Map<<T>() => Promise<T>, string>;
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
  functions,
}: {
  match: Bun.MatchedRoute;
  request: Request;
  params: Record<string, string>;
  fn: () => AsyncGenerator<any, any, any>;
  functions: Map<<T>() => Promise<T>, string>;
}) {
  return asyncLocalStorage.run({ match, request, params, functions }, () => {
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
          for await (const chunk of result.toAsyncGenerator(functions)) {
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
        for await (let result of gen) await handleResultValue(result);
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
  return `<script>(${fn.toString()})(...${JSON.stringify(args)})</script>`;
}

export function bind<E extends Event, T extends unknown[]>(
  selector: string,
  event: string,
  fn: (event: E, ...args: T) => void,
  ...args: any[]
) {
  return `<script>document.body.addEventListener(${JSON.stringify(
    event
  )},(event) => event.target.matches(${JSON.stringify(
    selector
  )}) && (${fn.toString()})(event, ...${JSON.stringify(args)}))</script>`;
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
  const cn = "x" + randomBytes(4).toString("hex");
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
  let generators = functions.map((fn) => {
    const gen = fn();
    return [gen, gen.next()] as const;
  });

  while (generators.length > 0) {
    const promises = generators.map(
      async ([gen, promise]) => [gen, await promise] as const
    );

    const [gen, completed] = await Promise.race(promises);

    // replace the completed promise with the next one
    generators = generators.map(([g, p]) => [g, g === gen ? g.next() : p]);

    if (completed.done) {
      generators = generators.filter(([g]) => g !== gen);
    } else {
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

  async *toAsyncGenerator(
    functions: Map<<T>() => Promise<T>, string>
  ): AsyncGenerator<string> {
    if (typeof this.type === "function") {
      const gen = this.type(this.props);
      if (gen instanceof JSXNode) yield* gen.toAsyncGenerator(functions);
      else if (gen[Symbol.asyncIterator]) {
        for await (const chunk of gen) {
          if (chunk instanceof JSXNode)
            yield* chunk.toAsyncGenerator(functions);
          else yield typeof chunk === "number" ? chunk.toLocaleString() : chunk;
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

    let opening = `<${this.type}`;

    for (const key in props) {
      if (props[key] === undefined) continue;
      opening += ` ${key}="${
        typeof props[key] === "function"
          ? functions.has(props[key])
            ? functions.get(props[key])!
            : abort("Function not found in serverActions or clientActions")
          : props[key].toString()
      }"`;
    }
    opening += ">";
    yield opening;

    if (!Array.isArray(children)) children = [children];
    for (const child of children.flat()) {
      if (!child && child !== 0) continue;
      if (child instanceof JSXNode) yield* child.toAsyncGenerator(functions);
      else yield typeof child === "number" ? child.toLocaleString() : child;
    }

    yield `</${this.type}>`;
  }
}
