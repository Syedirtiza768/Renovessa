/**
 * One-word markdown links in email bodies: [Portal](https://...), [Apply](...), [Renovessa](...).
 * HTML clients get a real hyperlink; plain-text fallback keeps just the label (no long URL).
 */

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text part: [Portal](url) → Portal */
export function linksToPlainText(body: string): string {
  return body.replace(MD_LINK, "$1");
}

/** Escape body text and turn [Label](url) into <a>Label</a>. */
export function linksToHtmlAnchors(body: string): string {
  let result = "";
  let last = 0;
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    result += escapeHtml(body.slice(last, match.index));
    result +=
      `<a href="${escapeHtml(match[2])}" style="color:#1a5f4a;text-decoration:underline">` +
      `${escapeHtml(match[1])}</a>`;
    last = match.index + match[0].length;
  }
  result += escapeHtml(body.slice(last));
  return result;
}

/** Turns a plain-text body (with optional [Label](url) links) into simple email HTML. */
export function bodyToEmailHtml(text: string): string {
  const withLinks = linksToHtmlAnchors(text);
  const paragraphs = withLinks
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return (
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;` +
    `font-size:15px;line-height:1.55;color:#1a1a1a">${paragraphs}</div>`
  );
}
