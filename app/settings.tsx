import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Unit, UnitPhoto } from '@/lib/models';
import { loadUnits, saveUnits, UNIT_PHOTOS_DIR } from '@/lib/storage';
import { base64ToBytes, bytesToBase64, bytesToUtf8, createZipBase64, unzipBase64, utf8ToBytes } from '@/lib/zip';

type UnitsBackupV1 = {
  version: 1;
  exportedAtISO: string;
  units: Unit[];
};

type FullBackupPhoto = {
  id: string;
  createdAt: string;
  createdAtISO?: string;
  backupFile: string;
  path?: string;
};

type UnitsBackupV2 = {
  version: 2;
  exportedAtISO: string;
  units: Array<Omit<Unit, 'photos'> & { photos: FullBackupPhoto[] }>;
};

type BusyAction = 'export-json' | 'import-json' | 'export-full' | 'import-full' | 'repair-photos' | null;

function formatDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function getBackupFilename(now: Date): string {
  const year = now.getFullYear();
  const month = formatDatePart(now.getMonth() + 1);
  const day = formatDatePart(now.getDate());
  const hours = formatDatePart(now.getHours());
  const minutes = formatDatePart(now.getMinutes());

  return `potpal-backup-${year}${month}${day}-${hours}${minutes}.json`;
}

function getFullBackupFilename(now: Date): string {
  return getBackupFilename(now).replace('.json', '.zip');
}

function isValidBackup(data: unknown): data is { units: unknown[] } {
  return typeof data === 'object' && data !== null && Array.isArray((data as { units?: unknown[] }).units);
}

