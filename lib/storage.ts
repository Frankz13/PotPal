import * as FileSystem from 'expo-file-system/legacy';

import { normalizeCare } from '@/lib/care';
import type { LocationFilter } from '@/lib/locations';
import type { Unit, UnitPhoto } from '@/lib/models';

const DATA_FILE = `${FileSystem.documentDirectory}units.json`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}unit-photos`;
const HOME_FILTER_FILE = `${FileSystem.documentDirectory}home-filter.json`;

export async function loadUnits(): Promise<Unit[]> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(DATA_FILE);
    if (!fileInfo.exists) {
      return [];
    }

    const raw = await FileSystem.readAsStringAsync(DATA_FILE);
    const parsed = JSON.parse(raw) as Array<Partial<Unit>>;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((unit) => ({
      ...unit,
      id: unit.id ?? `${Date.now()}`,
      name: unit.name ?? '',
      location: unit.location ?? '',
      species: unit.species ?? '',
      notes: unit.notes,
      createdAt: unit.createdAt ?? new Date().toISOString(),
      photos: (unit.photos ?? []).map((photo) => normalizePhoto(photo, unit.id ?? '')),
      care: normalizeCare(unit.care),
    }));
  } catch {
    return [];
  }
}

function normalizePhoto(photo: Partial<UnitPhoto>, unitId: string): UnitPhoto {
  return {
    id: photo.id ?? `${Date.now()}`,
    unitId: photo.unitId ?? unitId,
    path: photo.path ?? '',
    createdAt: photo.createdAt ?? '',
    createdAtISO: photo.createdAtISO ?? photo.createdAt ?? '',
  };
}

export async function saveUnits(units: Unit[]): Promise<void> {
  await FileSystem.writeAsStringAsync(DATA_FILE, JSON.stringify(units));
}

export async function persistPhoto(uri: string, unitId: string): Promise<string> {
  const photosDirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);

  if (!photosDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }

  const extensionMatch = /\.([a-zA-Z0-9]+)(\?|$)/.exec(uri);
  const extension = extensionMatch?.[1] ?? 'jpg';
  const filename = `${unitId}-${Date.now()}.${extension}`;
  const destination = `${PHOTOS_DIR}/${filename}`;

  await FileSystem.copyAsync({
    from: uri,
    to: destination,
  });

  return destination;
}

export async function loadHomeLocationFilter(): Promise<LocationFilter | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(HOME_FILTER_FILE);

    if (!fileInfo.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(HOME_FILTER_FILE);
    const parsed = JSON.parse(raw) as { filter?: LocationFilter };
    return parsed.filter ?? null;
  } catch {
    return null;
  }
}

export async function saveHomeLocationFilter(filter: LocationFilter): Promise<void> {
  await FileSystem.writeAsStringAsync(HOME_FILTER_FILE, JSON.stringify({ filter }));
}
