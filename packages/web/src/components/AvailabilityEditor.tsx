import { Schedule, TimeRange, WEEKDAY_LABELS, WeekdaySchedule } from "../lib/api";

type AvailabilityEditorProps = {
  value: Schedule;
  onChange: (schedule: Schedule) => void;
};

const slotMinuteOptions = [10, 15, 20, 30, 45, 60, 75, 90, 120];
const leadTimeOptions = [
  { label: "Now", value: 0 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
  { label: "1 day", value: 1440 },
];
const horizonOptions = [3, 7, 14, 21, 30, 45, 60];

const presets: Array<{ id: string; label: string; build: () => WeekdaySchedule[] }> = [
  {
    id: "weekdays-9-6",
    label: "Mon–Fri 9–18",
    build: () =>
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        ranges: weekday >= 1 && weekday <= 5 ? [{ open: "09:00", close: "18:00" }] : [],
      })),
  },
  {
    id: "all-week-10-8",
    label: "All week 10–20",
    build: () => [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, ranges: [{ open: "10:00", close: "20:00" }] })),
  },
  {
    id: "weekends-only",
    label: "Sat & Sun 11–19",
    build: () =>
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        ranges: weekday === 0 || weekday === 6 ? [{ open: "11:00", close: "19:00" }] : [],
      })),
  },
  {
    id: "two-shifts",
    label: "Mon–Sat morning + evening",
    build: () =>
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        ranges: weekday === 0 ? [] : [{ open: "10:00", close: "13:00" }, { open: "17:00", close: "20:00" }],
      })),
  },
];

export function AvailabilityEditor({ value, onChange }: AvailabilityEditorProps) {
  function patchDay(weekday: number, ranges: TimeRange[]) {
    const next = value.weeklyHours.map((entry) => (entry.weekday === weekday ? { weekday, ranges } : entry));
    onChange({ ...value, weeklyHours: next });
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    onChange({ ...value, weeklyHours: preset.build() });
  }

  const totalSlotsHint = countSlotsHint(value);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-lg border border-[#d8cec0] bg-white p-3 sm:flex sm:flex-wrap sm:items-center">
        <span className="text-xs font-extrabold uppercase tracking-normal text-[#66746d]">Quick presets</span>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="rounded-full border border-[#bdcbc4] bg-[#fffaf1] px-3 py-1 text-xs font-extrabold text-[#18342b]"
              onClick={() => applyPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {WEEKDAY_LABELS.map((label, weekday) => {
          const day = value.weeklyHours.find((entry) => entry.weekday === weekday) || { weekday, ranges: [] };
          const enabled = day.ranges.length > 0;
          return (
            <div key={weekday} className="grid items-start gap-3 rounded-lg border border-[#d8cec0] bg-white p-3 sm:grid-cols-[100px_1fr]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => patchDay(weekday, event.target.checked ? [{ open: "10:00", close: "18:00" }] : [])}
                />
                <span className="text-sm font-extrabold">{label}</span>
              </label>
              {enabled ? (
                <div className="grid gap-2">
                  {day.ranges.map((range, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <input
                        className="w-[110px] rounded-lg border border-[#c9d2cc] bg-white px-2 py-2 text-sm"
                        type="time"
                        value={range.open}
                        onChange={(event) =>
                          patchDay(
                            weekday,
                            day.ranges.map((r, i) => (i === index ? { ...r, open: event.target.value } : r)),
                          )
                        }
                      />
                      <span className="text-sm text-[#66746d]">–</span>
                      <input
                        className="w-[110px] rounded-lg border border-[#c9d2cc] bg-white px-2 py-2 text-sm"
                        type="time"
                        value={range.close}
                        onChange={(event) =>
                          patchDay(
                            weekday,
                            day.ranges.map((r, i) => (i === index ? { ...r, close: event.target.value } : r)),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="text-sm font-bold text-[#9e2929]"
                        onClick={() => patchDay(weekday, day.ranges.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="justify-self-start text-xs font-extrabold text-[#0d6b57]"
                    onClick={() => patchDay(weekday, [...day.ranges, { open: "14:00", close: "18:00" }])}
                  >
                    + Add another range
                  </button>
                </div>
              ) : (
                <span className="text-sm text-[#66746d]">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-lg border border-[#d8cec0] bg-white p-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-extrabold text-[#66746d]">
          Slot duration
          <select
            className="rounded-lg border border-[#c9d2cc] bg-white px-2 py-2 text-sm text-[#17201b]"
            value={value.slotMinutes}
            onChange={(event) => onChange({ ...value, slotMinutes: Number(event.target.value) })}
          >
            {slotMinuteOptions.map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} min</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-extrabold text-[#66746d]">
          Earliest bookable
          <select
            className="rounded-lg border border-[#c9d2cc] bg-white px-2 py-2 text-sm text-[#17201b]"
            value={value.leadTimeMinutes}
            onChange={(event) => onChange({ ...value, leadTimeMinutes: Number(event.target.value) })}
          >
            {leadTimeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label} from now</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-extrabold text-[#66746d]">
          Booking horizon
          <select
            className="rounded-lg border border-[#c9d2cc] bg-white px-2 py-2 text-sm text-[#17201b]"
            value={value.horizonDays}
            onChange={(event) => onChange({ ...value, horizonDays: Number(event.target.value) })}
          >
            {horizonOptions.map((days) => (
              <option key={days} value={days}>Next {days} days</option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-[#66746d]">
        Timezone: <strong className="font-extrabold">Asia/Kolkata (IST)</strong> · Approx {totalSlotsHint} slots per week.
      </p>
    </div>
  );
}

function countSlotsHint(schedule: Schedule) {
  let total = 0;
  for (const day of schedule.weeklyHours) {
    for (const range of day.ranges) {
      const minutes = timeMinutes(range.close) - timeMinutes(range.open);
      if (minutes > 0) total += Math.floor(minutes / schedule.slotMinutes);
    }
  }
  return total;
}

function timeMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}
