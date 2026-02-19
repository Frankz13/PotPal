export const LOCATION_PRESETS = ['Veranda', 'Serra', 'Casa', 'Marciapiede'] as const;

export type UnitLocationPreset = (typeof LOCATION_PRESETS)[number];
export type LocationFilter = 'All' | string;

const ALL_FILTER = 'All';

export const LOCATION_FILTER_OPTIONS: LocationFilter[] = [ALL_FILTER, ...LOCATION_PRESETS];

export function getLocationFilterOptions(locations: string[], customLimit = 8): LocationFilter[] {
  const customLocations = Array.from(
    new Set(
      locations
        .map((location) => location.trim())
        .filter((location) => Boolean(location) && !LOCATION_PRESETS.includes(location as UnitLocationPreset)),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .slice(0, customLimit);

  return [...LOCATION_FILTER_OPTIONS, ...customLocations];
}

export function matchesLocationFilter(location: string, filter: LocationFilter): boolean {
  if (filter === ALL_FILTER) {
    return true;
  }

  return location === filter;
}
