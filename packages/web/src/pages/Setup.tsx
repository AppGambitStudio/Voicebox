import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiUrl, fetchJson, postJson, Schedule, Widget } from "../lib/api";
import { templates, Template } from "../lib/templates";
import { useApp } from "../lib/app-context";
import { AvailabilityEditor } from "../components/AvailabilityEditor";

const defaultTemplate = templates[2];

export function Setup() {
  const { idToken, account, login } = useApp();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [form, setForm] = useState(() => formFromTemplate(defaultTemplate));

  const embedCode = useMemo(() => {
    if (!widget) return "";
    return `<script src="${window.location.origin}/embed/voice-booking-widget.js" data-api-url="${apiUrl}" data-widget-id="${widget.widgetId}" defer></script>`;
  }, [widget]);

  const previewUrl = useMemo(() => {
    if (!widget) return "";
    const params = new URLSearchParams({ widgetId: widget.widgetId, apiUrl });
    return `/preview.html?${params.toString()}`;
  }, [widget]);

  useEffect(() => {
    if (!idToken) {
      setWidgets([]);
      return;
    }
    fetchJson<{ widgets: Widget[] }>("/widgets", idToken)
      .then((data) => setWidgets(data.widgets || []))
      .catch(() => setWidgets([]));
  }, [idToken]);

  async function saveWidget(event: FormEvent) {
    event.preventDefault();
    if (!idToken) {
      login();
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const data = await postJson<{ widget: Widget }>("/widgets", idToken, {
        businessName: form.businessName,
        serviceName: form.serviceName,
        location: form.location,
        languageHint: form.languageHint,
        voice: form.voice,
        brandColor: form.brandColor,
        greeting: form.greeting,
        templateId: selectedTemplateId,
        category: templates.find((template) => template.id === selectedTemplateId)?.category || "custom",
        schedule: form.schedule,
      });
      setWidget(data.widget);
      setWidgets((current) => [data.widget, ...current.filter((item) => item.widgetId !== data.widget.widgetId)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  function applyTemplate(template: Template) {
    setSelectedTemplateId(template.id);
    setForm(formFromTemplate(template));
    setWidget(null);
  }

  return (
    <section className="mx-auto w-[min(1180px,calc(100vw-32px))] py-10">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-normal text-[#0d6b57]">Setup</p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">Configure your Voicebox widget</h1>
          <p className="mt-2 text-sm text-[#66746d]">
            Pick a template, adjust the details, then test it live before pasting the embed snippet on your site.
          </p>
        </div>
        {account ? (
          <span className="rounded-full bg-[#fffaf1] px-3 py-1 text-xs font-extrabold text-[#0d6b57]">
            {account.plan} plan · {account.monthlyCallLimit} calls/month
          </span>
        ) : null}
      </header>

      {!idToken ? (
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5 sm:flex-row sm:items-center">
          <div>
            <strong className="block">Sign in to create your widget</strong>
            <span className="text-sm text-[#66746d]">Free plan: 20 calls per month, no card required.</span>
          </div>
          <button className="min-h-11 rounded-lg bg-[#0d6b57] px-5 font-extrabold text-white" type="button" onClick={login}>
            Sign up / Log in
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1fr_0.85fr]">
        <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Choose Template</h2>
            <span className="text-sm font-extrabold text-[#66746d]">Step 1</span>
          </div>
          <div className="grid gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className={`grid w-full gap-2 rounded-lg border bg-white p-4 text-left ${
                  selectedTemplateId === template.id ? "border-[#0d6b57] shadow-[inset_0_0_0_1px_#0d6b57]" : "border-[#d1d9d4]"
                }`}
              >
                <span className="text-xs font-extrabold uppercase tracking-normal text-[#0d6b57]">{template.category}</span>
                <strong className="text-base">{template.title}</strong>
                <p className="text-sm leading-6 text-[#66746d]">{template.description}</p>
              </button>
            ))}
          </div>
        </section>

        <form className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5" onSubmit={saveWidget}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Adjust Details</h2>
            <span className="text-sm font-extrabold text-[#66746d]">Step 2</span>
          </div>

          <label className="mb-4 grid gap-2 text-sm font-bold text-[#38473f]">
            Business name
            <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} />
          </label>

          <label className="mb-4 grid gap-2 text-sm font-bold text-[#38473f]">
            Booking type
            <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })} />
          </label>

          <label className="mb-4 grid gap-2 text-sm font-bold text-[#38473f]">
            City or location
            <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </label>

          <label className="mb-4 grid gap-2 text-sm font-bold text-[#38473f]">
            Languages
            <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.languageHint} onChange={(event) => setForm({ ...form, languageHint: event.target.value })} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="mb-4 grid gap-2 text-sm font-bold text-[#38473f]">
              Voice
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Agent voice">
                {(["female", "male"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={form.voice === option}
                    onClick={() => setForm({ ...form, voice: option })}
                    className={`min-h-[48px] rounded-lg border px-3 py-2 text-sm font-extrabold capitalize ${
                      form.voice === option
                        ? "border-[#0d6b57] bg-[#e8f3ef] text-[#0d6b57]"
                        : "border-[#c9d2cc] bg-white text-[#38473f]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <label className="mb-4 grid gap-2 text-sm font-bold text-[#38473f]">
              Brand color
              <input className="h-[48px] rounded-lg border border-[#c9d2cc] bg-white px-3 py-2" type="color" value={form.brandColor} onChange={(event) => setForm({ ...form, brandColor: event.target.value })} />
            </label>
          </div>

          <label className="mb-4 grid gap-2 text-sm font-bold text-[#38473f]">
            Welcome greeting
            <textarea
              className="resize-y rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]"
              value={form.greeting}
              onChange={(event) => setForm({ ...form, greeting: event.target.value })}
              rows={2}
              placeholder="Namaste! ... mein aapka swagat hai. ..."
            />
            <span className="text-xs font-normal text-[#66746d]">Spoken by the agent as soon as the call connects.</span>
          </label>

          <div className="mb-4 grid gap-2">
            <span className="text-sm font-bold text-[#38473f]">Availability</span>
            <AvailabilityEditor
              value={form.schedule}
              onChange={(schedule: Schedule) => setForm({ ...form, schedule })}
            />
          </div>

          {error ? <p className="mb-3 text-sm text-[#9e2929]">{error}</p> : null}
          <button
            className="min-h-12 w-full rounded-lg bg-[#0d6b57] font-extrabold text-white disabled:cursor-wait disabled:opacity-70"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Creating..." : idToken ? "Create Widget" : "Sign up to create widget"}
          </button>
        </form>

        <section className="grid gap-4">
          <div className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Embed</h2>
              <span className="text-sm font-extrabold text-[#66746d]">Step 3</span>
            </div>

            {widget ? (
              <>
                <p className="leading-7 text-[#526159]">
                  Widget created for <strong>{widget.businessName}</strong>. Add this script to any page.
                </p>
                <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-lg border border-[#d8cec0] bg-[#17201b] p-4 text-xs leading-6 text-[#f7efe4]">{embedCode}</pre>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#d8cec0] bg-white p-4">
                  <span className="h-11 w-11 shrink-0 rounded-full" style={{ background: widget.brandColor }} />
                  <div>
                    <strong>{widget.businessName}</strong>
                    <p className="mt-1 text-sm text-[#66746d]">{widget.category} · {widget.languageHint} · {scheduleSummary(widget.schedule)}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="leading-7 text-[#526159]">Create a widget to generate a copy-paste embed snippet.</p>
            )}
          </div>

          <div className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-black">Test it live</h2>
                <p className="mt-1 text-xs text-[#66746d]">Calls in the preview don't count toward your monthly limit and bookings aren't saved.</p>
              </div>
              {previewUrl ? (
                <a
                  className="text-sm font-extrabold text-[#0d6b57] underline"
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in new tab
                </a>
              ) : null}
            </div>
            {widget ? (
              <iframe
                key={previewUrl}
                title="Voice widget preview"
                src={previewUrl}
                className="h-[420px] w-full rounded-lg border border-[#d8cec0] bg-white"
                allow="microphone; autoplay"
              />
            ) : (
              <div className="grid h-[200px] place-items-center rounded-lg border border-dashed border-[#d8cec0] bg-white text-sm text-[#66746d]">
                Save the widget on the left to test it here.
              </div>
            )}
          </div>
        </section>
      </div>

      {widgets.length ? (
        <section className="mt-8 rounded-lg border border-[#d8cec0] bg-white p-5">
          <h2 className="text-lg font-black">Your widgets</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((item) => (
              <div className="rounded-lg border border-[#e0d8cc] bg-[#fffaf1] p-3" key={item.widgetId}>
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: item.brandColor }} />
                  <div className="min-w-0">
                    <strong className="block truncate">{item.businessName}</strong>
                    <span className="text-xs text-[#66746d]">{item.category} · {item.location}</span>
                  </div>
                </div>
                <button
                  className="mt-3 w-full rounded-lg border border-[#bdcbc4] bg-white px-3 py-2 text-xs font-extrabold"
                  type="button"
                  onClick={() => setWidget(item)}
                >
                  Load preview
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function formFromTemplate(template: Template) {
  return {
    businessName: template.businessName,
    serviceName: template.serviceName,
    location: template.location,
    languageHint: template.languageHint,
    voice: template.voice,
    brandColor: template.brandColor,
    greeting: template.greeting,
    schedule: cloneSchedule(template.schedule),
  };
}

function scheduleSummary(schedule: Schedule | undefined) {
  if (!schedule) return "no schedule";
  const openDays = schedule.weeklyHours.filter((day) => day.ranges.length > 0).length;
  return `${openDays} open days · ${schedule.slotMinutes} min slots`;
}

function cloneSchedule(schedule: Schedule): Schedule {
  return {
    timezone: schedule.timezone,
    slotMinutes: schedule.slotMinutes,
    leadTimeMinutes: schedule.leadTimeMinutes,
    horizonDays: schedule.horizonDays,
    weeklyHours: schedule.weeklyHours.map((day) => ({
      weekday: day.weekday,
      ranges: day.ranges.map((range) => ({ ...range })),
    })),
  };
}
