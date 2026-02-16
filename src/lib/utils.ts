/**
 * Convert lat/lng (degrees) to a 3D position on a sphere of given radius.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 1
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

/**
 * Extract a channel ID from an href like "/listen/kutx-98-9/vbFsCngB"
 */
export function extractChannelId(href: string | undefined): string {
  if (!href) return "";
  const parts = href.split("/");
  return parts[parts.length - 1];
}

/**
 * Extract a place ID from a url like "/visit/austin-tx/Aq7xeIiB"
 */
export function extractPlaceId(url: string | undefined): string {
  if (!url) return "";
  const parts = url.split("/");
  return parts[parts.length - 1];
}

/**
 * Debounce utility
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get approximate timezone from coordinates using Intl API.
 * This uses a heuristic based on longitude for approximate offset.
 */
export function getTimezoneFromCoords(lat: number, lng: number): string {
  // Use longitude to estimate UTC offset (roughly 15° per hour)
  const estimatedOffset = Math.round(lng / 15);
  
  // Try to find an IANA timezone that matches the coordinates
  // This is a simplified approach - a real implementation would use a timezone boundary library
  const offsetHours = estimatedOffset >= 0 ? `+${estimatedOffset}` : `${estimatedOffset}`;
  
  // Get a rough timezone identifier based on offset
  // This is approximate but works for displaying local time
  const timezones: Record<number, string> = {
    '-12': 'Pacific/Tarawa',
    '-11': 'Pacific/Pago_Pago',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Caracas',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'Europe/London',
    '1': 'Europe/Paris',
    '2': 'Europe/Athens',
    '3': 'Europe/Moscow',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Singapore',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Noumea',
    '12': 'Pacific/Auckland',
  };
  
  return timezones[estimatedOffset] || 'UTC';
}
