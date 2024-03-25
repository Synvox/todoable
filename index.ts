import Bun from "bun";
import { actionParam, getServerActions, run } from "./util";

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
      const { default: fn, serverActions = {} } = await import(match.filePath);
      if (fn === undefined) return new Response("Not Found", { status: 404 });

      if (url.searchParams.has(actionParam)) {
        const actions = getServerActions(serverActions);
        const action = url.searchParams.get(actionParam);
        const serverAction = actions[action];
        if (serverAction === undefined) {
          return new Response("Not Found", { status: 404 });
        }
        return await run({
          match,
          request,
          params: match.params,
          fn: serverAction,
        });
      }

      return await run({
        match,
        request,
        params: match.params,
        fn,
      });
    }
  },
  error() {
    return new Response(null, { status: 404 });
  },
});
