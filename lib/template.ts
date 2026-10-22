export const NAME_TOKEN = "{{name}}";

/** What the workflow puts in place of {{name}} when a row has no name. */
export const NAME_FALLBACK = "there";

/** Matches {{name}}, {{ name }}, {{Name}}. The n8n workflow must use the same rule. */
const TOKEN_SOURCE = String.raw`\{\{\s*name\s*\}\}`;

export interface TemplateSegment {
  text: string;
  personalised: boolean;
}

export function nameTokenPattern(): RegExp {
  return new RegExp(TOKEN_SOURCE, "gi");
}

export function hasNameToken(template: string): boolean {
  return new RegExp(TOKEN_SOURCE, "i").test(template);
}

/** Splits a template into literal text and substituted-name segments, for highlighting. */
export function renderSegments(template: string, name: string): TemplateSegment[] {
  return template
    .split(new RegExp(`(${TOKEN_SOURCE})`, "gi"))
    .filter((part) => part !== "")
    .map((part) =>
      new RegExp(`^${TOKEN_SOURCE}$`, "i").test(part)
        ? { text: name, personalised: true }
        : { text: part, personalised: false },
    );
}
