import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const FREE_PLAN_MONTHLY_CALLS = 20;

type TimeRange = { open: string; close: string };
type WeekdaySchedule = { weekday: number; ranges: TimeRange[] };
type Schedule = {
  timezone: string;
  weeklyHours: WeekdaySchedule[];
  slotMinutes: number;
  leadTimeMinutes: number;
  horizonDays: number;
};

type WidgetConfig = {
  widgetId: string;
  tenantId: string;
  businessName: string;
  serviceName: string;
  location: string;
  languageHint: string;
  voice: string;
  brandColor: string;
  templateId: string;
  category: string;
  slots: string[];
  schedule?: Schedule;
  greeting: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_SCHEDULE: Schedule = {
  timezone: "Asia/Kolkata",
  weeklyHours: [
    { weekday: 0, ranges: [] },
    { weekday: 1, ranges: [{ open: "10:00", close: "19:00" }] },
    { weekday: 2, ranges: [{ open: "10:00", close: "19:00" }] },
    { weekday: 3, ranges: [{ open: "10:00", close: "19:00" }] },
    { weekday: 4, ranges: [{ open: "10:00", close: "19:00" }] },
    { weekday: 5, ranges: [{ open: "10:00", close: "19:00" }] },
    { weekday: 6, ranges: [{ open: "10:00", close: "17:00" }] },
  ],
  slotMinutes: 30,
  leadTimeMinutes: 60,
  horizonDays: 14,
};

type BookingInput = {
  name?: string;
  mobile?: string;
  preferredDate?: string;
  preferredTime?: string;
  service?: string;
  status?: string;
  activityType?: string;
};

type CallCompletionInput = {
  durationSeconds?: number;
  transcript?: unknown;
  endedReason?: string;
  activityType?: string;
};

type AuthContext = {
  userId: string;
  email: string;
};

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = (Resource as unknown as { VoiceBookingTable: { name: string } }).VoiceBookingTable.name;
const xaiSessionUrl = "https://api.x.ai/v1/realtime/client_secrets";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath.replace(/\/+$/, "") || "/";

    if (method === "GET" && path === "/me") {
      const auth = requireAuth(event);
      const account = await ensureDefaultAccount(auth);
      return json(200, { account });
    }

    if (method === "GET" && path === "/widgets") {
      const auth = requireAuth(event);
      return json(200, await listTenantWidgets(auth.userId));
    }

    if (method === "GET" && path === "/dashboard") {
      const auth = requireAuth(event);
      return json(200, await getDashboard(auth, event));
    }

    if (method === "GET" && path === "/calendar") {
      const auth = requireAuth(event);
      return json(200, await getCalendar(auth, event));
    }

    if (method === "POST" && path === "/widgets") {
      const auth = requireAuth(event);
      await ensureDefaultAccount(auth);
      return json(201, await createWidget(auth, await body(event)));
    }

    const widgetMatch = path.match(/^\/widgets\/([^/]+)$/);
    if (method === "GET" && widgetMatch) {
      return json(200, { widget: await requireWidget(widgetMatch[1]) });
    }

    const sessionMatch = path.match(/^\/widgets\/([^/]+)\/session$/);
    if (method === "POST" && sessionMatch) {
      const widget = await requireWidget(sessionMatch[1]);
      const payload = await body(event);
      const session = await createXaiSession();
      if (payload.preview === true) {
        return json(200, { ...session, preview: true });
      }
      const call = await reserveVoiceCall(widget);
      return json(200, { ...session, call });
    }

    const callCompleteMatch = path.match(/^\/widgets\/([^/]+)\/calls\/([^/]+)\/complete$/);
    if (method === "POST" && callCompleteMatch) {
      return json(200, await completeVoiceCall(callCompleteMatch[1], callCompleteMatch[2], await body(event)));
    }

    const bookingMatch = path.match(/^\/widgets\/([^/]+)\/bookings$/);
    if (bookingMatch && method === "POST") {
      return json(201, await createBooking(bookingMatch[1], await body(event)));
    }
    if (bookingMatch && method === "GET") {
      return json(200, await listBookings(bookingMatch[1], requireAuth(event)));
    }

    const slotsMatch = path.match(/^\/widgets\/([^/]+)\/slots$/);
    if (slotsMatch && method === "GET") {
      const widget = await requireWidget(slotsMatch[1]);
      if (widget.schedule) {
        return json(200, { slots: computeSlots(widget.schedule), source: "schedule" });
      }
      return json(200, {
        slots: widget.slots.map((slot) => ({ value: slot, label: slot, available: true, source: "configured" })),
      });
    }

    return json(404, { error: "Route not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const statusCode = message.includes("not found") ? 404 : message.includes("Missing") ? 400 : 500;
    return json(statusCode, { error: message });
  }
}

async function createWidget(auth: AuthContext, input: Record<string, unknown>) {
  const now = new Date().toISOString();
  const tenantId = auth.userId;
  const widgetId = crypto.randomUUID();
  const businessName = asText(input.businessName) || "Aarav Jewels";
  const serviceName = asText(input.serviceName) || "Store visit";
  const widget: WidgetConfig = {
    widgetId,
    tenantId,
    businessName,
    serviceName,
    location: asText(input.location) || "Ahmedabad",
    languageHint: asText(input.languageHint) || "Hindi, English, Hinglish",
    voice: asText(input.voice) || "female",
    brandColor: asText(input.brandColor) || "#0d6b57",
    templateId: asText(input.templateId) || "custom",
    category: asText(input.category) || "custom",
    slots: asStringArray(input.slots),
    schedule: normalizeSchedule(input.schedule) || DEFAULT_SCHEDULE,
    greeting: asText(input.greeting) || `Namaste! ${businessName} mein aapka swagat hai. ${serviceName} book karni hai ya kuch aur poochhna hai?`,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `WIDGET#${widget.widgetId}`,
        sk: "CONFIG",
        gsi1pk: `TENANT#${tenantId}`,
        gsi1sk: `WIDGET#${now}`,
        ...widget,
      },
    }),
  );

  return { widget };
}

