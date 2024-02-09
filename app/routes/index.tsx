import { getSession } from "~/app/session";
import { redirect } from "~/util";
import { layout } from "../layouts/index";
import { sql } from "../sql";

export default async function* () {
  const Layout = await layout({ title: "Login" });
  const userId = getSession().userId;
  if (!userId) throw redirect("/login");

  const user = sql<{ id: number; username: string }>`
    select id, username
    from users
    where id = ${userId}
  `.first();

  if (!user) throw redirect("/login");

  yield (
    <Layout>
      <div style="display:flex;flex-direction:column;flex:1;justify-content:center;align-items:center;">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          style="width:256px;height:256px;fill:#fff;stroke:#eee;stroke-width:.1"
        >
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12ZM22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7ZM18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
        </svg>
        <p style="opacity:.4">Select a project</p>
      </div>
    </Layout>
  );
}
