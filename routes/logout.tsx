import { endSession } from "~/session";
import type { DataFunctionArgs } from "~/util";

export default async function* ({ request }: DataFunctionArgs) {
  endSession(request);

  yield (
    <div>
      <h1>Logged out</h1>
      <p>You have been logged out</p>
      <a href="/login">Login</a>
    </div>
  );
}
