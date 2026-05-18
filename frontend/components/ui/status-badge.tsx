import type { ApplicationStatus } from "@/lib/types";

const statusStyles: Record<ApplicationStatus, string> = {
  Applied: "bg-blue-50 text-blue-700",
  OA: "bg-amber-50 text-amber-700",
  Interview: "bg-teal-50 text-teal-700",
  Rejected: "bg-red-50 text-red-700",
  Offer: "bg-emerald-50 text-emerald-700",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
