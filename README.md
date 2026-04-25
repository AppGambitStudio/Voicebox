# Voicebox by APPGAMBiT

Voicebox is a self-serve voice booking widget by APPGAMBiT for Indian businesses. The flow is: configure, embed, and start taking visit bookings from any web page.

## Stack

- SST v4 AWS components
- Vite + React admin/configuration app
- S3 + CloudFront static hosting for the web app and embeddable widget script
- Cognito Hosted UI for signup/login
- API Gateway HTTP API + Lambda for backend APIs
- DynamoDB single-table storage for accounts, widget config, usage, and bookings
- [xAI Voice Agent API](https://docs.x.ai/docs/guides/voice-agent) (Grok realtime) with browser-safe ephemeral tokens

## Run

```sh
cp .env.example .env
# put your real xAI key in .env
npm install
npm run dev
```

SST prints the deployed API URL and starts the Vite app in dev mode.

## Deploy

```sh
# first deploy — generates the CloudFront URL
npx sst deploy

# read the printed `web` URL, then redeploy with it set
# (this registers it as a Cognito callback so hosted-UI sign-in works)
APP_URL="https://your-xxxxxxx.cloudfront.net" npx sst deploy
```

If you later add a custom domain, set `APP_URL` to that origin instead.

## Product Flow

1. New user signs up with Cognito.
2. The post-confirmation trigger creates a DynamoDB account on the default free plan.
3. Pick a pre-configured template: clinic appointment, salon visit, jewellery store, property site visit, or restaurant table.
4. Adjust business name, booking type, location, languages, voice (Female / Male), brand color, weekly availability, and welcome greeting.
5. Store the widget config, selected template, and category in DynamoDB under the signed-in tenant.
6. Generate an embed snippet and test it in the dashboard preview iframe.
7. Paste the snippet into any website.
8. Visitor speaks Hindi, English, or Hinglish and books a visit.

## Default Plan

Every new Cognito user starts on the `free` plan:

- 20 voice calls per calendar month
- usage counted when the widget requests an xAI ephemeral voice session
- bookings and widget config stored per tenant in DynamoDB

## Embed Shape

```html
<script
  src="https://YOUR_WEB_DOMAIN/embed/voice-booking-widget.js"
  data-api-url="https://YOUR_API_DOMAIN"
  data-widget-id="WIDGET_ID"
  defer
></script>
```

Add `data-preview="1"` to mount the widget in test mode (no usage counted, no bookings saved). The dashboard's Setup page uses this via an iframe that loads `/preview.html?widgetId=...&apiUrl=...`.

## API

- `GET /me` returns the signed-in tenant account and plan.
- `GET /dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD` returns booking/call activity summary for the signed-in tenant. Defaults in the UI to the current month.
- `GET /calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` returns bookings grouped by day for the signed-in tenant.
- `GET /widgets` lists the signed-in tenant's widgets.
- `POST /widgets` creates a widget config for the signed-in tenant.
- `GET /widgets/{widgetId}` returns public widget config.
- `POST /widgets/{widgetId}/session` creates a 5-minute xAI ephemeral token. Pass `{ "preview": true }` in the body to mint a token without reserving a call against the monthly limit (used by the in-dashboard test panel).
- `GET /widgets/{widgetId}/slots` returns the next bookable slots computed from the widget's weekly schedule (IST), with a fallback to legacy free-text slots for older widgets.
- `POST /widgets/{widgetId}/calls/{callId}/complete` stores call duration and transcript, then moves the call from pending to consumed.
- `POST /widgets/{widgetId}/bookings` stores a confirmed visit booking.
- `GET /widgets/{widgetId}/bookings` lists recent bookings for the signed-in tenant.

## DynamoDB Records

- `TENANT#{tenantId} / ACCOUNT`: plan, monthly call limit, pending calls, consumed calls, total seconds, transcript count.
- `TENANT#{tenantId} / USAGE#{YYYY-MM}`: monthly aggregate with reserved, pending, consumed, duration, and transcript counters.
- `WIDGET#{widgetId} / CONFIG`: public widget configuration.
- `WIDGET#{widgetId} / CALL#{callId}`: pending or consumed voice call with duration and transcript.
- `WIDGET#{widgetId} / BOOKING#{timestamp}#{bookingId}`: confirmed booking.

Activity records include `activityType` for dashboard buckets:

- `new_booking`
- `cancelled_booking`
- `general_inquiry`
- `spam_fake`

## Next Slot-Sync Integration

The current `slots` endpoint computes availability from each widget's weekly schedule. The next step is to swap the computation for a provider boundary that can sync from external calendars (Google Calendar, Cal.com, Calendly) or vertical systems, while keeping the widget and voice tool contract stable.

## References

- [xAI Voice Agent docs](https://docs.x.ai/docs/guides/voice-agent) — realtime WebSocket API, tools, ephemeral tokens
- [xAI API console](https://console.x.ai/) — get your `XAI_API_KEY`
- [SST v4 docs](https://sst.dev/docs/) — components used: `Dynamo`, `CognitoUserPool`, `ApiGatewayV2`, `StaticSite`
