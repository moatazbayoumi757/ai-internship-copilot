import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";

type ProgressDatum = {
  status: ApplicationStatus;
  count: number;
};

type WeeklyDatum = {
  week: string;
  applications: number;
  responses: number;
};

function toPolyline(values: number[]) {
  const maxValue = Math.max(...values, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function AnalyticsPanels({
  applications = [],
  progressData = [],
  weeklyResponseData = [],
}: {
  applications?: ApplicationRecord[];
  progressData?: ProgressDatum[];
  weeklyResponseData?: WeeklyDatum[];
}) {
  const maxProgress = Math.max(...progressData.map((item) => item.count), 1);
  const applicationSeries = weeklyResponseData.map((item) => item.applications);
  const responseSeries = weeklyResponseData.map((item) => item.responses);
  const maxWeeklyValue = Math.max(...applicationSeries, ...responseSeries, 1);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h3 className="mb-5 text-lg font-semibold">Application Progress</h3>
        {applications.length === 0 ? (
          <p className="text-sm text-slate-500">No applications yet. Add one to see progress analytics.</p>
        ) : (
          <div className="grid h-72 grid-cols-5 items-end gap-3">
            {progressData.map((item) => (
              <div className="grid h-full content-end gap-2" key={item.status}>
                <div
                  className="min-h-2 rounded-t-md bg-ocean"
                  style={{ height: `${(item.count / maxProgress) * 100}%` }}
                />
                <span className="text-xs text-slate-500">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h3 className="mb-5 text-lg font-semibold">Response Rate Trend</h3>
        {weeklyResponseData.length === 0 ? (
          <p className="text-sm text-slate-500">No trend data yet. Activity will appear once applications are tracked.</p>
        ) : (
          <>
            <svg className="h-72 w-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
              <polyline
                fill="none"
                points={toPolyline(applicationSeries)}
                stroke="#17202A"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                fill="none"
                points={toPolyline(responseSeries)}
                stroke="#0F766E"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span className="before:mr-1 before:inline-block before:h-3 before:w-3 before:rounded-full before:bg-ink before:content-['']">
                Applications
              </span>
              <span className="before:mr-1 before:inline-block before:h-3 before:w-3 before:rounded-full before:bg-teal before:content-['']">
                Responses
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
