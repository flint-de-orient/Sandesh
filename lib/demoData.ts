/**
 * Sample mailbox for NEXT_PUBLIC_SANDESH_DEMO=true: lets every page be tried
 * before the n8n workflows exist. Nothing here touches the network or sends mail.
 */
import { parseRecipients } from "./parseRecipients";
import { NAME_FALLBACK, nameTokenPattern } from "./template";
import type { Campaign, InboxMessage, MailType, SendResult, SentMail } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fill = (template: string, name: string) => template.replace(nameTokenPattern(), () => name || NAME_FALLBACK);

const PEOPLE: [string, string][] = [
  ["Aisha Khan", "aisha.khan"],
  ["Ravi Menon", "ravi.menon"],
  ["Priya Sharma", "priya.sharma"],
  ["Arjun Das", "arjun.das"],
  ["Sneha Banerjee", "sneha.banerjee"],
  ["Rahul Gupta", "rahul.gupta"],
  ["Fatima Shaikh", "fatima.shaikh"],
  ["Vikram Singh", "vikram.singh"],
  ["Ananya Roy", "ananya.roy"],
  ["Karan Mehta", "karan.mehta"],
  ["Neha Iyer", "neha.iyer"],
  ["Sourav Ghosh", "sourav.ghosh"],
  ["Meera Nair", "meera.nair"],
  ["Imran Qureshi", "imran.qureshi"],
  ["Pooja Chatterjee", "pooja.chatterjee"],
  ["Aditya Bose", "aditya.bose"],
];
const emailOf = (slug: string) => `${slug}@example.com`;

interface Seed {
  id: string;
  name: string;
  subject: string;
  body: string;
  startedAgo: number;
  people: number[];
  skipped: number;
  failed: number[];
  bounced: number[];
  /** [person index, hours after sending, unread] */
  replied: [number, number, boolean][];
  autoReply: number[];
}

const SEEDS: Seed[] = [
  {
    id: "cmp_diwali_2026",
    name: "Diwali greetings 2026",
    subject: "Wishing you a bright Diwali, {{name}}",
    body: "<p>Dear {{name}},</p><p>On behalf of everyone at <b>Flint De Orient</b>, warm wishes to you and your family this Diwali.</p><p>Thank you for building with us this year.</p><p>Warm regards,<br>Sales Team</p>",
    startedAgo: 1.2 * DAY,
    people: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    skipped: 2,
    failed: [5],
    bounced: [9],
    replied: [
      [0, 3, true],
      [2, 20, true],
      [7, 26, false],
    ],
    autoReply: [4],
  },
  {
    id: "cmp_ai_webinar",
    name: "AI automation webinar invite",
    subject: "{{name}}, join our AI automation webinar on 24 Oct",
    body: "<p>Hi {{name}},</p><p>We're hosting a 45-minute session on automating everyday operations with AI agents and n8n.</p><ul><li>Thursday, 24 October, 4:00 pm IST</li><li>Live demo and Q&amp;A</li></ul><p>Reply to this email to reserve a seat.</p><p>Regards,<br>Flint De Orient</p>",
    startedAgo: 4 * DAY,
    people: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    skipped: 1,
    failed: [],
    bounced: [12],
    replied: [
      [3, 5, false],
      [6, 30, false],
      [11, 50, false],
    ],
    autoReply: [],
  },
  {
    id: "cmp_oct_update",
    name: "Product update — October",
    subject: "What's new at Flint De Orient this October",
    body: "<p>Hello {{name}},</p><p>A quick round-up of what shipped this month: faster ERP reports, a new CRM mobile view, and WhatsApp notifications.</p><p>Best,<br>Product Team</p>",
    startedAgo: 9 * DAY,
    people: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    skipped: 0,
    failed: [8],
    bounced: [],
    replied: [[1, 4, false]],
    autoReply: [],
  },
];

const REPLY_LINES = [
  "Thank you so much! Wishing your whole team a very happy Diwali too.",
  "Thanks for the invite. Could you share the joining link? I'd like to attend with a colleague.",
  "Appreciate the update. Can we set up a call next week to discuss the CRM mobile view?",
  "Lovely note, thank you. Best wishes to everyone at Flint De Orient.",
  "Count me in. Will the session be recorded?",
  "Thanks! Please send me the pricing for the ERP reporting module.",
  "Happy Diwali! Looking forward to working together in the new year.",
];

