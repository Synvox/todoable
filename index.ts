import Bun from "bun";
import { run } from "./util";

const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./routes",
  assetPrefix: "public",
});

Bun.serve({
  port: 4000,
  development: true,
  async fetch(req) {
    const match = router.match(req);

    if (!match) {
      const filePath = "./public" + new URL(req.url).pathname;
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file);
      else return new Response("Not Found", { status: 404 });
    } else {
      const url = new URL(req.url);
      if (url.pathname !== "/" && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.slice(0, -1);
        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
          },
        });
      }
      const { default: fn } = await import(match.filePath);
      if (fn === undefined) return new Response("Not Found", { status: 404 });
      return await run(match, req, match.params, fn);
    }
  },
  error() {
    return new Response(null, { status: 404 });
  },
});
