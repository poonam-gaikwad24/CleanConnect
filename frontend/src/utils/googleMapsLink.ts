/**
 * Builds an external Google Maps *search* URL (no Google Maps API, no API
 * key, no geocoding) so citizens can independently look up a toilet's
 * registered address on Google Maps for discovery/navigation.
 *
 * This is only a search query built from CleanConnect's own registered
 * `location` text — it does not assert that Google Maps' result is the
 * exact same physical toilet CleanConnect has on record.
 */
export function buildGoogleMapsSearchUrl(location: string): string {
  const query = `Public toilet near ${location}, Pune, Maharashtra`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
