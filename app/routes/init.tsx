// putting this in a route for a quick and dirty way to initialize the database

import { password as Password } from "bun";
import { sql } from "../sql";

export default async function* () {
  yield <div>Initializing database</div>;

  sql`drop table if exists sessions`.exec();

  sql`
    create table if not exists sessions (
      id text primary key,
      data text not null
    )
  `.exec();

  sql`drop table if exists users`.exec();

  sql`
    create table if not exists users (
      id integer primary key,
      username text not null,
      password text not null
    )
  `.exec();

  const user = sql<{ id: number }>`
    insert into users (username, password)
    values ('admin', ${await Password.hash("password")})
    returning id
  `.first()!;

  sql`drop table if exists projects`.exec();
  sql`drop table if exists tasks`.exec();

  sql`
    create table if not exists projects (
      id integer primary key,
      user_id integer not null references users(id),
      name text not null
    )
  `.exec();

  sql`
    create table if not exists tasks (
      id integer primary key,
      project_id integer not null references projects(id),
      name text not null,
      completed boolean not null default false
    )
  `.exec();

  const tasks = {
    Default: ["Get Milk", "Take out the trash", "Do the dishes"],
    Family: [
      "Call mom",
      "Pick up kids",
      "Make dinner",
      "Do laundry",
      "Clean the house",
    ],
    Work: [
      "Finish the report",
      "Call the client",
      "Schedule the meeting",
      "Send the email",
    ],
    Personal: [
      "Go to the gym",
      "Read a book",
      "Write a blog post",
      "Meditate",
      "Take a walk",
    ],
  } as const;

  for (let name in tasks) {
    const project = sql<{ id: number }>`
      insert into projects (user_id, name)
      values (${user.id}, ${name})
      returning id
    `.first()!;

    for (let taskName of tasks[name as keyof typeof tasks]) {
      sql`
        insert into tasks (project_id, name)
        values (${project.id}, ${taskName})
      `.exec();
    }
  }
  yield <div>Database Initialized</div>;
}
