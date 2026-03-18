/**
 * Variable Room Block Pricing Helper
 *
 * Calculates room prices based on:
 * 1. Day of week rates (Sun-Wed vs Thu-Sat)
 * 2. Extra person charges (adults, children, teens) per night
 */

export interface NightBreakdown {
  date: string;
  day: string;
  rate: number;
  type: 'sun_wed' | 'thu_sat';
}

export interface PriceBreakdown {
  nights: NightBreakdown[];
  room_total: number;
  extra_adults: number;
  extra_adult_rate: number;
  extra_adult_total: number;
  children: number;
  child_rate: number;
  child_total: number;
  teens: number;
  teen_rate: number;
  teen_total: number;
  extra_person_total: number;
  grand_total: number;
}

export interface RoomBlockPricing {
  price_per_night: number;
  price_type?: 'per_room' | 'per_person'; // per_room (default) or per_person
  rate_sun_wed?: number | null;
  rate_thu_sat?: number | null;
  base_occupancy?: number;
  extra_adult_per_night?: number | null;
  extra_child_per_night?: number | null;
  extra_teen_per_night?: number | null;
}

/**
 * Calculate room price with variable day-of-week rates
 * and extra person charges
 *
 * Supports two pricing modes:
 * - per_room (default): Rate is for the entire room, extra person charges apply
 * - per_person: Rate is per person per night, multiplied by occupancy
 */
export function calculateVariableRoomPrice(
  checkIn: string,
  checkOut: string,
  block: RoomBlockPricing,
  adults: number = 2,
  children: number = 0,
  teens: number = 0,
): { total: number; breakdown: PriceBreakdown } {
  const nightsBreakdown: NightBreakdown[] = [];
  let roomTotal = 0;

  // Determine pricing mode (default to per_room for backward compatibility)
  const priceType = block.price_type || 'per_room';

  // Use variable rates if available, otherwise fall back to price_per_night
  const rateSunWed = block.rate_sun_wed ?? block.price_per_night;
  const rateThuSat = block.rate_thu_sat ?? block.price_per_night;

  // Parse dates as local dates (avoid UTC timezone shift)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const current = parseLocalDate(checkIn);
  const end = parseLocalDate(checkOut);

  // For per_person pricing, calculate occupancy multiplier
  // Children/teens may have their own rates, or use the base rate
  const childRatePerPerson = Number(block.extra_child_per_night) || 0;
  const teenRatePerPerson = Number(block.extra_teen_per_night) || 0;

  while (current < end) {
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Sun=0, Mon=1, Tue=2, Wed=3 -> Sun-Wed rate
    // Thu=4, Fri=5, Sat=6 -> Thu-Sat rate
    const isThursdayToSaturday = dayOfWeek >= 4 && dayOfWeek <= 6;
    const baseNightRate = isThursdayToSaturday
      ? Number(rateThuSat)
      : Number(rateSunWed);

    let nightRate: number;
    if (priceType === 'per_person') {
      // Per-person pricing: rate × number of people
      // Adults pay the base rate, children/teens have their own rates (0 = FREE)
      const adultTotal = baseNightRate * adults;
      // Child/teen rate of 0 = FREE (per client requirement)
      const childTotal = children * childRatePerPerson;
      const teenTotal = teens * teenRatePerPerson;
      nightRate = adultTotal + childTotal + teenTotal;
    } else {
      // Per-room pricing: rate is for the entire room
      nightRate = baseNightRate;
    }

    nightsBreakdown.push({
      date: current.toISOString().split('T')[0],
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      rate: priceType === 'per_person' ? baseNightRate : nightRate, // Store base rate in breakdown
      type: isThursdayToSaturday ? 'thu_sat' : 'sun_wed',
    });

    roomTotal += nightRate;
    current.setDate(current.getDate() + 1);
  }

  const nights = nightsBreakdown.length;

  // Extra person charges only apply in per_room mode
  let extraAdults = 0;
  let extraAdultRate = 0;
  let extraAdultTotal = 0;
  let childRate = 0;
  let childTotal = 0;
  let teenRate = 0;
  let teenTotal = 0;
  let extraPersonTotal = 0;

  if (priceType === 'per_room') {
    // Per-room mode: extra person charges apply for guests beyond base occupancy
    const baseOccupancy = block.base_occupancy || 2;
    extraAdults = Math.max(0, adults - baseOccupancy);
    extraAdultRate = Number(block.extra_adult_per_night) || 0;
    childRate = Number(block.extra_child_per_night) || 0;
    teenRate = Number(block.extra_teen_per_night) || 0;

    extraAdultTotal = extraAdults * extraAdultRate * nights;
    childTotal = children * childRate * nights;
    teenTotal = teens * teenRate * nights;
    extraPersonTotal = extraAdultTotal + childTotal + teenTotal;
  }
  // In per_person mode, extra person charges are already included in roomTotal

  return {
    total: roomTotal + extraPersonTotal,
    breakdown: {
      nights: nightsBreakdown,
      room_total: roomTotal,
      extra_adults: extraAdults,
      extra_adult_rate: extraAdultRate,
      extra_adult_total: extraAdultTotal,
      children,
      child_rate: childRate,
      child_total: childTotal,
      teens,
      teen_rate: teenRate,
      teen_total: teenTotal,
      extra_person_total: extraPersonTotal,
      grand_total: roomTotal + extraPersonTotal,
    },
  };
}

/**
 * Calculate simple price for display (total for given nights)
 * Uses average of Sun-Wed and Thu-Sat rates for estimation
 *
 * @param block - Room block pricing info
 * @param nights - Number of nights
 * @param occupancy - Optional occupancy for per_person pricing (default: 2)
 */
export function calculateEstimatedPrice(
  block: RoomBlockPricing,
  nights: number,
  occupancy: number = 2,
): number {
  const rateSunWed = block.rate_sun_wed ?? block.price_per_night;
  const rateThuSat = block.rate_thu_sat ?? block.price_per_night;

  // Simple average for estimation (4 Sun-Wed days + 3 Thu-Sat days per week)
  const avgRate = (Number(rateSunWed) * 4 + Number(rateThuSat) * 3) / 7;

  // For per_person pricing, multiply by occupancy
  const priceType = block.price_type || 'per_room';
  const multiplier = priceType === 'per_person' ? occupancy : 1;

  return Math.round(avgRate * nights * multiplier * 100) / 100;
}

/**
 * Check if room block uses variable pricing
 */
export function hasVariablePricing(block: RoomBlockPricing): boolean {
  return !!(block.rate_sun_wed && block.rate_thu_sat);
}

/**
 * Get the effective rate for a specific date
 */
export function getRateForDate(
  block: RoomBlockPricing,
  date: Date | string,
): number {
  let d: Date;
  if (typeof date === 'string') {
    // Parse as local date to avoid timezone shift
    const [year, month, day] = date.split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = date;
  }
  const dayOfWeek = d.getDay();
  const isThursdayToSaturday = dayOfWeek >= 4 && dayOfWeek <= 6;

  const rateSunWed = block.rate_sun_wed ?? block.price_per_night;
  const rateThuSat = block.rate_thu_sat ?? block.price_per_night;

  return isThursdayToSaturday ? Number(rateThuSat) : Number(rateSunWed);
}
