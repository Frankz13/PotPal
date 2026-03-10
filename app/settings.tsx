import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Unit } from '@/lib/models';
import { loadUnits, saveUnits } from '@/lib/storage';

type UnitsBackupV1 = {
  version: 1;
  exportedAtISO: string;
  units: Unit[];
};

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

function isValidBackup(data: unknown): data is { units: unknown[] } {
  return typeof data === 'object' && data !== null && Array.isArray((data as { units?: unknown[] }).units);
}

export default function SettingsScreen() {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<'export' | 'import' | null>(null);

  const onExportBackup = useCallback(async () => {
    try {
      setBusyAction('export');

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
        setBusyAction('import');
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
      setBusyAction('import');

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

  const exportDisabled = busyAction !== null;
  const importDisabled = busyAction !== null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Backup your units data as JSON.</Text>

        <Pressable
          style={[styles.button, exportDisabled && styles.buttonDisabled]}
          disabled={exportDisabled}
          onPress={() => void onExportBackup()}>
          <Text style={styles.buttonText}>{busyAction === 'export' ? 'Exporting…' : 'Export backup (JSON)'}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.importButton, importDisabled && styles.buttonDisabled]}
          disabled={importDisabled}
          onPress={() => void onImportBackup()}>
          <Text style={styles.buttonText}>{busyAction === 'import' ? 'Importing…' : 'Import backup (JSON)'}</Text>
        </Pressable>
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
});
