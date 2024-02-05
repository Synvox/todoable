import { redirect, type DataFunctionArgs } from "~/util";
import { sql } from "../sql";
import { getSession } from "~/session";

export default async function* ({ request }: DataFunctionArgs) {
  const userId = getSession(request).userId;
  if (!userId) throw redirect("/login");

  const user = sql<{ id: number; username: string }>`
    select * from users
    where id = ${userId}
  `.first();

  if (!user) throw redirect("/login");

  yield (
    <div>
      <h1>Admin</h1>
      <p>Hello {user.username}</p>
      <a href="/logout">Logout</a>
    </div>
  );
}
