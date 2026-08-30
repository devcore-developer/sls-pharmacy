import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login - let the client-side auth handle the flow
  // This avoids server-side redirect to /dashboard which then redirects to /login
  redirect("/login");
}