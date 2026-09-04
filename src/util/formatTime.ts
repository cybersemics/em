const MINUTES_PER_DAY = 24 * 60

/**
 * Formats minutes since midnight as a clock time, e.g. 600 → "10:00" and 810 → "1:30" (12-hour) or "13:30" (24-hour).
 * Pass null for hour12 to follow the locale's hour cycle. The day period (am/pm) is omitted by default to keep the
 * time compact enough to stand in for a bullet; set dayPeriod to append it and make a 12-hour time unambiguous.
 */
const formatTime = (
  minutes: number,
  {
    hour12,
    dayPeriod,
  }: {
    /** Whether to use a 12-hour clock, or null to follow the locale. */
    hour12: boolean | null
    /** Append am/pm to a 12-hour time. */
    dayPeriod?: boolean
  },
): string => {
  const minutesOfDay = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours24 = Math.floor(minutesOfDay / 60)
  const use12 = hour12 ?? new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? true
  // 24-hour locales conventionally zero-pad the hour (09:00), 12-hour locales do not (9:00).
  const hours = use12 ? `${hours24 % 12 || 12}` : `${hours24}`.padStart(2, '0')
  const period = use12 && dayPeriod ? (hours24 < 12 ? ' am' : ' pm') : ''
  return `${hours}:${`${minutesOfDay % 60}`.padStart(2, '0')}${period}`
}

export default formatTime