async function listTenantWidgets(tenantId: string) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :pk and begins_with(gsi1sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${tenantId}`,
        ":prefix": "WIDGET#",
      },
      ScanIndexForward: false,
      Limit: 25,
    }),
  );

  return { widgets: result.Items || [] };
}

async function getDashboard(auth: AuthContext, event: APIGatewayProxyEventV2) {
  const range = readDateRange(event);
  const [bookings, calls, account] = await Promise.all([
    listTenantRecords(auth.userId, "BOOKING", range.start, range.end),
    listTenantRecords(auth.userId, "CALL", range.start, range.end),
    ensureDefaultAccount(auth),
  ]);

  const completedCalls = calls.filter((call) => call.status === "consumed");
  const totalCallSeconds = completedCalls.reduce((sum, call) => sum + Number(call.durationSeconds || 0), 0);
  const newBookings = bookings.filter((booking) => booking.activityType === "new_booking");
  const cancelledBookings = bookings.filter((booking) => booking.activityType === "cancelled_booking");
  const generalInquiries = calls.filter((call) => call.activityType === "general_inquiry");
  const spamCalls = calls.filter((call) => call.activityType === "spam_fake");

  return {
    range,
    summary: {
      bookings: bookings.length,
      newBookings: newBookings.length,
      cancelledBookings: cancelledBookings.length,
      generalInquiries: generalInquiries.length,
      spamFakeCalls: spamCalls.length,
      pendingCalls: calls.filter((call) => call.status === "pending").length,
      consumedCalls: completedCalls.length,
      totalCallSeconds,
      transcripts: completedCalls.filter((call) => Array.isArray(call.transcript) && call.transcript.length > 0).length,
      monthlyCallLimit: Number(account.monthlyCallLimit || FREE_PLAN_MONTHLY_CALLS),
    },
    recentBookings: bookings.slice(0, 12),
    recentCalls: calls.slice(0, 12),
    categories: {
      newBookings: newBookings.slice(0, 12),
      cancelledBookings: cancelledBookings.slice(0, 12),
      generalInquiries: generalInquiries.slice(0, 12),
      spamFakeCalls: spamCalls.slice(0, 12),
    },
  };
}

async function getCalendar(auth: AuthContext, event: APIGatewayProxyEventV2) {
  const range = readDateRange(event);
  const bookings = await listTenantRecords(auth.userId, "BOOKING", range.start, range.end);
  const days = new Map<string, unknown[]>();

  for (const booking of bookings) {
    const day = bookingDateKey(booking);
    days.set(day, [...(days.get(day) || []), booking]);
  }

  return {
    range,
    days: Array.from(days.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, bookings: items })),
  };
}

async function listTenantRecords(tenantId: string, kind: "BOOKING" | "CALL", start: string, end: string) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :pk and gsi1sk BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${tenantId}`,
        ":start": `${kind}#${start}`,
        ":end": `${kind}#${end}`,
      },
      ScanIndexForward: false,
      Limit: 100,
    }),
  );

  return result.Items || [];
}