const paragraphs = (text: string) =>
  text
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

function buildStore() {
  const sent: SentMail[] = [];
  const inbox: InboxMessage[] = [];
  const campaigns: Campaign[] = [];
  let replyIndex = 0;

  for (const seed of SEEDS) {
    const startedAt = now - seed.startedAgo;
    seed.people.forEach((p, k) => {
      const [name, slug] = PEOPLE[p];
      const email = emailOf(slug);
      const sentMs = startedAt + k * 3000;
      const failed = seed.failed.includes(p);
      const bounced = seed.bounced.includes(p);
      const reply = seed.replied.find(([who]) => who === p);
      const subject = fill(seed.subject, name);
      const messageId = `<${seed.id}.${slug}@flintdeorient.in>`;

      sent.push({
        messageId,
        campaignId: seed.id,
        campaignName: seed.name,
        name,
        email,
        subject,
        html: fill(seed.body, name),
        status: failed ? "failed" : "sent",
        error: failed ? "550 5.1.1 Recipient address rejected: mailbox unavailable" : "",
        sentAt: iso(sentMs),
        source: "sandesh",
        replied: Boolean(reply),
        repliedAt: reply ? iso(sentMs + reply[1] * HOUR) : null,
        bounced,
      });

      if (reply) {
        const text = `Hi,\n\n${REPLY_LINES[replyIndex++ % REPLY_LINES.length]}\n\nRegards,\n${name}`;
        inbox.push({
          messageId: `<reply.${seed.id}.${slug}@mail.example.com>`,
          from: email,
          fromName: name,
          to: "sales@flintdeorient.in",
          subject: `Re: ${subject}`,
          text,
          html: paragraphs(text),
          date: iso(sentMs + reply[1] * HOUR),
          type: "reply",
          read: !reply[2],
          matchedEmail: email,
        });
      }
      if (bounced) {
        const text = `This is the mail system at host mail.hostinger.com.\n\nI'm sorry to have to inform you that your message could not be delivered to one or more recipients.\n\n<${email}>: host mx.example.com said: 550 5.1.1 User unknown`;
        inbox.push({
          messageId: `<bounce.${seed.id}.${slug}@hostinger.com>`,
          from: "mailer-daemon@hostinger.com",
          fromName: "Mail Delivery System",
          to: "sales@flintdeorient.in",
          subject: "Undelivered Mail Returned to Sender",
          text,
          html: "",
          date: iso(sentMs + 2 * MINUTE),
          type: "bounce",
          read: seed.startedAgo > 2 * DAY,
          matchedEmail: email,
        });
      }
      if (seed.autoReply.includes(p)) {
        const text = `Thank you for your email. I'm out of the office until 20 October with limited access to email.\n\nFor anything urgent, please contact my team at team@example.com.\n\n${name}`;
        inbox.push({
          messageId: `<auto.${seed.id}.${slug}@mail.example.com>`,
          from: email,
          fromName: name,
          to: "sales@flintdeorient.in",
          subject: `Automatic reply: ${subject}`,
          text,
          html: paragraphs(text),
          date: iso(sentMs + MINUTE),
          type: "auto-reply",
          read: false,
          matchedEmail: email,
        });
      }
    });

    const failedCount = seed.failed.length;
    campaigns.push({
      campaignId: seed.id,
      campaignName: seed.name,
      totalRowsInExcel: seed.people.length + seed.skipped,
      validRecipients: seed.people.length,
      sent: seed.people.length - failedCount,
      failed: failedCount,
      skipped: seed.skipped,
      startedAt: iso(startedAt),
      finishedAt: iso(startedAt + seed.people.length * 3000),
      durationSec: seed.people.length * 3,
    });
  }

  // A few one-off emails written in webmail, logged alongside campaigns.
  const webmail: [number, string, number, boolean][] = [
    [13, "Quotation for ERP implementation", 5 * HOUR, true],
    [15, "Proposal: CRM customisation for your sales team", 2 * DAY, false],
    [10, "Meeting notes from Friday", 6 * DAY, false],
  ];
  for (const [p, subject, ago, replied] of webmail) {
    const [name, slug] = PEOPLE[p];
    const email = emailOf(slug);
    sent.push({
      messageId: `<webmail.${slug}.${ago}@flintdeorient.in>`,
      campaignId: "",
      campaignName: "",
      name,
      email,
      subject,
      html: `<p>Dear ${name.split(" ")[0]},</p><p>Please find the details attached. Happy to walk you through them on a call.</p><p>Regards,<br>Sales, Flint De Orient</p>`,
      status: "sent",
      error: "",
      sentAt: iso(now - ago),
      source: "webmail",
      replied,
      repliedAt: replied ? iso(now - ago + 2 * HOUR) : null,
      bounced: false,
    });
    if (replied) {
      const text = `Hello,\n\nThanks for the quotation. The numbers look reasonable. Can we start in the first week of November?\n\nBest,\n${name}`;
      inbox.push({
        messageId: `<reply.webmail.${slug}@mail.example.com>`,
        from: email,
        fromName: name,
        to: "sales@flintdeorient.in",
        subject: `Re: ${subject}`,
        text,
        html: paragraphs(text),
        date: iso(now - ago + 2 * HOUR),
        type: "reply",
        read: false,
        matchedEmail: email,
      });
    }
  }

  return { sent, inbox, campaigns };
}

