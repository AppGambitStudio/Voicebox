(() => {
  const script = document.currentScript;
  const apiUrl = script?.dataset.apiUrl?.replace(/\/+$/, "");
  const widgetId = script?.dataset.widgetId;
  const preview = script?.dataset.preview === "1" || script?.dataset.preview === "true";

  if (!apiUrl || !widgetId) {
    console.error("Voice booking widget requires data-api-url and data-widget-id.");
    return;
  }

  const state = {
    config: null,
    ws: null,
    audioContext: null,
    mediaStream: null,
    processor: null,
    source: null,
    nextPlayTime: 0,
    listening: false,
    callId: "",
    callStartedAt: 0,
    transcript: [],
  };

  const root = document.createElement("div");
  root.innerHTML = `
    <style>
      .xvb-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:64px;height:64px;border:0;border-radius:50%;background:#0d6b57;color:#fff;box-shadow:0 18px 40px rgba(13,52,43,.28);cursor:pointer;display:grid;place-items:center}
      .xvb-panel{position:fixed;right:20px;bottom:96px;z-index:2147483000;width:min(380px,calc(100vw - 32px));border:1px solid #d8e0db;border-radius:8px;background:#fffefa;color:#17201b;box-shadow:0 24px 70px rgba(22,37,31,.22);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
      .xvb-panel[hidden]{display:none}.xvb-head{padding:16px 18px;background:#f2eadf;display:flex;justify-content:space-between;gap:12px;align-items:start}.xvb-title{margin:0;font-size:17px;line-height:1.25;letter-spacing:0}.xvb-sub{margin:5px 0 0;color:#526159;font-size:13px;line-height:1.35}.xvb-close{width:32px;height:32px;border:1px solid #cfd8d2;border-radius:50%;background:#fffefa;cursor:pointer;font-size:20px;line-height:1}.xvb-body{padding:18px}.xvb-status{min-height:46px;margin:0 0 16px;color:#3e4d45;font-size:14px;line-height:1.5}.xvb-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.xvb-btn{min-height:44px;border:1px solid #bdcbc4;border-radius:8px;background:#fffefa;color:#18342b;cursor:pointer;font:inherit;font-weight:700}.xvb-btn.primary{border-color:var(--xvb-brand);background:var(--xvb-brand);color:#fff}.xvb-btn:disabled{cursor:not-allowed;opacity:.55}.xvb-note{margin:14px 0 0;color:#69776f;font-size:12px;line-height:1.45}@media(max-width:520px){.xvb-launcher{right:16px;bottom:16px}.xvb-panel{left:16px;right:16px;bottom:88px;width:auto}}
    </style>
    <section class="xvb-panel" hidden>
      <div class="xvb-head">
        <div><h2 class="xvb-title">Voice booking</h2><p class="xvb-sub">Hindi, English, or Hinglish</p></div>
        <button class="xvb-close" type="button" aria-label="Close voice booking">×</button>
      </div>
      <div class="xvb-body">
        <p class="xvb-status">Loading booking assistant...</p>
        <div class="xvb-actions">
          <button class="xvb-btn primary" type="button" data-start>Start</button>
          <button class="xvb-btn" type="button" data-stop disabled>Stop</button>
        </div>
        <p class="xvb-note">You can say “Kal visit book karni hai”.</p>
      </div>
    </section>
    <button class="xvb-launcher" type="button" aria-label="Open voice booking">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" stroke-width="2"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>`;

  document.body.append(root);

  const panel = root.querySelector(".xvb-panel");
  const launcher = root.querySelector(".xvb-launcher");
  const statusEl = root.querySelector(".xvb-status");
  const startBtn = root.querySelector("[data-start]");
  const stopBtn = root.querySelector("[data-stop]");
  const closeBtn = root.querySelector(".xvb-close");

  launcher.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });
  closeBtn.addEventListener("click", () => {
    panel.hidden = true;
  });
  startBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);

  loadConfig();

  async function loadConfig() {
    const response = await fetch(`${apiUrl}/widgets/${widgetId}`);
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Could not load booking assistant.");
      return;
    }

    state.config = data.widget;
    root.style.setProperty("--xvb-brand", state.config.brandColor || "#0d6b57");
    launcher.style.background = state.config.brandColor || "#0d6b57";
    root.querySelector(".xvb-title").textContent = `${state.config.businessName} voice booking${preview ? " (Test)" : ""}`;
    root.querySelector(".xvb-sub").textContent = preview
      ? `Test mode · ${state.config.languageHint || "Hindi, English, Hinglish"}`
      : state.config.languageHint || "Hindi, English, Hinglish";
    if (preview) panel.hidden = false;
    setStatus(`Tap start and say: “Kal ${state.config.serviceName} book karni hai.”`);
  }

  async function start() {
    try {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      setStatus("Connecting voice agent...");

      const sessionResponse = await fetch(`${apiUrl}/widgets/${widgetId}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview }),
      });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(session.error || "Could not create session.");
      state.callId = session.call?.callId || "";
      state.callStartedAt = Date.now();
      state.transcript = [];

      await connect(extractToken(session));
      await startMic();
      setStatus("Listening. Speak naturally.");
    } catch (error) {
      stop();
      setStatus(error.message || "Could not start.");
    }
  }

  function stop() {
    const shouldComplete = state.callId && state.callStartedAt;
    state.listening = false;
    if (state.processor) state.processor.disconnect();
    if (state.source) state.source.disconnect();
    if (state.mediaStream) state.mediaStream.getTracks().forEach((track) => track.stop());
    if (state.ws && state.ws.readyState <= WebSocket.OPEN) state.ws.close();
    if (shouldComplete) completeCall("client_stopped");
    state.processor = null;
    state.source = null;
    state.mediaStream = null;
    state.ws = null;
    state.callId = "";
    state.callStartedAt = 0;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  function connect(token) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket("wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0", [`xai-client-secret.${token}`]);
      state.ws = ws;
      ws.addEventListener("open", () => {
        send({ type: "session.update", session: sessionConfig() });
        resolve();
      });
      ws.addEventListener("message", (message) => handleEvent(JSON.parse(message.data)));
      ws.addEventListener("error", () => reject(new Error("WebSocket connection failed.")));
    });
  }

  function sessionConfig() {
    const config = state.config;
    return {
      voice: config.voice || "ara",
      instructions: [
        `You are a concise voice booking agent for ${config.businessName} in ${config.location}.`,
        `Help Indian website visitors book a ${config.serviceName} within five minutes.`,
        `Users may speak ${config.languageHint}. Reply in the same language style.`,
        "Use Indian conventions: INR, 10-digit mobile numbers, subah/shaam/kal when appropriate.",
        `Available starter slots are: ${config.slots.join(", ")}. If a requested slot is not listed, offer the closest listed slot.`,
        "Before booking, collect name, 10-digit mobile number, preferred date, and preferred time.",
        "Confirm once, then call book_visit. Keep replies to one or two short sentences.",
      ].join("\n"),
      turn_detection: { type: "server_vad", threshold: 0.85, silence_duration_ms: 900, prefix_padding_ms: 333 },
      audio: {
        input: { format: { type: "audio/pcm", rate: 24000 } },
        output: { format: { type: "audio/pcm", rate: 24000 } },
      },
      tools: [{
        type: "function",
        name: "book_visit",
        description: "Book a confirmed visit for an Indian customer after collecting required details.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            mobile: { type: "string" },
            preferredDate: { type: "string" },
            preferredTime: { type: "string" },
            service: { type: "string" },
          },
          required: ["name", "mobile", "preferredDate", "preferredTime"],
        },
      }],
    };
  }

  async function startMic() {
    state.audioContext = state.audioContext || new AudioContext({ sampleRate: 24000 });
    if (state.audioContext.state === "suspended") await state.audioContext.resume();
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    state.source = state.audioContext.createMediaStreamSource(state.mediaStream);
    state.processor = state.audioContext.createScriptProcessor(4096, 1, 1);
    state.listening = true;
    state.processor.onaudioprocess = (event) => {
      if (!state.listening || state.ws?.readyState !== WebSocket.OPEN) return;
      send({ type: "input_audio_buffer.append", audio: float32ToBase64Pcm16(event.inputBuffer.getChannelData(0)) });
    };
    state.source.connect(state.processor);
    state.processor.connect(state.audioContext.destination);
  }

  function handleEvent(event) {
    if (event.type === "response.output_audio.delta" && event.delta) playPcm16(event.delta);
    if (event.type === "response.text.delta" && event.delta) {
      setStatus(event.delta);
      appendTranscript("assistant", event.delta);
    }
    if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
      appendTranscript("user", event.transcript);
    }
    if (event.type === "response.function_call_arguments.done" && event.name === "book_visit") handleBooking(event);
    if (event.type === "error") setStatus(event.error?.message || "Voice agent error.");
  }

  async function handleBooking(event) {
    const args = JSON.parse(event.arguments || "{}");
    const result = preview
      ? { booking: { ...args, preview: true }, message: `Test booking confirmed for ${args.name || "the visitor"}. No data was saved.` }
      : await fetch(`${apiUrl}/widgets/${widgetId}/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        }).then((response) => response.json());
    send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: event.call_id, output: JSON.stringify(result) } });
    await waitForPlayback();
    send({ type: "response.create" });
  }

  function send(event) {
    if (state.ws?.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(event));
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function appendTranscript(role, text) {
    const last = state.transcript[state.transcript.length - 1];
    if (last && last.role === role) {
      last.text = `${last.text}${text}`.slice(-4000);
      last.at = new Date().toISOString();
      return;
    }
    state.transcript.push({ role, text, at: new Date().toISOString() });
    state.transcript = state.transcript.slice(-50);
  }

  function completeCall(reason) {
    const durationSeconds = Math.max(0, Math.round((Date.now() - state.callStartedAt) / 1000));
    const callId = state.callId;
    fetch(`${apiUrl}/widgets/${widgetId}/calls/${callId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        durationSeconds,
        endedReason: reason,
        transcript: state.transcript,
      }),
    }).catch(() => undefined);
  }

  function extractToken(data) {
    const token = data.value || data.client_secret?.value || data.client_secret || data.secret || data.token;
    if (!token) throw new Error("Session token missing.");
    return token;
  }

  function float32ToBase64Pcm16(float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return bytesToBase64(new Uint8Array(pcm16.buffer));
  }

  function playPcm16(base64Audio) {
    const bytes = base64ToBytes(base64Audio);
    const pcm16 = new Int16Array(bytes.buffer);
    const buffer = state.audioContext.createBuffer(1, pcm16.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i += 1) channel[i] = pcm16[i] / 32768;
    const source = state.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(state.audioContext.destination);
    const now = state.audioContext.currentTime;
    state.nextPlayTime = Math.max(state.nextPlayTime, now);
    source.start(state.nextPlayTime);
    state.nextPlayTime += buffer.duration;
  }

  function waitForPlayback() {
    const remaining = Math.max(0, (state.nextPlayTime - state.audioContext.currentTime) * 1000);
    return new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 5000)));
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
})();