async function requireWidget(widgetId: string): Promise<WidgetConfig> {
  const result = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `WIDGET#${widgetId}`, sk: "CONFIG" },
    }),
  );

  if (!result.Item) {
    throw new Error("Widget not found");
  }

  return result.Item as WidgetConfig;
}

async function ensureDefaultAccount(auth: AuthContext) {
  const now = new Date().toISOString();
  const account = {
    pk: `TENANT#${auth.userId}`,
    sk: "ACCOUNT",
    tenantId: auth.userId,
    email: auth.email,
    plan: "free",
    monthlyCallLimit: FREE_PLAN_MONTHLY_CALLS,
    pendingCalls: 0,
    consumedCalls: 0,
    totalCallSeconds: 0,
    transcriptCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: account,
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  ).catch((error: unknown) => {
    if (isConditionalCheckFailed(error)) return;
    throw error;
  });

  const result = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${auth.userId}`, sk: "ACCOUNT" },
    }),
  );

  return result.Item || account;
}

async function reserveVoiceCall(widget: WidgetConfig) {
  const month = new Date().toISOString().slice(0, 7);
  const now = new Date().toISOString();
  const callId = crypto.randomUUID();

  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: `TENANT#${widget.tenantId}`, sk: `USAGE#${month}` },
        UpdateExpression: [
          "SET plan = if_not_exists(plan, :plan),",
          "monthlyCallLimit = if_not_exists(monthlyCallLimit, :limit),",
          "updatedAt = :now,",
          "createdAt = if_not_exists(createdAt, :now)",
          "ADD pendingCalls :one, reservedCalls :one",
        ].join(" "),
        ConditionExpression: "attribute_not_exists(reservedCalls) OR reservedCalls < :limit",
        ExpressionAttributeValues: {
          ":plan": "free",
          ":limit": FREE_PLAN_MONTHLY_CALLS,
          ":now": now,
          ":one": 1,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: `WIDGET#${widget.widgetId}`,
          sk: `CALL#${callId}`,
          gsi1pk: `TENANT#${widget.tenantId}`,
          gsi1sk: `CALL#${now}`,
          callId,
          widgetId: widget.widgetId,
          tenantId: widget.tenantId,
          month,
          status: "pending",
          startedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );

    return {
      callId,
      plan: "free",
      monthlyCallLimit: FREE_PLAN_MONTHLY_CALLS,
      pendingCalls: result.Attributes?.pendingCalls || 1,
      consumedCalls: result.Attributes?.consumedCalls || 0,
      reservedCalls: result.Attributes?.reservedCalls || 1,
      month,
    };
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      throw new Error("Free monthly voice-call limit reached");
    }
    throw error;
  }
}

