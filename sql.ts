import { Database, type SQLQueryBindings } from "bun:sqlite";

const db = new Database("data/data.db");

export function sql<T>(
  strings: TemplateStringsArray,
  ...values: SQLQueryBindings[]
) {
  const statement = db.prepare<T, any>(strings.join("?"));
  return {
    exec() {
      statement.run(values);
    },
    all() {
      return statement.all(values);
    },
    first() {
      return statement.get(values);
    },
  };
}
