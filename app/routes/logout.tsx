import { endSession } from "~/app/session";
import { redirect } from "~/util";

export default async function* () {
  endSession();

  throw redirect("/login?notice=Logged out successfully");
}
