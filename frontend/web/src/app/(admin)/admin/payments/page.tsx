import { redirect } from "next/navigation";
export default function LegacyPayments({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (typeof v === "string") q.set(k === "search" ? "q" : k, v);
  });
  redirect("/admin/finance" + (q.size ? "?" + q : ""));
}
