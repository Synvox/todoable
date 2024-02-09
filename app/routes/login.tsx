import { password as Password } from "bun";
import { getSession, setSession } from "~/app/session";
import { css, getContext, redirect, styled } from "~/util";
import { layout } from "../layouts/root";
import { sql } from "../sql";
import { Button } from "../components/Button";
import { Input, InputLabel } from "../components/Input";
import { Stack } from "../components/Stack";
import { Alert } from "../components/Alert";
import { H1, HGroup } from "../components/Text";

export default async function* () {
  const { request } = getContext();
  const search: URLSearchParams = new URL(request.url).searchParams;
  const Layout = await layout({ title: "Login" });

  if (getSession().userId) throw redirect("/");

  let error = "";
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
      setSession({ userId: user.id });
      throw redirect("/");
    }

    error = "Invalid username or password";
  }

  yield (
    <Layout>
      <Container>
        <Form method="POST" action="/login">
          <Stack gap="lg">
            <Stack gap="xs" style="align-items:center;text-align:center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                style="width:96px;height:96px;fill:#007bff;"
              >
                <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
              </svg>
              <HGroup>
                <H1>Todoable</H1>
                <p>Please log in</p>
              </HGroup>
            </Stack>
            {search.has("notice") && <Alert>{search.get("notice")}</Alert>}
            {Boolean(error) && <Alert type="error">{error}</Alert>}
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
        </Form>
      </Container>
    </Layout>
  );
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
