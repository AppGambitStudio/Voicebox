import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiUrl, deleteJson, fetchJson, postJson, Schedule, Widget } from "../lib/api";
import { AgentGender, applyPlaceholders, buildGreeting, GREETING_PLACEHOLDERS, templates, Template } from "../lib/templates";
import { useApp } from "../lib/app-context";
import { AvailabilityEditor } from "../components/AvailabilityEditor";

const defaultTemplate = templates[2];

const VOICE_PRESETS: Array<{
  value: string;
  label: string;
  sub: string;
  gender: "female" | "male";
  agentName?: string;
}> = [
  { value: "female", label: "Female", sub: "Default", gender: "female" },
  { value: "male", label: "Male", sub: "Default", gender: "male" },
  { value: "a00ce99a", label: "Priya", sub: "IN female", gender: "female", agentName: "Priya" },
  { value: "bcf738e4", label: "Vihaan", sub: "IN male", gender: "male", agentName: "Vihaan" },
];

export function Setup() {
  const { idToken, account, login } = useApp();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [form, setForm] = useState(() => formFromTemplate(defaultTemplate));
  const [customVoiceId, setCustomVoiceId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [greetingDirty, setGreetingDirty] = useState(false);

  function applyPersona(updates: {
    agentName?: string;
    agentGender?: AgentGender;
    voice?: string;
    businessName?: string;
    serviceName?: string;
  }) {
    setForm((current) => {
      const next = { ...current, ...updates };
      if (!greetingDirty && updates.agentGender !== undefined) {
        next.greeting = buildGreeting({ agentGender: next.agentGender });
      }
      return next;
    });
  }

  function resetGreeting() {
    setGreetingDirty(false);
    setForm((current) => ({
      ...current,
      greeting: buildGreeting({ agentGender: current.agentGender }),
    }));
  }

  const greetingPreview = applyPlaceholders(form.greeting, {
    agentName: form.agentName,
    businessName: form.businessName,
    serviceName: form.serviceName,
    location: form.location,
    languageHint: form.languageHint,
  });

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
        voice: customVoiceId.trim() || form.voice,
        agentName: form.agentName,
        agentGender: form.agentGender,
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
    setCustomVoiceId("");
    setWidget(null);
    setGreetingDirty(false);
  }

  async function handleDelete(item: Widget) {
    if (!idToken) {
      login();
      return;
    }
    if (!window.confirm(`Delete "${item.businessName}"? This removes its config, calls, and bookings. This cannot be undone.`)) {
      return;
    }
    setDeletingId(item.widgetId);
    setError("");
    try {
      await deleteJson(`/widgets/${item.widgetId}`, idToken);
      setWidgets((current) => current.filter((w) => w.widgetId !== item.widgetId));
      if (widget?.widgetId === item.widgetId) setWidget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete widget");
    } finally {
      setDeletingId(null);
    }
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

      <form className="grid gap-4" onSubmit={saveWidget}>
        {/* Row 1: Templates + Business detail */}
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Choose Template</h2>
              <span className="text-sm font-extrabold text-[#66746d]">Step 1</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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

          <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Adjust Details</h2>
              <span className="text-sm font-extrabold text-[#66746d]">Step 2</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-[#38473f]">
                Business name
                <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#38473f]">
                Booking type
                <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })} />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#38473f]">
                City or location
                <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#38473f]">
                Languages
                <input className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]" value={form.languageHint} onChange={(event) => setForm({ ...form, languageHint: event.target.value })} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-[#38473f]">
                Agent name
                <input
                  className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 text-[#17201b]"
                  value={form.agentName}
                  onChange={(event) => applyPersona({ agentName: event.target.value })}
                  placeholder="e.g. Aanya, Arjun"
                />
              </label>
              <div className="grid gap-2 text-sm font-bold text-[#38473f]">
                Agent gender
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Agent gender">
                  {(["female", "male"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={form.agentGender === g}
                      onClick={() => applyPersona({ agentGender: g })}
                      className={`min-h-[48px] rounded-lg border px-3 py-2 text-sm font-extrabold capitalize ${
                        form.agentGender === g
                          ? "border-[#0d6b57] bg-[#e8f3ef] text-[#0d6b57]"
                          : "border-[#c9d2cc] bg-white text-[#38473f]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-1 text-xs font-normal text-[#66746d]">
              Used in the system prompt so the agent introduces itself by name and uses gender-correct Hindi grammar (e.g. "main karungi" vs "main karunga").
            </p>

            <div className="mt-4 grid gap-2 text-sm font-bold text-[#38473f]">
              Voice
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Agent voice">
                {VOICE_PRESETS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={form.voice === option.value}
                    onClick={() =>
                      applyPersona({
                        voice: option.value,
                        agentGender: option.gender,
                        agentName: option.agentName ?? form.agentName,
                      })
                    }
                    disabled={customVoiceId.trim().length > 0}
                    className={`grid min-h-[56px] gap-0.5 rounded-lg border px-3 py-2 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${
                      form.voice === option.value
                        ? "border-[#0d6b57] bg-[#e8f3ef] text-[#0d6b57]"
                        : "border-[#c9d2cc] bg-white text-[#38473f]"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-[11px] font-normal text-[#66746d]">{option.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="grid gap-2 text-sm font-bold text-[#38473f]">
                Custom voice ID <span className="font-normal text-[#66746d]">(optional)</span>
                <input
                  className="rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 font-mono text-sm text-[#17201b] lowercase tracking-wider"
                  value={customVoiceId}
                  onChange={(event) => setCustomVoiceId(event.target.value.trim().toLowerCase())}
                  placeholder="e.g. nlbqfwie"
                  maxLength={8}
                  pattern="[a-z0-9]{8}"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#38473f]">
                Brand color
                <input className="h-[48px] w-full rounded-lg border border-[#c9d2cc] bg-white px-3 py-2 sm:w-[88px]" type="color" value={form.brandColor} onChange={(event) => setForm({ ...form, brandColor: event.target.value })} />
              </label>
            </div>
            <p className="mt-1 text-xs font-normal text-[#66746d]">
              Paste an 8-character xAI Custom Voice ID to use a cloned voice. Create one in the{" "}
              <a className="font-extrabold text-[#0d6b57] underline" href="https://docs.x.ai/developers/model-capabilities/audio/custom-voices" target="_blank" rel="noreferrer">
                xAI Console
              </a>
              . Overrides the preset above when filled.
            </p>

            <div className="mt-4 grid gap-2 text-sm font-bold text-[#38473f]">
              <div className="flex items-center justify-between gap-2">
                <span>Welcome greeting</span>
                {greetingDirty ? (
                  <button
                    type="button"
                    onClick={resetGreeting}
                    className="rounded-md border border-[#c9d2cc] bg-white px-2 py-1 text-xs font-extrabold text-[#0d6b57]"
                    title="Regenerate greeting from agent gender"
                  >
                    Reset to auto
                  </button>
                ) : (
                  <span className="text-[11px] font-normal text-[#66746d]">Auto-generated</span>
                )}
              </div>
              <textarea
                className="resize-y rounded-lg border border-[#c9d2cc] bg-white px-3 py-3 font-mono text-sm text-[#17201b]"
                value={form.greeting}
                onChange={(event) => {
                  setGreetingDirty(true);
                  setForm({ ...form, greeting: event.target.value });
                }}
                rows={2}
                placeholder="Namaste! Main {agent-name} bol rahi hoon, {business-name} se."
              />
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-normal text-[#66746d]">
                <span className="font-bold">Placeholders:</span>
                {GREETING_PLACEHOLDERS.map((p) => (
                  <code key={p} className="rounded bg-[#eef3f0] px-1.5 py-0.5 font-mono text-[#0d6b57]">{p}</code>
                ))}
              </div>
              <div className="rounded-lg border border-dashed border-[#c9d2cc] bg-white p-3">
                <span className="block text-[11px] font-extrabold uppercase tracking-wide text-[#66746d]">Preview</span>
                <span className="mt-1 block text-sm font-normal italic text-[#17201b]">"{greetingPreview}"</span>
              </div>
            </div>
          </section>
        </div>

        {/* Row 2: Calendar / Availability + save button (full width) */}
        <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Calendar Setup</h2>
            <span className="text-sm font-extrabold text-[#66746d]">Step 3</span>
          </div>
          <AvailabilityEditor
            value={form.schedule}
            onChange={(schedule: Schedule) => setForm({ ...form, schedule })}
          />
          {error ? <p className="mt-4 text-sm text-[#9e2929]">{error}</p> : null}
          <button
            className="mt-4 min-h-12 w-full rounded-lg bg-[#0d6b57] font-extrabold text-white disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:px-8"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Creating..." : idToken ? "Create Widget" : "Sign up to create widget"}
          </button>
        </section>
      </form>

      {/* Row 3: Embed + Test + Your widgets */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.1fr_0.8fr]">
        <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Embed</h2>
            <span className="text-sm font-extrabold text-[#66746d]">Step 4</span>
          </div>

          {widget ? (
            <>
              <p className="leading-7 text-[#526159]">
                Widget created for <strong>{widget.businessName}</strong>. Add this script to any page.
              </p>
              <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-lg border border-[#d8cec0] bg-[#17201b] p-4 text-xs leading-6 text-[#f7efe4]">{embedCode}</pre>
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#d8cec0] bg-white p-4">
                <span className="h-11 w-11 shrink-0 rounded-full" style={{ background: widget.brandColor }} />
                <div className="min-w-0">
                  <strong className="block truncate">{widget.businessName}</strong>
                  <p className="mt-1 text-sm text-[#66746d]">{widget.category} · {widget.languageHint} · {scheduleSummary(widget.schedule)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="leading-7 text-[#526159]">Create a widget to generate a copy-paste embed snippet.</p>
          )}
        </section>

        <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
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
              Save the widget to test it here.
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[#d8cec0] bg-[#fffaf1] p-5">
          <h2 className="text-xl font-black">Your widgets</h2>
          <p className="mt-1 text-xs text-[#66746d]">Load any saved widget into the embed and test panels.</p>
          {widgets.length ? (
            <div className="mt-3 grid gap-2">
              {widgets.map((item) => (
                <div
                  key={item.widgetId}
                  className={`flex items-center gap-2 rounded-lg border bg-white p-2 ${
                    widget?.widgetId === item.widgetId ? "border-[#0d6b57] shadow-[inset_0_0_0_1px_#0d6b57]" : "border-[#e0d8cc]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setWidget(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left"
                  >
                    <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: item.brandColor }} />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{item.businessName}</strong>
                      <span className="text-xs text-[#66746d]">{item.category} · {item.location}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.widgetId}
                    aria-label={`Delete ${item.businessName}`}
                    title="Delete widget"
                    className="shrink-0 rounded-md border border-[#e0d8cc] px-2 py-1 text-xs font-extrabold text-[#9e2929] hover:bg-[#fbeaea] disabled:cursor-wait disabled:opacity-60"
                  >
                    {deletingId === item.widgetId ? "..." : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-[#d8cec0] bg-white p-4 text-sm text-[#66746d]">
              No widgets yet. Create one above to see it here.
            </p>
          )}
        </section>
      </div>
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
    agentName: template.agentName,
    agentGender: template.agentGender,
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
