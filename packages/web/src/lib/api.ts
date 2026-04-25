export const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const authDomain = import.meta.env.VITE_AUTH_DOMAIN || "";
export const userPoolClientId = import.meta.env.VITE_USER_POOL_CLIENT_ID || "";
export const tokenKey = "voice-booking-id-token";

export type Widget = {
  widgetId: string;
  businessName: string;
  serviceName: string;
  location: string;
  languageHint: string;
  voice: string;
  brandColor: string;
  templateId: string;
  category: string;
  slots: string[];
};

export type Account = {
  tenantId: string;
  email: string;
  plan: string;
  monthlyCallLimit: number;
};

export type DashboardData = {
  summary: {
    bookings: number;
    newBookings: number;
    cancelledBookings: number;
    generalInquiries: number;
    spamFakeCalls: number;
    pendingCalls: number;
    consumedCalls: number;
    totalCallSeconds: number;
    transcripts: number;
    monthlyCallLimit: number;
  };
  recentBookings: Array<Record<string, string | number>>;
  recentCalls: Array<Record<string, string | number>>;
  categories: {
    newBookings: Array<Record<string, string | number>>;
    cancelledBookings: Array<Record<string, string | number>>;
    generalInquiries: Array<Record<string, string | number>>;
    spamFakeCalls: Array<Record<string, string | number>>;
  };
};

export type CalendarData = {
  days: Array<{
    date: string;
    bookings: Array<Record<string, string | number>>;
  }>;
};

export type DateRange = { start: string; end: string };

export function fetchJson<T>(path: string, token: string): Promise<T> {
  return fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}

export function postJson<T>(path: string, token: string, payload: unknown): Promise<T> {
  return fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}

export function tokenFromHash() {
  if (!window.location.hash) return "";
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get("id_token") || "";
}

export function startLogin() {
  if (!authDomain || !userPoolClientId) {
    throw new Error("Cognito Hosted UI is not configured yet. Deploy with SST first.");
  }
  const params = new URLSearchParams({
    client_id: userPoolClientId,
    response_type: "token",
    scope: "openid email profile",
    redirect_uri: window.location.origin,
  });
  window.location.href = `${authDomain}/login?${params.toString()}`;
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toDateInput(start), end: toDateInput(end) };
}

export function toDateInput(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatActivityType(value: unknown) {
  const labels: Record<string, string> = {
    new_booking: "New booking",
    cancelled_booking: "Cancelled booking",
    general_inquiry: "General inquiry",
    spam_fake: "Spam/Fake",
  };
  return labels[String(value)] || "Activity";
}
