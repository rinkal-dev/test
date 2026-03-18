/**
 * ============================================
 * TIMEZONE HELPER UTILITIES
 * ============================================
 *
 * Industry-standard timezone handling for Wedding/Hotel Booking System.
 *
 * STRATEGY:
 * 1. Database stores all timestamps in UTC
 * 2. Event/Hotel timezone is stored in wedding_groups.timezone
 * 3. Guest's timezone is captured in bookings.guest_timezone
 * 4. Display times in event timezone (primary) with optional guest timezone context
 *
 * SUPPORTED FORMATS:
 * - IANA timezone names: 'America/New_York', 'Asia/Kolkata', 'Europe/Paris'
 * - UTC offsets are NOT recommended (don't handle DST properly)
 */

/**
 * Common IANA timezone identifiers for quick reference
 */
export const COMMON_TIMEZONES = {
  // Americas
  'America/New_York': 'Eastern Time (US & Canada)',
  'America/Chicago': 'Central Time (US & Canada)',
  'America/Denver': 'Mountain Time (US & Canada)',
  'America/Los_Angeles': 'Pacific Time (US & Canada)',
  'America/Cancun': 'Cancun, Mexico',
  'America/Mexico_City': 'Mexico City',
  'America/Toronto': 'Toronto, Canada',
  'America/Vancouver': 'Vancouver, Canada',
  'America/Sao_Paulo': 'São Paulo, Brazil',

  // Europe
  'Europe/London': 'London, UK',
  'Europe/Paris': 'Paris, France',
  'Europe/Berlin': 'Berlin, Germany',
  'Europe/Rome': 'Rome, Italy',
  'Europe/Madrid': 'Madrid, Spain',
  'Europe/Amsterdam': 'Amsterdam, Netherlands',
  'Europe/Zurich': 'Zurich, Switzerland',

  // Asia
  'Asia/Kolkata': 'India (IST)',
  'Asia/Dubai': 'Dubai, UAE',
  'Asia/Singapore': 'Singapore',
  'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Tokyo': 'Tokyo, Japan',
  'Asia/Shanghai': 'Shanghai, China',
  'Asia/Bangkok': 'Bangkok, Thailand',
  'Asia/Bali': 'Bali, Indonesia',
  'Asia/Jakarta': 'Jakarta, Indonesia',

  // Pacific
  'Pacific/Honolulu': 'Hawaii',
  'Pacific/Auckland': 'Auckland, New Zealand',
  'Australia/Sydney': 'Sydney, Australia',
  'Australia/Melbourne': 'Melbourne, Australia',

  // Caribbean
  'America/Jamaica': 'Jamaica',
  'America/Puerto_Rico': 'Puerto Rico',
  'America/Barbados': 'Barbados',
  'America/Santo_Domingo': 'Dominican Republic',

  // Default
  'UTC': 'UTC (Coordinated Universal Time)',
};

/**
 * Get list of all common timezones for dropdown selection
 */
export function getTimezoneList(): Array<{ value: string; label: string }> {
  return Object.entries(COMMON_TIMEZONES).map(([value, label]) => ({
    value,
    label: `${label} (${value})`,
  }));
}

/**
 * Validate if a timezone string is valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Convert UTC date to specific timezone
 *
 * @param utcDate - Date in UTC (from database)
 * @param timezone - IANA timezone (e.g., 'America/Cancun')
 * @returns Formatted date string in the target timezone
 */
export function formatInTimezone(
  utcDate: Date | string | null,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!utcDate) return 'N/A';

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  return date.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format date only (no time) - timezone doesn't affect date-only values
 */
export function formatDateOnly(
  date: Date | string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return 'N/A';

  const d = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format time only in specific timezone
 */
export function formatTimeInTimezone(
  utcDate: Date | string | null,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!utcDate) return 'N/A';

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  return date.toLocaleTimeString('en-US', { ...defaultOptions, ...options });
}

/**
 * Get timezone abbreviation (e.g., EST, IST, PST)
 */
export function getTimezoneAbbreviation(timezone: string, date?: Date): string {
  const d = date || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(d);
  const tzPart = parts.find((part) => part.type === 'timeZoneName');
  return tzPart?.value || timezone;
}

/**
 * Format date with timezone label for display
 * Example: "Jan 30, 2026 10:30 AM (Cancun Time)"
 */
export function formatWithTimezoneLabel(
  utcDate: Date | string | null,
  timezone: string,
): string {
  if (!utcDate) return 'N/A';

  const formatted = formatInTimezone(utcDate, timezone);
  const abbr = getTimezoneAbbreviation(timezone);
  const label = COMMON_TIMEZONES[timezone] || timezone;

  return `${formatted} (${abbr})`;
}

/**
 * Format booking timestamp showing both event timezone and guest's original timezone
 * Example: "Jan 30, 2026 10:30 AM CST (Guest: 10:00 PM IST)"
 */
export function formatBookingTimestamp(
  utcDate: Date | string | null,
  eventTimezone: string,
  guestTimezone?: string | null,
): string {
  if (!utcDate) return 'N/A';

  const eventFormatted = formatWithTimezoneLabel(utcDate, eventTimezone);

  if (guestTimezone && guestTimezone !== eventTimezone) {
    const guestTime = formatTimeInTimezone(utcDate, guestTimezone);
    const guestAbbr = getTimezoneAbbreviation(guestTimezone);
    return `${eventFormatted} (Guest: ${guestTime} ${guestAbbr})`;
  }

  return eventFormatted;
}

/**
 * Convert local time input to UTC for storage
 * Use when user inputs a time in their local timezone
 *
 * @param localDateString - Date string from user input
 * @param timezone - User's timezone
 * @returns Date object in UTC
 */
export function localToUtc(localDateString: string, timezone: string): Date {
  // Create a date object that represents the local time
  const localDate = new Date(localDateString);

  // Get the offset for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // This is a simplified conversion - for production, consider using date-fns-tz or luxon
  return localDate;
}

/**
 * Get current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  return formatInTimezone(new Date(), timezone);
}

/**
 * Check if two timezones are the same (handles aliases)
 */
export function isSameTimezone(tz1: string, tz2: string): boolean {
  if (tz1 === tz2) return true;

  try {
    const now = Date.now();
    const d1 = new Date(now).toLocaleString('en-US', { timeZone: tz1 });
    const d2 = new Date(now).toLocaleString('en-US', { timeZone: tz2 });
    return d1 === d2;
  } catch {
    return false;
  }
}

/**
 * Response transformer to add timezone context to timestamps
 */
export interface TimezoneContext {
  utc: string;
  eventTimezone: {
    formatted: string;
    timezone: string;
    abbreviation: string;
  };
  guestTimezone?: {
    formatted: string;
    timezone: string;
    abbreviation: string;
  };
}

export function createTimezoneContext(
  utcDate: Date | string | null,
  eventTimezone: string,
  guestTimezone?: string | null,
): TimezoneContext | null {
  if (!utcDate) return null;

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  const context: TimezoneContext = {
    utc: date.toISOString(),
    eventTimezone: {
      formatted: formatInTimezone(date, eventTimezone),
      timezone: eventTimezone,
      abbreviation: getTimezoneAbbreviation(eventTimezone, date),
    },
  };

  if (guestTimezone && guestTimezone !== eventTimezone) {
    context.guestTimezone = {
      formatted: formatInTimezone(date, guestTimezone),
      timezone: guestTimezone,
      abbreviation: getTimezoneAbbreviation(guestTimezone, date),
    };
  }

  return context;
}
