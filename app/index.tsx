import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Unit } from '@/lib/models';
import { loadUnits } from '@/lib/storage';

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Units</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/add-unit')}>
            <Text style={styles.primaryButtonText}>+ Add Unit</Text>
          </Pressable>
        </View>

        <FlatList
          data={units}
          keyExtractor={(item) => item.id}
          contentContainerStyle={units.length === 0 ? styles.emptyListContent : styles.listContent}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
