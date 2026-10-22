/**
 * Renders untrusted email HTML in a sandboxed iframe: no scripts, an opaque origin
 * (no access to this app), links open in a new tab, and a CSP that only lets
 * images, inline styles and fonts load.
 */
export function EmailFrame({ html, title, className = "" }: { html: string; title: string; className?: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:">
<base target="_blank">
<style>body{margin:0;padding:24px;font:14px/1.6 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f1f1f;background:#fff;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#9b6527}</style>
</head><body>${html}</body></html>`;

  return (
    <iframe
      title={title}
      srcDoc={doc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className={`w-full rounded-xl border border-border bg-white ${className}`}
    />
  );
}