function extensionFromPath(path: string): string {
  const cleanPath = path.split('?')[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(cleanPath);
  return (match?.[1] ?? 'jpg').toLowerCase();
}

function normalizeReadUri(path: string): string {
  if (path.startsWith('file://')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `file://${path}`;
  }

  return path;
}

function isUnitPhotoFile(path: string): boolean {
  const normalizedPath = normalizeReadUri(path);
  return normalizedPath.startsWith(`${UNIT_PHOTOS_DIR}/`) || normalizedPath === UNIT_PHOTOS_DIR;
}

async function ensurePhotosDirectory(): Promise<void> {
  const photosDirInfo = await FileSystem.getInfoAsync(UNIT_PHOTOS_DIR);
  if (!photosDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(UNIT_PHOTOS_DIR, { intermediates: true });
  }
}

function normalizeImportedUnit(unit: any): Unit {
  const nowISO = new Date().toISOString();
  const id = typeof unit?.id === 'string' ? unit.id : `${Date.now()}`;
  const rawPhotos = Array.isArray(unit?.photos) ? unit.photos : [];
  const photos: UnitPhoto[] = rawPhotos.map((photo: any, index: number) => {
    const createdAtISO = typeof photo?.createdAtISO === 'string' ? photo.createdAtISO : nowISO;

    return {
      id: typeof photo?.id === 'string' ? photo.id : `${Date.now()}-${index}`,
      unitId: id,
      path: typeof photo?.path === 'string' ? photo.path : '',
      createdAt: typeof photo?.createdAt === 'string' ? photo.createdAt : createdAtISO,
      createdAtISO,
    };
  });

  return {
    id,
    name: typeof unit?.name === 'string' ? unit.name : '',
    species: typeof unit?.species === 'string' ? unit.species : '',
    location: typeof unit?.location === 'string' ? unit.location : '',
    notes: typeof unit?.notes === 'string' ? unit.notes : undefined,
    createdAt: typeof unit?.createdAt === 'string' ? unit.createdAt : nowISO,
    photos,
    coverPhotoId: typeof unit?.coverPhotoId === 'string' ? unit.coverPhotoId : photos[0]?.id,
    care: unit?.care,
  };
}

export default function SettingsScreen() {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const onExportBackup = useCallback(async () => {
    try {
      setBusyAction('export-json');

      const units = await loadUnits();
      const backup: UnitsBackupV1 = {
        version: 1,
        exportedAtISO: new Date().toISOString(),
        units,
      };

      const json = JSON.stringify(backup, null, 2);
      const targetDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

      if (!targetDir) {
        throw new Error('No writable directory available.');
      }

      const filename = getBackupFilename(new Date());
      const fileUri = `${targetDir}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, json);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device.');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export backup (JSON)',
      });

      Alert.alert('Backup exported', 'Your backup file is ready to share or save.');
    } catch {
      Alert.alert('Export failed', 'Unable to export backup. Please try again.');
    } finally {
      setBusyAction(null);
    }
  }, []);

  const applyImportedBackup = useCallback(
    async (units: unknown[]) => {
      try {
        setBusyAction('import-json');
        await saveUnits(units as Unit[]);
        Alert.alert('Import complete', 'Your units were restored from backup.', [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]);
      } catch {
        Alert.alert('Import failed', 'Unable to apply this backup. Please try again.');
      } finally {
        setBusyAction(null);
      }
    },
    [router],
  );

  const onImportBackup = useCallback(async () => {
    try {
      setBusyAction('import-json');

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setBusyAction(null);
        return;
      }

      const pickedFile = result.assets[0];
      const raw = await FileSystem.readAsStringAsync(pickedFile.uri);

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        Alert.alert('Invalid backup', 'Selected file is not valid JSON.');
        setBusyAction(null);
        return;
      }

      if (!isValidBackup(parsed)) {
        Alert.alert('Invalid backup', 'Selected file is missing required units data.');
        setBusyAction(null);
        return;
      }

      Alert.alert('Import backup', 'Import will replace your current data. Continue?', [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setBusyAction(null),
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => void applyImportedBackup(parsed.units),
        },
      ]);
    } catch {
      Alert.alert('Import failed', 'Unable to import backup. Please try again.');
      setBusyAction(null);
    }
  }, [applyImportedBackup]);

  const onExportFullBackup = useCallback(async () => {
    try {
      setBusyAction('export-full');
      const units = await loadUnits();
      const zipFiles: Array<{ path: string; data: Uint8Array }> = [];
      let totalPhotos = 0;
      let includedPhotos = 0;

      const fullUnits = await Promise.all(
        units.map(async (unit) => {
          const photos = await Promise.all(
            unit.photos.map(async (photo) => {
              totalPhotos += 1;
              const ext = extensionFromPath(photo.path);
              const backupFile = `photos/${photo.id}.${ext}`;
              const sourceUri = normalizeReadUri(photo.path);

              try {
                const info = await FileSystem.getInfoAsync(sourceUri);
                if (info.exists) {
                  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  zipFiles.push({ path: backupFile, data: base64ToBytes(base64) });
                  includedPhotos += 1;
                }
              } catch {
                // missing photo files are tolerated
              }

              return {
                id: photo.id,
                createdAt: photo.createdAt,
                createdAtISO: photo.createdAtISO,
                backupFile,
                path: photo.path,
              };
            }),
          );

          return {
            ...unit,
            photos,
            coverPhotoId: unit.coverPhotoId,
          };
        }),
      );

      const backup: UnitsBackupV2 = {
        version: 2,
        exportedAtISO: new Date().toISOString(),
        units: fullUnits,
      };

      zipFiles.push({ path: 'backup.json', data: utf8ToBytes(JSON.stringify(backup, null, 2)) });
      const zipBase64 = createZipBase64(zipFiles);

      const targetDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!targetDir) {
        throw new Error('No writable directory available.');
      }

      const filename = getFullBackupFilename(new Date());
      const fileUri = `${targetDir}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device.');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/zip',
        dialogTitle: 'Export FULL backup (ZIP)',
      });

      Alert.alert(
        'FULL backup exported',
        `Exported ${units.length} units. Included ${includedPhotos}/${totalPhotos} photos (Skipped ${totalPhotos - includedPhotos}).`,
      );
    } catch {
      Alert.alert('Export failed', 'Unable to export FULL backup. Please try again.');
    } finally {
      setBusyAction(null);
    }
  }, []);

  const onRepairPhotos = useCallback(async () => {
    try {
      setBusyAction('repair-photos');
      await ensurePhotosDirectory();
      const units = await loadUnits();

      let totalWithPath = 0;
      let repaired = 0;
      let unreadable = 0;

      const rewrittenUnits: Unit[] = await Promise.all(
        units.map(async (unit) => {
          const photos = await Promise.all(
            unit.photos.map(async (photo) => {
              if (!photo.path) {
                return photo;
              }

              totalWithPath += 1;
              const sourceUri = normalizeReadUri(photo.path);

              try {
                const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
                if (!sourceInfo.exists) {
                  unreadable += 1;
                  return photo;
                }

                if (isUnitPhotoFile(sourceUri)) {
                  return photo;
                }

                const ext = extensionFromPath(sourceUri);
                const destination = `${UNIT_PHOTOS_DIR}/${photo.id}.${ext}`;

                try {
                  await FileSystem.copyAsync({ from: sourceUri, to: destination });
                } catch {
                  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  await FileSystem.writeAsStringAsync(destination, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                }

                const migratedInfo = await FileSystem.getInfoAsync(destination);
                if (!migratedInfo.exists) {
                  unreadable += 1;
                  return photo;
                }

                repaired += 1;
                return {
                  ...photo,
                  path: destination,
                };
              } catch {
                unreadable += 1;
                return photo;
              }
            }),
          );

          return {
            ...unit,
            photos,
          };
        }),
      );

      await saveUnits(rewrittenUnits);
      Alert.alert('Repair complete', `Repaired ${repaired}/${totalWithPath} photos.\nSkipped ${unreadable} (unreadable).`);
    } catch {
      Alert.alert('Repair failed', 'Unable to repair photos. Please try again.');
    } finally {
      setBusyAction(null);
    }
  }, []);

  const onImportFullBackup = useCallback(async () => {
    try {
      setBusyAction('import-full');

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setBusyAction(null);
        return;
      }

      const pickedFile = result.assets[0];

      Alert.alert('Import FULL backup', 'Import will replace your current data. Continue?', [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setBusyAction(null),
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const zipBase64 = await FileSystem.readAsStringAsync(pickedFile.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const zipFiles = unzipBase64(zipBase64);
                const backupEntry = zipFiles.find((entry) => entry.path === 'backup.json');

                if (!backupEntry) {
                  Alert.alert('Invalid backup', 'backup.json was not found in this ZIP file.');
                  setBusyAction(null);
                  return;
                }

                const parsed = JSON.parse(bytesToUtf8(backupEntry.data)) as { units?: unknown[] };
                if (!Array.isArray(parsed.units)) {
                  Alert.alert('Invalid backup', 'Selected file is missing required units data.');
                  setBusyAction(null);
                  return;
                }

                const photosDirInfo = await FileSystem.getInfoAsync(UNIT_PHOTOS_DIR);
                if (!photosDirInfo.exists) {
                  await FileSystem.makeDirectoryAsync(UNIT_PHOTOS_DIR, { intermediates: true });
                }

                let restoredPhotos = 0;
                let totalPhotos = 0;

                const rewrittenUnits = await Promise.all(
                  parsed.units.map(async (rawUnit: any) => {
                    const unitId = typeof rawUnit?.id === 'string' ? rawUnit.id : `${Date.now()}`;
                    const rawPhotos = Array.isArray(rawUnit?.photos) ? rawUnit.photos : [];

                    const photos: UnitPhoto[] = await Promise.all(
                      rawPhotos.map(async (photo: any, index: number) => {
                        totalPhotos += 1;
                        const nowISO = new Date().toISOString();
                        const photoId = typeof photo?.id === 'string' ? photo.id : `${Date.now()}-${index}`;
                        const backupFile = typeof photo?.backupFile === 'string' ? photo.backupFile : '';
                        const ext = extensionFromPath(backupFile || photoId);
                        const destination = `${UNIT_PHOTOS_DIR}/${photoId}.${ext}`;
                        const photoEntry = zipFiles.find((entry) => entry.path === backupFile);
                        let path = '';

                        if (photoEntry) {
                          try {
                            const base64Data = bytesToBase64(photoEntry.data);
                            await FileSystem.writeAsStringAsync(destination, base64Data, {
                              encoding: FileSystem.EncodingType.Base64,
                            });
                            const restoredInfo = await FileSystem.getInfoAsync(destination);
                            if (restoredInfo.exists) {
                              path = destination;
                              restoredPhotos += 1;
                            }
                          } catch {
                            path = '';
                          }
                        }

                        const createdAtISO = typeof photo?.createdAtISO === 'string' ? photo.createdAtISO : nowISO;
                        return {
                          id: photoId,
                          unitId,
                          path,
                          createdAt: typeof photo?.createdAt === 'string' ? photo.createdAt : createdAtISO,
                          createdAtISO,
                        };
                      }),
                    );

                    return normalizeImportedUnit({ ...rawUnit, id: unitId, photos });
                  }),
                );

                await saveUnits(rewrittenUnits);

                Alert.alert('Import complete', `Imported ${rewrittenUnits.length} units. Restored ${restoredPhotos}/${totalPhotos} photos.`, [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/'),
                  },
                ]);
              } catch {
                Alert.alert('Import failed', 'Unable to import FULL backup. Please try again.');
              } finally {
                setBusyAction(null);
              }
            })();
          },
        },
      ]);
    } catch {
      Alert.alert('Import failed', 'Unable to import FULL backup. Please try again.');
      setBusyAction(null);
    }
  }, [router]);

  const disabled = busyAction !== null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Backup your units data as JSON.</Text>

        <Pressable style={[styles.button, disabled && styles.buttonDisabled]} disabled={disabled} onPress={() => void onExportBackup()}>
          <Text style={styles.buttonText}>{busyAction === 'export-json' ? 'Exporting…' : 'Export backup (JSON)'}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.importButton, disabled && styles.buttonDisabled]}
          disabled={disabled}
          onPress={() => void onImportBackup()}>
          <Text style={styles.buttonText}>{busyAction === 'import-json' ? 'Importing…' : 'Import backup (JSON)'}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.fullButton, disabled && styles.buttonDisabled]}
          disabled={disabled}
          onPress={() => void onExportFullBackup()}>
          <Text style={styles.buttonText}>{busyAction === 'export-full' ? 'Exporting…' : 'Export FULL backup (ZIP)'}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.importFullButton, disabled && styles.buttonDisabled]}
          disabled={disabled}
          onPress={() => void onImportFullBackup()}>
          <Text style={styles.buttonText}>{busyAction === 'import-full' ? 'Importing…' : 'Import FULL backup (ZIP)'}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.repairButton, disabled && styles.buttonDisabled]}
          disabled={disabled}
          onPress={() => void onRepairPhotos()}>
          <Text style={styles.buttonText}>{busyAction === 'repair-photos' ? 'Repairing…' : 'Repair photos'}</Text>
        </Pressable>

        {busyAction ? (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color="#2d7a46" />
            <Text style={styles.busyText}>
              {busyAction === 'repair-photos' ? 'Repairing...' : busyAction.startsWith('export') ? 'Exporting...' : 'Importing...'}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#4b5563',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2d7a46',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importButton: {
    backgroundColor: '#1f6feb',
  },
  fullButton: {
    backgroundColor: '#4b5563',
  },
  importFullButton: {
    backgroundColor: '#7c3aed',
  },
  repairButton: {
    backgroundColor: '#b45309',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
  busyRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busyText: {
    color: '#374151',
    fontWeight: '600',
  },
});
