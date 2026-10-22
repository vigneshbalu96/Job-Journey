import { redirect } from "next/navigation";

// middleware sends signed-in users to /today; everyone else lands on /login.
export default function Home() {
  redirect("/login");
}
