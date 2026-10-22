import { nameTokenPattern } from "./template";

/** Tags the editor can produce. Everything else is unwrapped (kept as text) or dropped. */
const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "UL", "OL", "LI", "DIV", "P", "BR", "H2", "H3"]);
const DROPPED = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "HEAD", "META", "LINK", "TITLE"]);
const BLOCKS = new Set(["DIV", "P", "LI", "H2", "H3", "UL", "OL"]);
const ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

function parse(html: string): HTMLElement | null {
  if (typeof window === "undefined" || !html) return null;
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
}

function copyClean(from: Node, to: Node, doc: Document) {
  from.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      to.appendChild(doc.createTextNode(child.textContent ?? ""));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const source = child as HTMLElement;
    if (DROPPED.has(source.tagName)) return;
    if (!ALLOWED.has(source.tagName)) {
      copyClean(source, to, doc);
      return;
    }
    const el = doc.createElement(source.tagName.toLowerCase());
    const align = (source.style.textAlign || source.getAttribute("align") || "").toLowerCase();
    if (ALIGNMENTS.has(align)) el.setAttribute("style", `text-align:${align}`);
    copyClean(source, el, doc);
    to.appendChild(el);
  });
}

/** Allow-list sanitiser: only formatting tags and text-align survive. */
export function sanitizeHtml(html: string): string {
  const body = parse(html);
  if (!body) return "";
  const out = body.ownerDocument.createElement("div");
  copyClean(body, out, body.ownerDocument);
  return out.innerHTML;
}

/** Plain-text version with line breaks, used for older workflows and empty checks. */
export function htmlToText(html: string): string {
  const body = parse(html);
  if (!body) return "";
  let text = "";
  const newline = () => {
    if (text && !text.endsWith("\n")) text += "\n";
  };
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent ?? "";
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = (child as Element).tagName;
      if (tag === "BR") {
        text += "\n";
        return;
      }
      const block = BLOCKS.has(tag);
      if (block) newline();
      if (tag === "LI") text += "• ";
      walk(child);
      if (block) newline();
    });
  };
  walk(body);
  return text.replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Sanitised HTML with {{name}} filled in and highlighted, for the preview pane. */
export function renderPreviewHtml(html: string, name: string): string {
  return sanitizeHtml(html).replace(
    nameTokenPattern(),
    () => `<mark class="rt-name">${escapeHtml(name)}</mark>`,
  );
}
