import { css, getContext, redirect, styled } from "~/util";
import { Button } from "../components/Button";
import { Input, InputLabel } from "../components/Input";
import { Stack } from "../components/Stack";
import { H1, Label } from "../components/Text";
import { getUser } from "../getters/user";
import { layout } from "../layouts/index";
import { sql } from "../sql";

function getProject() {
  const { match } = getContext();
  const { projectId } = match.params;
  const user = getUser();

  const project = sql<{ id: number; name: string }>`
    select id, name
    from projects
    where user_id = ${user.id}
    and id = ${projectId}
  `.first();

  if (!project) throw redirect("/");

  return project;
}

export const serverActions = {
  async *updateTask() {
    const { request } = getContext();
    const project = getProject();
    const body = await request.formData();
    const name = String(body.get("name") || "") || null;
    const taskId = String(body.get("taskId") || "");
    const completed = String(body.get("completed") || "") || null;
    sql`
      update tasks
      set
        name = coalesce(${name}, name),
        completed = coalesce(${
          completed === null ? null : completed === "true"
        }, completed),
        updated_at = current_timestamp
      where id = ${taskId}
      and project_id = ${project.id}
    `.exec();
    throw redirect(`/${project.id}`);
  },
  async *deleteTask() {
    const { request } = getContext();
    const project = getProject();
    const body = await request.formData();
    const taskId = String(body.get("taskId") || "");

    sql`
      delete from tasks
      where id = ${taskId}
      and project_id = ${project.id}
    `.exec();

    throw redirect(`/${project.id}`);
  },
  async *createTask() {
    const project = getProject();
    const { request } = getContext();
    const body = await request.formData();
    const name = String(body.get("name") || "") || null;
    if (name)
      sql`
        insert into tasks (project_id, name)
        values (${project.id}, ${name})
      `.exec();
    throw redirect(`/${project.id}`);
  },
};

export const clientActions = {
  autoSave: (e: InputEvent) => {
    const form = (e.target as HTMLInputElement).form!;
    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
    });
  },
};

export default async function* () {
  const Layout = await layout({ title: "Login" });
  const project = getProject();

  const tasks = sql<{ id: number; name: string; completed: boolean }>`
    select id, name, completed
    from tasks
    where project_id = ${project.id}
    order by completed, updated_at desc
  `.all();

  yield (
    <Layout>
      <div style="flex:1;text-align:center;">
        <div style="width:100%;max-width:900px;margin:auto;text-align:left;padding:40px 20px">
          <Stack>
            <H1>{project.name}</H1>
            <Box>
              <form
                style="display:flex;gap:8px;align-items:flex-end"
                method="POST"
                action={serverActions.createTask}
              >
                <InputLabel>
                  New Task
                  <Input type="text" placeholder="Task name" name="name" />
                </InputLabel>
                <Button>Submit</Button>
              </form>
            </Box>
            {Object.entries({
              Active: tasks.filter((x) => !x.completed),
              Completed: tasks.filter((x) => x.completed),
            }).map(([label, tasks]) => (
              <Stack gap="xs">
                <Label>{label}</Label>
                <Box style="padding:0;min-height:60px;">
                  {tasks.length === 0 ? (
                    <div style="justify-content:center;align-items:center;display:flex;flex:1;font-weight:500;opacity:.5">
                      No Tasks
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskRow style={`view-transition-name: task-${task.id}`}>
                        <form method="POST" action={serverActions.updateTask}>
                          <input type="hidden" name="taskId" value={task.id} />

                          <button
                            type="submit"
                            name="completed"
                            value={task.completed ? "false" : "true"}
                          >
                            {!task.completed ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <title>check</title>
                                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <title>check-decagram</title>
                                <path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
                              </svg>
                            )}
                          </button>
                        </form>
                        <form
                          method="POST"
                          action={serverActions.updateTask}
                          style="flex:1"
                        >
                          <input type="hidden" name="taskId" value={task.id} />

                          <input
                            type="text"
                            name="name"
                            value={task.name}
                            className="task-input"
                            onChange={clientActions.autoSave}
                          />
                        </form>
                        <form method="POST" action={serverActions.deleteTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                            >
                              <title>delete-outline</title>
                              <path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" />
                            </svg>
                          </button>
                        </form>
                      </TaskRow>
                    ))
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>
        </div>
      </div>
    </Layout>
  );
}

const Box = styled.div(css`
  width: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  padding: 20px;
`);

const TaskRow = styled.div(css`
  display: flex;
  align-items: center;
  height: 60px;
  & > form {
    height: 100%;
    & > input[type="text"] {
      height: 100%;
      padding: 10px 20px;
      background: transparent;
      border: none;
      font-size: 16px;
      width: 100%;
    }
    & > button {
      border-radius: 5px;
      padding: 10px 20px;
      background: transparent;
      color: #444;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
      width: 80px;
      height: 100%;
      font-size: 14px;
      font-weight: bold;
      &[value="false"] {
        color: #007bff;
      }
      &:hover {
        background: #f9f9f9;
      }
      &:active {
        opacity: 0.8;
      }
      & > svg {
        width: 32px;
        height: 32px;
      }
    }
  }
  & + & {
    border-top: 1px solid #eee;
  }
`);
