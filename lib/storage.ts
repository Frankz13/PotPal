import * as FileSystem from 'expo-file-system';

import type { Unit } from '@/lib/models';

const DATA_FILE = `${FileSystem.documentDirectory}units.json`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}unit-photos`;

export async function loadUnits(): Promise<Unit[]> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(DATA_FILE);
    if (!fileInfo.exists) {
      return [];
    }

    const raw = await FileSystem.readAsStringAsync(DATA_FILE);
    const parsed = JSON.parse(raw) as Unit[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
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
