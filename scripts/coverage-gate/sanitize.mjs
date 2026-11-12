// Makes free text safe for the three surfaces that show a user's file names. Pure.
// Control characters = C0, DEL and C1.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/gu;

export function sanitizeSummaryText(text) {
  return text.replace(CONTROL, "?");
}

// GitHub workflow-command escapes: % -> %25, CR -> %0D, LF -> %0A; any other control character -> ?.
export function sanitizeNotice(text) {
  return text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A").replace(CONTROL, "?");
}

// A path inside one code span: a backtick inside would end the span, so it becomes an apostrophe.
export function summaryPath(path) {
  return `\`${sanitizeSummaryText(path).replaceAll("`", "'")}\``;
}
