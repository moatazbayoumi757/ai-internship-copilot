import { StatusBadge } from "@/components/ui/status-badge";
import type { Application } from "@/lib/types";

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold">Recent Applications</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Applied</th>
              <th className="px-5 py-3 font-medium">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {applications.map((application) => (
              <tr key={application.id}>
                <td className="px-5 py-4 font-medium">{application.companyName}</td>
                <td className="px-5 py-4 text-slate-600">{application.roleTitle}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={application.status} />
                </td>
                <td className="px-5 py-4 text-slate-600">{application.appliedOn}</td>
                <td className="px-5 py-4 text-slate-600">{application.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
