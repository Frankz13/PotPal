import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CARE_TASK_LABELS, type CareTaskKey, getDueDate, getTaskStatus } from '@/lib/care';
import type { Unit } from '@/lib/models';
import { loadUnits, saveUnits } from '@/lib/storage';

type TodayTask = {
  unitId: string;
  unitName: string;
  taskKey: CareTaskKey;
  intervalDays: number;
  lastDoneISO: string | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        const savedUnits = await loadUnits();
        setUnits(savedUnits);
      };

      void run();
    }, []),
  );

  const todayTasks = useMemo(() => {
    const dueTasks: TodayTask[] = [];

    for (const unit of units) {
      (Object.keys(unit.care) as CareTaskKey[]).forEach((taskKey) => {
        const task = unit.care[taskKey];
        const status = getTaskStatus(task.lastDoneISO, task.intervalDays);

        if (status === 'upcoming') {
          return;
        }

        dueTasks.push({
          unitId: unit.id,
          unitName: unit.name,
          taskKey,
          intervalDays: task.intervalDays,
          lastDoneISO: task.lastDoneISO,
        });
      });
    }

    return dueTasks.sort((a, b) => {
      const aStatus = getTaskStatus(a.lastDoneISO, a.intervalDays);
      const bStatus = getTaskStatus(b.lastDoneISO, b.intervalDays);
      const aRank = aStatus === 'overdue' ? 0 : 1;
      const bRank = bStatus === 'overdue' ? 0 : 1;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return getDueDate(a.lastDoneISO, a.intervalDays).getTime() - getDueDate(b.lastDoneISO, b.intervalDays).getTime();
    });
  }, [units]);

  const markTaskDone = useCallback(
    async (unitId: string, taskKey: CareTaskKey) => {
      const nowISO = new Date().toISOString();
      const updatedUnits = units.map((unit) => {
        if (unit.id !== unitId) {
          return unit;
        }

        return {
          ...unit,
          care: {
            ...unit.care,
            [taskKey]: {
              ...unit.care[taskKey],
              lastDoneISO: nowISO,
            },
          },
        };
      });

      setUnits(updatedUnits);
      await saveUnits(updatedUnits);
    },
    [units],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <FlatList
          data={units}
          keyExtractor={(item) => item.id}
          contentContainerStyle={units.length === 0 ? styles.emptyListContent : styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.todaySection}>
                <Text style={styles.todayTitle}>Today</Text>
                {todayTasks.length === 0 ? <Text style={styles.empty}>Niente da fare oggi 🎉</Text> : null}
                {todayTasks.map((task) => {
                  const status = getTaskStatus(task.lastDoneISO, task.intervalDays);
                  return (
                    <View key={`${task.unitId}-${task.taskKey}`} style={styles.todayItem}>
                      <View style={styles.todayInfo}>
                        <Text style={styles.todayItemTitle}>
                          {task.unitName} · {CARE_TASK_LABELS[task.taskKey]}
                        </Text>
                        <Text style={styles.todayItemMeta}>{status === 'overdue' ? 'Overdue' : 'Due today'}</Text>
                      </View>
                      <Pressable style={styles.todayDoneButton} onPress={() => void markTaskDone(task.unitId, task.taskKey)}>
                        <Text style={styles.todayDoneButtonText}>Done</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={styles.headerRow}>
                <Text style={styles.title}>Units</Text>
                <Pressable style={styles.primaryButton} onPress={() => router.push('/add-unit')}>
                  <Text style={styles.primaryButtonText}>+ Add Unit</Text>
                </Pressable>
              </View>
            </>
          }
          ListEmptyComponent={<Text style={styles.empty}>Nessuna unità. Aggiungine una per iniziare.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/unit/${item.id}`)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>Location: {item.location}</Text>
              <Text style={styles.cardMeta}>{item.photos.length} foto</Text>
            </Pressable>
          )}
        />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  todaySection: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  todayTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  todayItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  todayInfo: {
    flex: 1,
    gap: 2,
  },
  todayItemTitle: {
    fontWeight: '600',
  },
  todayItemMeta: {
    color: '#6b7280',
  },
  todayDoneButton: {
    backgroundColor: '#2d7a46',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  todayDoneButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#2d7a46',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  cardMeta: {
    color: '#4b5563',
  },
});
