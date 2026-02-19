export const LOCATION_PRESETS = ['Veranda', 'Serra', 'Casa', 'Marciapiede'] as const;

export type UnitLocationPreset = (typeof LOCATION_PRESETS)[number];
export type LocationFilter = 'All' | UnitLocationPreset;

export const LOCATION_FILTER_OPTIONS: LocationFilter[] = ['All', ...LOCATION_PRESETS];

export function matchesLocationFilter(location: string, filter: LocationFilter): boolean {
  if (filter === 'All') {
    return true;
  }

  return location === filter;
}
