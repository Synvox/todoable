import { redirect } from "~/util";
import { getSession } from "../session";
import { sql } from "../sql";

export function getUser() {
  const userId = getSession().userId;
  if (!userId) throw redirect("/login");

  const user = sql<{ id: number; username: string }>`
    select id, username
    from users
    where id = ${userId}
  `.first();

  if (!user) throw redirect("/login");

  return user;
}
