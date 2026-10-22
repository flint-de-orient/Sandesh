# Sandesh

Personalised bulk email for Flint De Orient. Write one message, upload an Excel list, and everyone receives a copy addressed to them by name. Replies, bounces and the sent log are tracked in the same app.

Sandesh has no backend of its own. Every action is a call to an n8n webhook.

| Page | What it does |
| --- | --- |
| **Send** (`/`) | Mail-style composer: recipients from Excel/CSV, subject, optional campaign name, rich-text message with `{{name}}`. Shows a results dashboard after sending, with **View in Sent**. |
| **Inbox** (`/inbox`) | Replies, bounces and auto-replies, in a list and reading pane. Filters, search, unread state, HTML or plain-text view. Refreshes every 60 s. |
| **Sent** (`/sent`) | Every email sent, from Sandesh or webmail, with status, reply and bounce tracking. Filters, detail drawer, CSV export. |
| **Campaigns** (`/campaigns`) | One card per bulk send: sent, failed, skipped and reply counts. |

## Setup

Requires Node.js 20+.

```bash
npm install
npm run dev          # http://localhost:3000, talks to n8n
npm run dev:demo     # same app with built-in sample data; nothing is sent
```

Production: `npm run build && npm start`.

## Environment variables (`.env.local`)

| Variable | Required | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_SANDESH_API` | Yes | `https://mailn8n.flintdeorient.in/webhook` |
| `NEXT_PUBLIC_SANDESH_FROM` | No | `sales@flintdeorient.in` (shown in the From row only) |
| `NEXT_PUBLIC_SANDESH_DEMO` | No | `true` serves sample data and disables real sending |

`NEXT_PUBLIC_SANDESH_API` is the base URL. Endpoint paths are appended to it, for example `…/webhook/mail-inbox`. Use n8n **Production** URLs. These values are built into the browser bundle, so restart or rebuild after changing them. Never put secrets in them.

## Webhook contract

Every webhook must:
- end with a **Respond to Webhook** node that returns JSON;
- allow the site's origin under **Webhook node → Options → Allowed Origins (CORS)**.

List endpoints may return a bare array or `{ "items": [...] }`. Missing fields fall back to empty values, and timestamps should be ISO 8601. The UI shows all times in **Asia/Kolkata**.

### `POST /bulk-mail` (multipart/form-data)

| Field | Notes |
| --- | --- |
| `file` | The spreadsheet, unchanged |
| `subject` | May contain `{{name}}` |
| `message` | Plain-text version of the body |
| `html` | Formatted body (sanitised: b, i, u, s, lists, h2, h3, alignment) |
| `campaignName` | Optional |

Response, once sending has finished:

```json
{
  "campaignId": "cmp_2026_10_16_1627",
  "status": "completed",
  "totalRowsInExcel": 132, "validRecipients": 128,
  "sent": 125, "failed": 3, "skipped": 4,
  "failedList":  [{ "name": "", "email": "", "error": "" }],
  "skippedList": [{ "name": "", "email": "", "reason": "" }],
  "startedAt": "2026-10-16T10:57:00Z", "finishedAt": "2026-10-16T11:01:14Z", "durationSec": 254
}
```

`campaignId` is what enables the **View in Sent** link.

### `GET /mail-inbox?type=&limit=`

`type` is optional: `reply`, `bounce` or `auto-reply`.

```json
[{ "messageId": "<…>", "from": "aisha@example.com", "fromName": "Aisha Khan", "to": "sales@flintdeorient.in",
   "subject": "Re: …", "text": "…", "html": "…", "date": "2026-10-16T09:12:00Z",
   "type": "reply", "read": false, "matchedEmail": "aisha@example.com" }]
```

### `GET /mail-sent?campaignId=&limit=`

```json
[{ "messageId": "<…>", "campaignId": "cmp_…", "campaignName": "Diwali greetings 2026",
   "name": "Aisha Khan", "email": "aisha@example.com", "subject": "…", "html": "…",
   "status": "sent", "error": "", "sentAt": "…", "source": "sandesh",
   "replied": true, "repliedAt": "…", "bounced": false }]
```

`status` is `sent` or `failed`, and `source` is `sandesh` or `webmail`.

### `GET /mail-campaigns`

```json
[{ "campaignId": "cmp_…", "totalRowsInExcel": 16, "validRecipients": 14, "sent": 13, "failed": 1,
   "skipped": 2, "startedAt": "…", "finishedAt": "…", "durationSec": 42 }]
```

A `campaignName` field is optional. When it's missing, the name is taken from the sent log. Reply counts are always computed from the sent log.

### `POST /mail-read`

The body is **form-urlencoded**: `messageId=<id>&read=true|false`. Respond with `{ "ok": true }`.

It isn't JSON on purpose: a JSON body makes the browser send a CORS preflight (`OPTIONS`), which the current server answers with an error. In n8n, read the fields from `$json.body.messageId` and `$json.body.read`. `read` arrives as the string `"true"` or `"false"`.

## Excel format

The first row holds the headers. Only the first sheet is read.

| Column | Accepted headers (any case, spaces or punctuation) |
| --- | --- |
| Email (required) | Email, E-mail, Email address, Mail, Email ID |
| Name (optional) | Name, Full name, First name, Customer name |

Blank rows are ignored. Invalid and duplicate addresses are flagged before sending.

## Security

- **The webhooks have no authentication.** Anyone who knows the URLs can send mail as your address and read the inbox through `/mail-inbox`. Keep the app private, or add an access check in n8n before exposing it.
- **Email HTML is untrusted.** In Inbox and Sent it renders inside a sandboxed iframe with no scripts and an opaque origin, under a restrictive Content-Security-Policy. Links open in a new tab.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 with CSS-variable design tokens (Flint De Orient brand) |
| Fonts | Inter (UI), Playfair Display (headings) via `next/font` |
| Icons | lucide-react |
| Spreadsheets | SheetJS `xlsx` 0.20.3, loaded on demand |
| Backend | n8n webhooks + Hostinger SMTP; no server code in this repo |

## Project structure

```
app/            page.tsx (Send), inbox/, sent/, campaigns/, layout.tsx, globals.css
components/     AppShell, ComposeForm, RichTextEditor, UploadZone, SendButton, EmailPreview,
                RecipientPreview, ResultsDashboard, StatCard, ReadingPane, SentDrawer,
                CampaignCard, ui/ (Feedback, Tooltip, EmailFrame, Chips)
lib/            api.ts (all endpoints), types.ts, demoData.ts, useResource.ts (load + poll),
                parseRecipients.ts, richText.ts, template.ts, format.ts (IST), report.ts (CSV)
```
