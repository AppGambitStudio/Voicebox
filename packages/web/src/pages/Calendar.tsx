import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DateRangeBar } from "../components/DateRangeBar";
import { CalendarData, fetchJson, formatDate } from "../lib/api";
import { useApp } from "../lib/app-context";

export function Calendar() {
  const { idToken, range, refreshNonce, login } = useApp();
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!idToken) return;
    setError("");
    const params = `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`;
    fetchJson<CalendarData>(`/calendar${params}`, idToken)
      .then(setCalendar)
      .catch((err) => {
        setCalendar(null);
        setError(err instanceof Error ? err.message : "Could not load calendar");
      });
  }, [idToken, range.start, range.end, refreshNonce]);

  if (!idToken) {
    return (
      <section className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-4 py-16 text-center">
        <h1 className="text-3xl font-black">Sign in to view your calendar</h1>
        <p className="text-[#66746d]">See confirmed bookings grouped by day.</p>
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
          <p className="text-sm font-extrabold uppercase tracking-normal text-[#0d6b57]">Calendar</p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">Booked visits</h1>
        </div>
        <span className="rounded-full bg-[#fffaf1] px-3 py-1 text-sm font-extrabold text-[#0d6b57]">
          {calendar?.days.length || 0} active days
        </span>
      </header>

      <DateRangeBar />

      {error ? (
        <p className="rounded-lg border border-[#f0c6bc] bg-[#fff0ee] p-3 text-sm text-[#8c2a18]">{error}</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(calendar?.days || []).map((day) => (
          <div className="rounded-lg border border-[#d8cec0] bg-white p-4" key={day.date}>
            <h3 className="font-black">{formatDate(day.date)}</h3>
            <div className="mt-3 grid gap-2">
              {day.bookings.map((booking, index) => (
                <div className="rounded-lg bg-[#f7f4ee] p-3" key={String(booking.bookingId || `${booking.createdAt}-${index}`)}>
                  <p className="font-bold">{booking.name || "Customer"}</p>
                  <p className="mt-1 text-sm text-[#66746d]">{booking.service || "Visit"} · {booking.preferredTime || "Time pending"}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!calendar?.days.length ? (
          <p className="leading-7 text-[#526159]">No bookings found for this date range.</p>
        ) : null}
      </div>
    </section>
  );
}