async function completeVoiceCall(widgetId: string, callId: string, input: CallCompletionInput) {
  const widget = await requireWidget(widgetId);
  const existing = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `WIDGET#${widgetId}`, sk: `CALL#${callId}` },
    }),
  );

  if (!existing.Item || existing.Item.tenantId !== widget.tenantId) {
    throw new Error("Call not found");
  }

  if (existing.Item.status === "consumed") {
    return { call: existing.Item };
  }

  const now = new Date().toISOString();
  const durationSeconds = Math.max(0, Math.round(Number(input.durationSeconds || 0)));
  const transcript = normalizeTranscript(input.transcript);
  const hasTranscript = transcript.length > 0;
  const activityType = classifyCallActivity(input, transcript);
  const month = asText(existing.Item.month) || now.slice(0, 7);

  const updated = await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `WIDGET#${widgetId}`, sk: `CALL#${callId}` },
      UpdateExpression: [
        "SET #status = :status,",
        "endedAt = :now,",
        "updatedAt = :now,",
        "durationSeconds = :durationSeconds,",
        "endedReason = :endedReason,",
        "activityType = :activityType,",
        "transcript = :transcript",
      ].join(" "),
      ConditionExpression: "#status = :pending",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "consumed",
        ":pending": "pending",
        ":now": now,
        ":durationSeconds": durationSeconds,
        ":endedReason": asText(input.endedReason) || "client_completed",
        ":activityType": activityType,
        ":transcript": transcript,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${widget.tenantId}`, sk: `USAGE#${month}` },
      UpdateExpression: [
        "SET updatedAt = :now",
        "ADD pendingCalls :minusOne, consumedCalls :one, totalCallSeconds :durationSeconds, transcriptCount :transcriptCount",
      ].join(" "),
      ExpressionAttributeValues: {
        ":now": now,
        ":minusOne": -1,
        ":one": 1,
        ":durationSeconds": durationSeconds,
        ":transcriptCount": hasTranscript ? 1 : 0,
      },
    }),
  );

  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${widget.tenantId}`, sk: "ACCOUNT" },
      UpdateExpression: [
        "SET updatedAt = :now",
        "ADD consumedCalls :one, totalCallSeconds :durationSeconds, transcriptCount :transcriptCount",
      ].join(" "),
      ExpressionAttributeValues: {
        ":now": now,
        ":one": 1,
        ":durationSeconds": durationSeconds,
        ":transcriptCount": hasTranscript ? 1 : 0,
      },
    }),
  );

  return { call: updated.Attributes };
}

async function createXaiSession() {
  if (!process.env.XAI_API_KEY) {
    throw new Error("Missing XAI_API_KEY");
  }

  const response = await fetch(xaiSessionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expires_after: { seconds: 300 } }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || "Could not create xAI session");
  }

  return data;
}

async function createBooking(widgetId: string, input: BookingInput) {
  const widget = await requireWidget(widgetId);
  const booking = normalizeBooking(widget, input);
  const now = new Date().toISOString();
  const bookingId = crypto.randomUUID();

  const item = {
    pk: `WIDGET#${widgetId}`,
    sk: `BOOKING#${now}#${bookingId}`,
    gsi1pk: `TENANT#${widget.tenantId}`,
    gsi1sk: `BOOKING#${now}`,
    bookingId,
    widgetId,
    tenantId: widget.tenantId,
    createdAt: now,
    ...booking,
  };

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );

  return {
    booking: item,
    message: `Visit booked for ${booking.name} on ${booking.preferredDate} at ${booking.preferredTime}.`,
  };
}

async function listBookings(widgetId: string, auth: AuthContext) {
  const widget = await requireWidget(widgetId);
  if (widget.tenantId !== auth.userId) {
    throw new Error("Widget not found");
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk and begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `WIDGET#${widgetId}`,
        ":prefix": "BOOKING#",
      },
      ScanIndexForward: false,
      Limit: 25,
    }),
  );

  return { bookings: result.Items || [] };
}

