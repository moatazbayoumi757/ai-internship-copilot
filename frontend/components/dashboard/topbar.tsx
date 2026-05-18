export function Topbar() {
  return (
    <header className="flex flex-col gap-3 border-b border-line bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div>
        <p className="text-sm text-slate-500">Welcome back</p>
        <h2 className="text-2xl font-semibold">Application Dashboard</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-700">
          Upload Resume
        </button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
          New Application
        </button>
      </div>
    </header>
  );
}
