import Bun from "bun";
import { run } from "./util";

const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./app/routes",
  assetPrefix: "public",
});

Bun.serve({
  port: 4050,
  development: true,
  async fetch(request) {
    const match = router.match(request);

    if (!match) {
      const filePath = "./public" + new URL(request.url).pathname;
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file);
      else return new Response("Not Found", { status: 404 });
    } else {
      const url = new URL(request.url);
      if (url.pathname !== "/" && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.slice(0, -1);
        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
          },
        });
      }
      const {
        default: fn,
        serverActions = {},
        clientActions = {},
      } = await import(match.filePath);
      if (fn === undefined) return new Response("Not Found", { status: 404 });

      const functions = new Map();
      const functionParam = "_action";

      for (const [key, value] of Object.entries(serverActions)) {
        const search = new URLSearchParams(url.search);
        search.set(functionParam, key);
        const newUrl = new URL(url.toString());
        newUrl.search = search.toString();
        functions.set(value, newUrl.toString());
      }

      for (const value of Object.values(clientActions)) {
        functions.set(
          value,
          `(${(value as Function).toString().replaceAll('"', "&quot;")})(event)`
        );
      }

      if (url.searchParams.has(functionParam)) {
        const action = url.searchParams.get(functionParam);
        const serverAction = serverActions[action];
        if (serverAction === undefined) {
          return new Response("Not Found", { status: 404 });
        }
        return await run({
          match,
          request,
          params: match.params,
          fn: serverAction,
          functions,
        });
      }

      return await run({
        match,
        request,
        params: match.params,
        fn,
        functions,
      });
    }
  },
  error() {
    return new Response(null, { status: 404 });
  },
});