function normalizeBooking(widget: WidgetConfig, input: BookingInput) {
  const name = asText(input.name);
  const mobile = asText(input.mobile).replace(/\D/g, "");
  const preferredDate = asText(input.preferredDate);
  const preferredTime = asText(input.preferredTime);
  const service = asText(input.service) || widget.serviceName;
  const status = normalizeBookingStatus(input.status);
  const activityType = normalizeActivityType(input.activityType) || (status === "cancelled" ? "cancelled_booking" : "new_booking");

  if (!name || !/^[6-9]\d{9}$/.test(mobile) || !preferredDate || !preferredTime) {
    throw new Error("Missing name, valid Indian mobile number, preferred date, or preferred time");
  }

  return { name, mobile, preferredDate, preferredTime, service, status, activityType };
}

async function body(event: APIGatewayProxyEventV2) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(raw);
}

function json(statusCode: number, value: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(value),
  };
}

function readDateRange(event: APIGatewayProxyEventV2) {
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const start = normalizeDateParam(event.queryStringParameters?.start, defaultStart);
  const end = normalizeDateParam(event.queryStringParameters?.end, defaultEnd, true);
  return { start, end };
}

function normalizeDateParam(value: string | undefined, fallback: Date, endOfDay = false) {
  if (!value) return fallback.toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback.toISOString();
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date.toISOString();
}

function bookingDateKey(booking: Record<string, unknown>) {
  const preferredDate = asText(booking.preferredDate);
  if (/^\d{4}-\d{2}-\d{2}/.test(preferredDate)) return preferredDate.slice(0, 10);
  const createdAt = asText(booking.createdAt);
  return createdAt ? createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function requireAuth(event: APIGatewayProxyEventV2): AuthContext {
  const claims = (event.requestContext as { authorizer?: { jwt?: { claims?: Record<string, unknown> } } }).authorizer?.jwt?.claims || {};
  const userId = asText(claims.sub);
  const email = asText(claims.email);

  if (!userId) {
    throw new Error("Missing authenticated user");
  }

  return { userId, email };
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean);
}

function normalizeTranscript(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Record<string, unknown>;
      const role = asText(candidate.role);
      const text = asText(candidate.text);
      if (!role || !text) return null;
      return {
        role,
        text: text.slice(0, 4000),
        at: asText(candidate.at) || new Date().toISOString(),
      };
    })
    .filter((entry): entry is { role: string; text: string; at: string } => Boolean(entry))
    .slice(-50);
}

function classifyCallActivity(input: CallCompletionInput, transcript: Array<{ role: string; text: string; at: string }>) {
  const explicit = normalizeActivityType(input.activityType);
  if (explicit) return explicit;

  const combined = transcript.map((entry) => entry.text).join(" ").toLowerCase();
  if (/(spam|fake|wrong number|galat number|irrelevant|nonsense|abuse|fraud)/i.test(combined)) return "spam_fake";
  if (/(cancel|cancelled|canceled|cancel kar|रद्द|रद)/i.test(combined)) return "cancelled_booking";
  if (/(book|booking|appointment|visit|reserve|slot|schedule|बुक|अपॉइंटमेंट)/i.test(combined)) return "new_booking";
  return "general_inquiry";
}

function normalizeActivityType(value: unknown) {
  const activityType = asText(value);
  if (["new_booking", "cancelled_booking", "general_inquiry", "spam_fake"].includes(activityType)) {
    return activityType;
  }
  return "";
}

function normalizeBookingStatus(value: unknown) {
  const status = asText(value);
  if (["confirmed", "cancelled"].includes(status)) return status;
  return "confirmed";
}

function isConditionalCheckFailed(error: unknown) {
  return error instanceof Error && error.name === "ConditionalCheckFailedException";
}