const store = buildStore();
const byNewest = <T>(key: (item: T) => string | null) => (a: T, b: T) =>
  Date.parse(key(b) ?? "") - Date.parse(key(a) ?? "");

export const demo = {
  async inbox(type?: MailType, limit = 200): Promise<InboxMessage[]> {
    await wait(450);
    return structuredClone(
      store.inbox
        .filter((m) => !type || m.type === type)
        .sort(byNewest((m) => m.date))
        .slice(0, limit),
    );
  },

  async sent(campaignId?: string, limit = 500): Promise<SentMail[]> {
    await wait(500);
    return structuredClone(
      store.sent
        .filter((m) => !campaignId || m.campaignId === campaignId)
        .sort(byNewest((m) => m.sentAt))
        .slice(0, limit),
    );
  },

  async campaigns(): Promise<Campaign[]> {
    await wait(450);
    return structuredClone(store.campaigns.sort(byNewest((c) => c.startedAt)));
  },

  async markRead(messageId: string, read: boolean): Promise<void> {
    await wait(150);
    const message = store.inbox.find((m) => m.messageId === messageId);
    if (message) message.read = read;
  },

  /** Pretends to send: reads the real file, then logs every valid row as sent. */
  async send(request: { file: File; subject: string; html: string; campaignName?: string }): Promise<SendResult> {
    const startedMs = Date.now();
    const parsed = await parseRecipients(request.file);
    await wait(2500);
    const campaignId = `cmp_demo_${startedMs.toString(36)}`;
    const campaignName = request.campaignName?.trim() || "";
    const valid = parsed.rows.filter((r) => r.status === "valid");
    const skipped = parsed.rows.filter((r) => r.status !== "valid");

    valid.forEach((r, i) => {
      store.sent.push({
        messageId: `<${campaignId}.${i}@flintdeorient.in>`,
        campaignId,
        campaignName,
        name: r.name,
        email: r.email,
        subject: fill(request.subject, r.name),
        html: fill(request.html, r.name),
        status: "sent",
        error: "",
        sentAt: iso(startedMs + i * 1000),
        source: "sandesh",
        replied: false,
        repliedAt: null,
        bounced: false,
      });
    });

    const finishedMs = Date.now();
    const summary: Campaign = {
      campaignId,
      campaignName,
      totalRowsInExcel: parsed.total,
      validRecipients: valid.length,
      sent: valid.length,
      failed: 0,
      skipped: skipped.length,
      startedAt: iso(startedMs),
      finishedAt: iso(finishedMs),
      durationSec: Math.round((finishedMs - startedMs) / 1000),
    };
    store.campaigns.push(summary);

    return {
      ...summary,
      status: "completed (demo: nothing was sent)",
      failedList: [],
      skippedList: skipped.map((r) => ({
        name: r.name,
        email: r.email,
        reason: r.status === "duplicate" ? "duplicate" : "invalid email",
      })),
    };
  },
};
