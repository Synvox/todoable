import { password as Password } from "bun";
import { redirect, type DataFunctionArgs } from "~/util";
import { sql } from "../sql";
import { getSession, setSession } from "~/session";

export default async function* ({ request }: DataFunctionArgs) {
  if (getSession(request).userId) throw redirect("/welcome");

  if (request.method === "POST") {
    const body = await request.formData();

    const username = String(body.get("username"));
    const password = String(body.get("password") as string);

    const user = sql<{ id: number; username: string; password: string }>`
      select
        id,
        username,
        password
      from users
      where username = ${username}
    `.first();

    if (user && (await Password.verify(password, user.password))) {
      setSession(request, { userId: user.id });
      throw redirect("/welcome");
    }

    yield (
      <p
        // @ts-expect-error not using react
        style="color:red"
      >
        Invalid username or password
      </p>
    );
  }

  yield (
    <form method="POST">
      <input type="text" name="username" placeholder="username" />
      <br />
      <input type="password" name="password" placeholder="password" />
      <br />
      <button type="submit">Submit</button>
    </form>
  );
}
