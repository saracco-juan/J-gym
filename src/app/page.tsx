import { redirect } from "next/navigation";

/** Fallback: the proxy already routes `/`, this covers direct renders. */
export default function Home() {
    redirect("/login");
}
