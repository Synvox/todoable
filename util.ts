import Bun from "bun";
import { relative, join } from "path";
import { AsyncLocalStorage } from "async_hooks";
import { getSessionResponseHeaders } from "./session";

export const asyncLocalStorage = new AsyncLocalStorage<{
  match: Bun.MatchedRoute;
  request: Request;
  params: Record<string, string>;
}>();

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

export async function run(
  match: Bun.MatchedRoute,
  request: Request,
  params: Record<string, string>,
  fn: (ctx: DataFunctionArgs) => AsyncGenerator<any, any, any>
) {
  const { promise, resolve, reject } = Promise.withResolvers();

  let enqueue = (_chunk: any) => {};
  let close = () => {};
  const stream = new ReadableStream({
    start(controller: ReadableStreamController<unknown>) {
      enqueue = controller.enqueue.bind(controller);
      close = controller.close.bind(controller);
    },
  });

  let statusCode = 200;
  let headers = new Headers();
  let resolved = false;
  let hasBody = false;

  function mergeHeaders(headers: Headers) {
    const responseHeaders = getSessionResponseHeaders(request);
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

  const gen = fn({ request, params });

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
}

export function js<T extends unknown[]>(
  fn: (...args: T) => void,
  ...args: T
): string {
  return `<script>(${fn.toString()})(...${JSON.stringify(args)})</script>`;
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

  async *toAsyncGenerator(): AsyncGenerator<string> {
    if (typeof this.type === "function") {
      const gen = this.type(this.props);
      if (gen instanceof JSXNode) yield* gen.toAsyncGenerator();
      else if (gen[Symbol.asyncIterator]) {
        for await (const chunk of gen) {
          if (chunk instanceof JSXNode) yield* chunk.toAsyncGenerator();
          else yield typeof chunk === "number" ? chunk.toLocaleString() : chunk;
        }
      } else {
        throw new Error("Invalid JSX function");
      }
      return;
    }

    let { children, ...props } = this.props as any;

    let opening = `<${this.type}`;
    for (const key in props) {
      opening += ` ${key}="${
        typeof props[key] === "function"
          ? `(${props[key].toString().replaceAll('"', "&quot;")})(event)`
          : props[key].toString()
      }"`;
    }
    opening += ">";
    yield opening;

    if (!Array.isArray(children)) children = [children];
    for (const child of children.flat()) {
      if (!child && child !== 0) continue;
      if (child instanceof JSXNode) yield* child.toAsyncGenerator();
      else yield typeof child === "number" ? child.toLocaleString() : child;
    }

    yield `</${this.type}>`;
  }
}

export function relativeTo(to: string) {
  const store = asyncLocalStorage.getStore();
  if (!store) throw new Error("No request in context");
  const from = store.match.filePath;
  const prefix = relative(from, to);
  return function (to: string) {
    return join(prefix, to);
  };
}
