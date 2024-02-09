import { css, getContext, styled } from "~/util";
import { Stack } from "../components/Stack";
import { H1 } from "../components/Text";
import { sql } from "../sql";
import { layout as rootLayout } from "./root";

export async function layout({ title }: { title: string }) {
  const match = getContext().match;
  const Layout = await rootLayout({ title });

  const projects = sql<{
    id: number;
    name: string;
    tasksCount: number;
  }>`
    select
      id,
      name,
      (select count(*) from tasks where project_id = projects.id) as tasksCount
    from projects
  `.all();

  return async function* ({ children }: { children: any }) {
    yield (
      <Layout>
        <Container>
          <Panel style="flex-basis: 320px;flex-grow:0;">
            <Stack gap="xs">
              <div style="padding: 0 10px;view-transition-name: nav;">
                <div style="border-bottom: 1px solid #eee;padding: 10px 0px;">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    style="width:96px;height:96px;fill:#007bff"
                  >
                    <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
                  </svg>
                  <H1>Todoable</H1>
                </div>
              </div>
              <Stack gap="xs" style="padding: .25rem">
                {projects.map((project) => {
                  const active = match.params.projectId === String(project.id);
                  return (
                    <Link
                      href={`/${project.id}`}
                      variant={active ? "active" : undefined}
                    >
                      <span style="position:relative;z-index:1">
                        {project.name}
                      </span>
                      <small style="position:relative;z-index:1">
                        {project.tasksCount} Tasks
                      </small>
                    </Link>
                  );
                })}
              </Stack>
            </Stack>
            <a
              href="/logout"
              style="padding: 8px;text-decoration: none;color: inherit;font-weight: 500; bottom:8px;left:8px;position:absolute;"
            >
              Logout
            </a>
          </Panel>
          {children}
        </Container>
      </Layout>
    );
  };
}

const Container = styled.main(css`
  height: 100%;
  display: flex;
  flex-direction: row;
  background: #f8f8f8;
  & > * {
    flex: 1;
  }
`);

const Panel = styled.article(css`
  display: flex;
  flex-direction: column;
  box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
  background: white;
  position: relative;
`);

const Link = styled.a(
  css`
    display: flex;
    position: relative;
    flex-direction: column;
    padding: 8px;
    text-decoration: none;
    color: inherit;
    border-radius: 5px;
    font-weight: 500;
    &:hover {
      background: #f0f0f0;
    }
    &.active {
      background: #007bff;
      color: white;
      view-transition-name: nav-link-blue;
    }
  `,
  {
    variant: {
      active: "active",
      inactive: "",
    },
  },
  {
    variant: "inactive",
  }
);
