import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { DateRangeBar } from "../components/DateRangeBar";
import { DashboardData, fetchJson } from "../lib/api";
import { useApp } from "../lib/app-context";

export function Dashboard() {
  const { idToken, range, refreshNonce, login } = useApp();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!idToken) return;
    setError("");
    const params = `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`;
    fetchJson<DashboardData>(`/dashboard${params}`, idToken)
      .then(setDashboard)
      .catch((err) => {
        setDashboard(null);
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      });
  }, [idToken, range.start, range.end, refreshNonce]);

  if (!idToken) {
    return (
      <section className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-4 py-16 text-center">
        <h1 className="text-3xl font-black">Sign in to see your dashboard</h1>
        <p className="text-[#66746d]">Track new bookings, cancellations, inquiries, and call minutes.</p>
        <div className="flex justify-center gap-3">
          <button className="min-h-11 rounded-lg bg-[#0d6b57] px-5 font-extrabold text-white" type="button" onClick={login}>
            Sign in
          </button>
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-[#bdcbc4] bg-white px-5 font-extrabold" to="/setup">
            View templates
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-5 py-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-normal text-[#0d6b57]">Dashboard</p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">Activity at a glance</h1>
        </div>
      </header>

      <DateRangeBar />

      {error ? (
        <p className="rounded-lg border border-[#f0c6bc] bg-[#fff0ee] p-3 text-sm text-[#8c2a18]">{error}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["New bookings", dashboard?.summary.newBookings ?? 0],
          ["Cancelled", dashboard?.summary.cancelledBookings ?? 0],
          ["Inquiries", dashboard?.summary.generalInquiries ?? 0],
          ["Spam/Fake", dashboard?.summary.spamFakeCalls ?? 0],
          ["Pending calls", dashboard?.summary.pendingCalls ?? 0],
          ["Call minutes", Math.round((dashboard?.summary.totalCallSeconds ?? 0) / 60)],
        ].map(([label, value]) => (
          <div className="rounded-lg border border-[#d8cec0] bg-white p-4" key={String(label)}>
            <p className="text-xs font-extrabold uppercase tracking-normal text-[#66746d]">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityList title="New bookings" empty="No new bookings in this range." items={dashboard?.categories.newBookings || []} />
        <ActivityList title="Cancelled bookings" empty="No cancelled bookings in this range." items={dashboard?.categories.cancelledBookings || []} />
        <ActivityList title="General inquiries" empty="No general inquiries in this range." items={dashboard?.categories.generalInquiries || []} />
        <ActivityList title="Spam/Fake calls" empty="No spam or fake calls in this range." items={dashboard?.categories.spamFakeCalls || []} />
      </div>
    </section>
  );
}
