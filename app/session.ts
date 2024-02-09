import { randomBytes } from "crypto";
import { sql } from "./sql";
import { getContext, type DataFunctionArgs } from "../util";

const sessionIdWeakMap = new WeakMap<DataFunctionArgs["request"], string>();
const sessionResponseHeadersWeakMap = new Map<
  DataFunctionArgs["request"],
  Headers
>();

function setResponseHeaders(headers: Headers) {
  const req = getContext().request;
  if (sessionResponseHeadersWeakMap.has(req)) {
    for (const [k, v] of sessionResponseHeadersWeakMap.get(req)!)
      headers.set(k, v);
  } else {
    sessionResponseHeadersWeakMap.set(req, headers);
  }
}

export function getSessionResponseHeaders() {
  const req = getContext().request;
  return sessionResponseHeadersWeakMap.get(req) ?? new Headers();
}

export function cookies(): Record<string, string> {
  const req = getContext().request;
  const cookieStr = req.headers.get("cookie") || "";
  if (!cookieStr) return {};
  return cookieStr
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc: any, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, {});
}

function getSessionId() {
  const req = getContext().request;
  if (sessionIdWeakMap.has(req)) return sessionIdWeakMap.get(req)!;
  const reqCookies = cookies();
  const id = reqCookies.session || randomBytes(32).toString("hex");
  sessionIdWeakMap.set(req, id);
  if (!reqCookies.session) {
    setResponseHeaders(
      new Headers({ "Set-Cookie": `session=${id}; HttpOnly; SameSite=Strict` })
    );
  }
  return id;
}

export function getSession() {
  const id = getSessionId();
  const session = sql<{ data: any }>`
    select data from sessions
    where id = ${id}
  `.first();
  if (session) return JSON.parse(session.data);
  else return {};
}

export function setSession(data: any) {
  const id = getSessionId();
  const session = getSession();
  sql`
    insert into sessions (id, data)
    values (${id}, ${JSON.stringify({
      ...session,
      ...data,
    })})
    on conflict (id) do update set data = excluded.data
  `.exec();
}

export function endSession() {
  const id = getSessionId();

  sql`
    delete from sessions
    where id = ${id}
  `.exec();

  setResponseHeaders(
    new Headers({ "Set-Cookie": `session=; HttpOnly; SameSite=Strict` })
  );
}
