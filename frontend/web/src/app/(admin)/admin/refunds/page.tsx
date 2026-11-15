import { redirect } from "next/navigation";
export default function LegacyRefunds({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = new URLSearchParams({ tab: "refunds" });
  Object.entries(searchParams).forEach(([k, v]) => {
    if (typeof v === "string")
      q.set(
        k === "search" ? "q" : k === "cancellationId" ? "cancellation" : k,
        v,
      );
  });
  redirect("/admin/finance?" + q);
}
