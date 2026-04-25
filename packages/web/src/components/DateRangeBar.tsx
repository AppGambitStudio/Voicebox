import { useApp } from "../lib/app-context";

export function DateRangeBar() {
  const { range, setRange, triggerRefresh } = useApp();

  return (
    <div className="grid gap-2 rounded-lg border border-[#d8cec0] bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="grid gap-1 text-xs font-bold text-[#66746d]">
        Start
        <input
          className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-2 text-sm text-[#17201b]"
          type="date"
          value={range.start}
          onChange={(event) => setRange({ ...range, start: event.target.value })}
        />
      </label>
      <label className="grid gap-1 text-xs font-bold text-[#66746d]">
        End
        <input
          className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-2 text-sm text-[#17201b]"
          type="date"
          value={range.end}
          onChange={(event) => setRange({ ...range, end: event.target.value })}
        />
      </label>
      <button
        className="min-h-10 rounded-lg border border-[#bdcbc4] bg-[#fffaf1] px-4 text-sm font-extrabold"
        type="button"
        onClick={triggerRefresh}
      >
        Refresh
      </button>
    </div>
  );
}
