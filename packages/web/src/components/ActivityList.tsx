import { formatActivityType, formatSeconds } from "../lib/api";

type ActivityListProps = {
  title: string;
  empty: string;
  items: Array<Record<string, string | number>>;
};

export function ActivityList({ title, empty, items }: ActivityListProps) {
  return (
    <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div
            className="rounded-lg border border-[#d8cec0] bg-white p-4"
            key={String(item.bookingId || item.callId || `${item.createdAt}-${index}`)}
          >
            <p className="font-bold">{item.name || item.status || "Activity"}</p>
            <p className="mt-1 text-sm text-[#66746d]">
              {formatActivityType(item.activityType)} · {item.service || item.endedReason || item.widgetId}
              {item.durationSeconds ? ` · ${formatSeconds(Number(item.durationSeconds))}` : ""}
            </p>
          </div>
        ))}
        {!items.length ? <p className="leading-7 text-[#526159]">{empty}</p> : null}
      </div>
    </section>
  );
}
