// 呼出側が渡した offset つきの ISO 8601 の時刻を、同じ基準の整数（ミリ秒）にする（末端の純粋な関数）。
// 核は時計を読まない（S4）。この関数は文字列を解釈するだけで、現在時刻を取らない。解釈できなければ null（時刻を推測しない）。
const INSTANT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

function daysInMonth(year, month) {
  return month === 2 && isLeap(year) ? 29 : MONTH_DAYS[month - 1];
}

// 1970-01-01 からの日数（暦の計算だけ）。
function daysFromCivil(year, month, day) {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

const inRange = (value, min, max) => value >= min && value <= max;

// offset を秒にする。範囲外（時 0〜23・分 0〜59 の外）は null。Z は 0。
function offsetSecondsOf(sign, hourText, minuteText) {
  const hour = hourText === undefined ? 0 : Number(hourText);
  const minute = minuteText === undefined ? 0 : Number(minuteText);
  if (!inRange(hour, 0, 23) || !inRange(minute, 0, 59)) return null;
  return (sign === "-" ? -1 : 1) * (hour * 3600 + minute * 60);
}

const isValidDate = (year, month, day) => inRange(month, 1, 12) && inRange(day, 1, daysInMonth(year, month));
const isValidClock = (hour, minute, second) => inRange(hour, 0, 23) && inRange(minute, 0, 59) && inRange(second, 0, 59);

export function parseInstant(text) {
  const match = typeof text === "string" ? INSTANT_RE.exec(text) : null;
  if (match === null) return null;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const offsetSeconds = offsetSecondsOf(match[8], match[9], match[10]);
  if (offsetSeconds === null || !isValidDate(year, month, day) || !isValidClock(hour, minute, second)) return null;
  const seconds = daysFromCivil(year, month, day) * 86400 + hour * 3600 + minute * 60 + second - offsetSeconds;
  const millis = Number(`${match[7] ?? ""}000`.slice(0, 3));
  return (seconds * 1000 + millis) || 0;
}
