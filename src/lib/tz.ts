// Timezone helpers for dose scheduling.
//
// The patient's dose times are stored on the server as wall-clock "HH:MM"
// strings plus an IANA timezone (e.g. "Africa/Harare"). To fire a reminder we
// must resolve that wall-clock time into a real instant *in that zone*, not in
// whatever zone the device happens to be in. Everything below is pure and
// works without any extra dependency.

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const partsFormatter = (tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Wall-clock calendar/time fields of `at`, as seen in `tz`. */
export function zonedParts(at: Date, tz: string): ZonedParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter(tz).formatToParts(at)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map["year"]),
    month: Number(map["month"]),
    day: Number(map["day"]),
    hour: Number(map["hour"]) % 24,
    minute: Number(map["minute"]),
    second: Number(map["second"]),
  };
}

/** Offset of `tz` from UTC at instant `at`, in milliseconds (east = positive). */
export function tzOffsetMs(at: Date, tz: string): number {
  const p = zonedParts(at, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** "UTC+02:00" style label for the zone at the current instant. */
export function tzOffsetLabel(tz: string, at = new Date()): string {
  const mins = Math.round(tzOffsetMs(at, tz) / 60_000);
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * The instant at which the wall clock in `tz` reads `slot` ("HH:MM") on the
 * same calendar day that `base` falls on in `tz`. DST-safe: the offset is
 * re-resolved against the candidate instant.
 */
export function zonedSlotDate(slot: string, base: Date, tz: string): Date {
  const [h, m] = slot.split(":").map(Number);
  const day = zonedParts(base, tz);
  const wallUtc = Date.UTC(day.year, day.month - 1, day.day, h ?? 0, m ?? 0, 0, 0);

  let guess = new Date(wallUtc - tzOffsetMs(base, tz));
  for (let i = 0; i < 2; i++) {
    guess = new Date(wallUtc - tzOffsetMs(guess, tz));
  }
  return guess;
}

/** Shift `base` by whole calendar days in `tz` (keeps the wall-clock day math sane). */
export function addZonedDays(base: Date, days: number, tz: string): Date {
  const p = zonedParts(base, tz);
  const wallUtc = Date.UTC(p.year, p.month - 1, p.day + days, p.hour, p.minute, p.second);
  let guess = new Date(wallUtc - tzOffsetMs(base, tz));
  for (let i = 0; i < 2; i++) guess = new Date(wallUtc - tzOffsetMs(guess, tz));
  return guess;
}

/** Format an instant as the wall clock in `tz` — "08:00". */
export function fmtZonedClock(at: Date, tz: string): string {
  return new Intl.DateTimeFormat([], {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}
