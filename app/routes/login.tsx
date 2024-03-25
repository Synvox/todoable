import { password as Password } from "bun";
import { getSession, setSession } from "~/app/session";
import {
  createBookmark,
  createServerActions,
  css,
  defer,
  getContext,
  redirect,
  styled,
} from "~/util";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Input, InputLabel } from "../components/Input";
import { Stack } from "../components/Stack";
import { H1, HGroup } from "../components/Text";
import { layout } from "../layouts/root";
import { sql } from "../sql";

export const serverActions = createServerActions({
  async *login() {
    const { request } = getContext();
    if (request.method !== "POST") throw redirect("/login");

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
      setSession({ userId: user.id });
      throw redirect("/");
    } else {
      throw redirect("/login?error=Invalid username or password");
    }
  },
});

export default async function* () {
  const { request } = getContext();
  const search: URLSearchParams = new URL(request.url).searchParams;
  const Layout = await layout({ title: "Login" });

  if (getSession().userId) throw redirect("/");

  yield (
    <Layout>
      <Container>
        <Form
          method="POST"
          action={serverActions.login}
          style="view-transition-name: nav;"
        >
          <Stack gap="lg">
            <Stack gap="xs" style="align-items:center;text-align:center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                style="width:128px;height:128px;fill:#007bff;margin-top:-80px;background:white;border-radius:50%;box-shadow:0px 1px 3px rgba(0,0,0,0.1);padding:16px;"
              >
                <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
              </svg>
              <HGroup>
                <H1>Todoable</H1>
                <p>Please log in</p>
              </HGroup>
            </Stack>
            {search.has("notice") && <Alert>{search.get("notice")}</Alert>}
            {search.has("error") && (
              <Alert type="error">{search.get("error")}</Alert>
            )}
            <Stack>
              <InputLabel>
                Username
                <Input type="text" name="username" placeholder="username" />
              </InputLabel>
              <InputLabel>
                Password
                <Input type="password" name="password" placeholder="password" />
              </InputLabel>
              <Button type="submit">Submit</Button>
            </Stack>
          </Stack>
          <Test />
        </Form>
      </Container>
    </Layout>
  );
}

async function* Test() {
  const write = createBookmark();

  yield* write(<div>Hello</div>);
  yield defer();

  await new Promise((r) => setTimeout(r, 1000));
  yield* write(<div>Hello World</div>);

  await new Promise((r) => setTimeout(r, 1000));
  yield* write(<div>Hello World!!!</div>);
}

const Container = styled.div(css`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8f8f8;
`);

const Form = styled.form(css`
  max-width: 400px;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  padding: 20px;
`);
