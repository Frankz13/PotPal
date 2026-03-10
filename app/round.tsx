import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CARE_TASK_LABELS,
  completeCareTasks,
  type CareTaskKey,
  compareCareUrgency,
  getDueTaskKeys,
  getTaskStatus,
} from '@/lib/care';
import { type LocationFilter, matchesLocationFilter } from '@/lib/locations';
import type { Unit } from '@/lib/models';
import { loadUnits, saveUnits } from '@/lib/storage';

export default function RoundScreen() {
  const params = useLocalSearchParams<{ location?: string }>();
  const activeLocation = (params.location as LocationFilter | undefined) ?? 'All';
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        const saved = await loadUnits();
        const filtered = saved.filter((unit) => matchesLocationFilter(unit.location, activeLocation));
        const sorted = [...filtered].sort(compareCareUrgency);

        setUnits(sorted);
        setCurrentIndex(0);
      };

      void run();
    }, [activeLocation]),
  );

  const currentUnit = units[currentIndex] ?? null;
  const roundLabel = activeLocation === 'All' ? 'All locations round' : `${activeLocation} round`;

  const completeTasksForUnit = useCallback(async (unitId: string, taskKeys: CareTaskKey[]) => {
    if (taskKeys.length === 0) {
      return;
    }

    const nowISO = new Date().toISOString();
    setUnits((prev) => {
      const updatedUnits = prev.map((unit) => {
        if (unit.id !== unitId) {
          return unit;
        }

        return {
          ...unit,
          care: completeCareTasks(unit.care, taskKeys, nowISO),
        };
      });

      return updatedUnits;
    });

    const allUnits = await loadUnits();
    const updatedAllUnits = allUnits.map((unit) => {
      if (unit.id !== unitId) {
        return unit;
      }

      return {
        ...unit,
        care: completeCareTasks(unit.care, taskKeys, nowISO),
      };
    });

    await saveUnits(updatedAllUnits);
  }, []);

  const dueTaskKeysForCurrentUnit = useMemo(() => {
    if (!currentUnit) {
      return [] as CareTaskKey[];
    }

    return getDueTaskKeys(currentUnit.care);
  }, [currentUnit]);

  const totalCount = units.length;

  const formatLastDone = (lastDoneISO: string | null) => {
    if (!lastDoneISO) {
      return 'Never';
    }

    return new Date(lastDoneISO).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDueStatus = (lastDoneISO: string | null, intervalDays: number) => {
    const status = getTaskStatus(lastDoneISO, intervalDays);

    if (status === 'overdue') {
      return 'Overdue';
    }

    if (status === 'today') {
      return 'Due today';
    }

    return 'Upcoming';
  };

  if (totalCount === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <Text style={styles.title}>{roundLabel}</Text>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nessuna unità da visitare</Text>
            <Text style={styles.emptyText}>Prova a cambiare filtro o aggiungi una nuova unità in questa posizione.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>{roundLabel}</Text>
        <Text style={styles.meta}>
          Unit {currentIndex + 1} / {totalCount}
        </Text>

        {currentUnit ? (
          <View style={styles.card}>
            <Text style={styles.unitName}>{currentUnit.name}</Text>
            <Text style={styles.unitMeta}>Location: {currentUnit.location}</Text>
            <Text style={styles.unitMeta}>Foto: {currentUnit.photos.length}</Text>

            <Pressable
              disabled={dueTaskKeysForCurrentUnit.length === 0}
              style={[styles.bulkDoneButton, dueTaskKeysForCurrentUnit.length === 0 && styles.bulkDoneButtonDisabled]}
              onPress={() => {
                void completeTasksForUnit(currentUnit.id, dueTaskKeysForCurrentUnit);
              }}>
              <Text style={styles.bulkDoneButtonText}>
                {dueTaskKeysForCurrentUnit.length === 0 ? 'All up to date' : 'Done all due'}
              </Text>
            </Pressable>

            <View style={styles.careList}>
              {(Object.keys(currentUnit.care) as CareTaskKey[]).map((taskKey) => (
                <View key={taskKey} style={styles.careRow}>
                  <View style={styles.careInfo}>
                    <Text style={styles.careLabel}>{CARE_TASK_LABELS[taskKey]}</Text>
                    <Text style={styles.careMeta}>every {currentUnit.care[taskKey].intervalDays} days</Text>
                    <Text style={styles.careMeta}>Last done: {formatLastDone(currentUnit.care[taskKey].lastDoneISO)}</Text>
                    <Text style={styles.careStatus}>
                      {getDueStatus(currentUnit.care[taskKey].lastDoneISO, currentUnit.care[taskKey].intervalDays)}
                    </Text>
                  </View>
                  {(() => {
                    const status = getTaskStatus(currentUnit.care[taskKey].lastDoneISO, currentUnit.care[taskKey].intervalDays);
                    const isDue = status !== 'upcoming';

                    return (
                      <Pressable
                        disabled={!isDue}
                        style={({ pressed }) => [
                          styles.doneButton,
                          !isDue && styles.doneButtonDisabled,
                          pressed && isDue && styles.doneButtonPressed,
                        ]}
                        onPress={() => {
                          void completeTasksForUnit(currentUnit.id, [taskKey]);
                        }}>
                        <Text style={styles.doneButtonText}>{isDue ? 'Done' : 'Done ✓'}</Text>
                      </Pressable>
                    );
                  })()}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.navigationRow}>
          <Pressable
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}>
            <Text style={styles.navButtonText}>Previous</Text>
          </Pressable>
          <Pressable
            style={[styles.navButton, currentIndex >= totalCount - 1 && styles.navButtonDisabled]}
            disabled={currentIndex >= totalCount - 1}
            onPress={() => setCurrentIndex((prev) => Math.min(prev + 1, totalCount - 1))}>
            <Text style={styles.navButtonText}>Next</Text>
          </Pressable>
        </View>
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
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  meta: {
    color: '#4b5563',
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  unitName: {
    fontWeight: '700',
    fontSize: 20,
  },
  unitMeta: {
    color: '#374151',
  },
  bulkDoneButton: {
    marginTop: 8,
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bulkDoneButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  bulkDoneButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  careList: {
    marginTop: 8,
    gap: 8,
  },
  careRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  careInfo: {
    flex: 1,
    gap: 2,
  },
  careLabel: {
    fontWeight: '600',
  },
  careMeta: {
    color: '#6b7280',
  },
  careStatus: {
    color: '#1f2937',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#2d7a46',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 2,
    elevation: 2,
  },
  doneButtonPressed: {
    opacity: 0.7,
  },
  doneButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  navigationRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#1f6feb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  emptyText: {
    color: '#6b7280',
  },
});