function normalizeSchedule(value: unknown): Schedule | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const timezone = asText(raw.timezone) || "Asia/Kolkata";
  const slotMinutes = clampInt(raw.slotMinutes, 5, 240, 30);
  const leadTimeMinutes = clampInt(raw.leadTimeMinutes, 0, 24 * 60 * 7, 60);
  const horizonDays = clampInt(raw.horizonDays, 1, 60, 14);
  const weeklyHoursInput = Array.isArray(raw.weeklyHours) ? raw.weeklyHours : [];
  const byDay = new Map<number, TimeRange[]>();
  for (let day = 0; day <= 6; day += 1) byDay.set(day, []);
  for (const entry of weeklyHoursInput) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const weekday = clampInt(candidate.weekday, 0, 6, -1);
    if (weekday < 0) continue;
    const ranges = Array.isArray(candidate.ranges) ? candidate.ranges : [];
    const sanitized: TimeRange[] = [];
    for (const range of ranges) {
      if (!range || typeof range !== "object") continue;
      const r = range as Record<string, unknown>;
      const open = asTime(r.open);
      const close = asTime(r.close);
      if (!open || !close) continue;
      if (timeToMinutes(close) <= timeToMinutes(open)) continue;
      sanitized.push({ open, close });
    }
    sanitized.sort((a, b) => timeToMinutes(a.open) - timeToMinutes(b.open));
    byDay.set(weekday, sanitized);
  }
  return {
    timezone,
    slotMinutes,
    leadTimeMinutes,
    horizonDays,
    weeklyHours: Array.from(byDay.entries()).map(([weekday, ranges]) => ({ weekday, ranges })),
  };
}

function computeSlots(schedule: Schedule, limit = 12) {
  const now = new Date();
  const earliestUtc = new Date(now.getTime() + schedule.leadTimeMinutes * 60_000);
  const horizonUtc = new Date(now.getTime() + schedule.horizonDays * 24 * 60 * 60_000);
  const tz = schedule.timezone || "Asia/Kolkata";
  const dayMs = 24 * 60 * 60_000;
  const todayInTz = new Date(formatInTz(now, tz, "yyyy-MM-dd") + "T00:00:00");
  const slots: Array<{ value: string; label: string; available: boolean; source: string }> = [];

  for (let dayOffset = 0; slots.length < limit && dayOffset <= schedule.horizonDays; dayOffset += 1) {
    const dayDate = new Date(todayInTz.getTime() + dayOffset * dayMs);
    const weekday = computeWeekdayInTz(dayDate, tz);
    const ranges = schedule.weeklyHours.find((entry) => entry.weekday === weekday)?.ranges || [];
    for (const range of ranges) {
      const startMinutes = timeToMinutes(range.open);
      const endMinutes = timeToMinutes(range.close);
      for (let mins = startMinutes; mins + schedule.slotMinutes <= endMinutes; mins += schedule.slotMinutes) {
        const isoLocal = `${formatInTz(dayDate, tz, "yyyy-MM-dd")}T${minutesToTime(mins)}:00`;
        const slotUtc = zonedDateTimeToUtc(isoLocal, tz);
        if (slotUtc.getTime() < earliestUtc.getTime()) continue;
        if (slotUtc.getTime() > horizonUtc.getTime()) break;
        slots.push({
          value: isoLocal,
          label: formatSlotLabel(slotUtc, tz),
          available: true,
          source: "schedule",
        });
        if (slots.length >= limit) break;
      }
      if (slots.length >= limit) break;
    }
  }

  return slots;
}

function asTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function formatInTz(date: Date, timezone: string, pattern: "yyyy-MM-dd") {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  if (pattern === "yyyy-MM-dd") return formatter.format(date);
  return formatter.format(date);
}

function computeWeekdayInTz(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" });
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return labels.indexOf(formatter.format(date));
}

function zonedDateTimeToUtc(isoLocal: string, timezone: string): Date {
  const [datePart, timePart] = isoLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const tzOffsetMinutes = timezoneOffsetMinutes(new Date(guess), timezone);
  return new Date(guess - tzOffsetMinutes * 60_000);
}

function timezoneOffsetMinutes(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUTC - date.getTime()) / 60_000);
}

function formatSlotLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
