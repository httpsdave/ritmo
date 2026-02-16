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
