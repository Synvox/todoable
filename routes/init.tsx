// putting this in a route for a quick and dirty way to initialize the database

import { password as Password } from "bun";
import { sql } from "../sql";

export default async function* () {
  yield <div>Initializing database</div>;

  sql`drop table if exists users`.exec();
  sql`drop table if exists sessions`.exec();

  sql`
    create table if not exists users (
      id integer primary key,
      username text not null,
      password text not null
    )
  `.exec();

  sql`
    create table if not exists sessions (
      id text primary key,
      data text not null
    )
  `.exec();

  sql`
    insert into users (username, password)
    values ('admin', ${await Password.hash("password")})
  `.exec();

  yield <div>Database Initialized</div>;
}
