import React, { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, Image } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { loadUnits, PlantUnit, Area, clearUnits } from "../lib/storage";

export default function HomeScreen() {
  const [filter, setFilter] = useState<Area | "Tutte">("Tutte");
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadUnits();
      setUnits(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered = filter === "Tutte" ? units : units.filter((u) => u.area === filter);

  return (
    <>
      <Stack.Screen options={{ title: "PotPal" }} />

      <View style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>PotPal</Text>
          <Text style={styles.subtitle}>Cosa devo fare oggi</Text>

          <View style={styles.filters}>
            {(["Tutte", "Veranda", "Serra", "Marciapiede", "Casa"] as const).map((x) => (
              <Pressable
                key={x}
                onPress={() => setFilter(x as any)}
                style={[styles.pill, filter === x && styles.pillActive]}
              >
                <Text style={[styles.pillText, filter === x && styles.pillTextActive]}>{x}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Unità</Text>

            <Pressable
              onPress={async () => {
                await clearUnits();
                await refresh();
              }}
              style={styles.clearBtn}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>

          {loading ? (
            <Text style={styles.muted}>Caricamento...</Text>
          ) : filtered.length === 0 ? (
            <Text style={styles.muted}>Nessuna unità salvata. Premi “+ Add plant unit”.</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 90 }}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    {item.photoUri ? (
                      <Image source={{ uri: item.photoUri }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumbEmpty}>
                        <Text style={styles.thumbEmptyText}>No</Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardMeta}>{item.area}</Text>
                    </View>

                    <Text style={styles.badge}>Saved</Text>
                  </View>
                </View>
              )}
            />
          )}

          <Pressable style={styles.fab} onPress={() => router.push("/add")}>
            <Text style={styles.fabText}>+ Add plant unit</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1220" },
  container: { flex: 1, padding: 16 },

  title: { color: "white", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#a9b4c7", marginTop: 6, fontSize: 16 },

  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#121b2e" },
  pillActive: { backgroundColor: "#1f2a44" },
  pillText: { color: "#c9d3e6", fontWeight: "600" },
  pillTextActive: { color: "white" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  sectionTitle: { color: "white", fontSize: 16, fontWeight: "800" },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#121b2e" },
  clearText: { color: "#c9d3e6", fontWeight: "800" },

  muted: { color: "#7f8aa3", marginTop: 14 },

  card: { backgroundColor: "#0f1930", borderRadius: 16, padding: 12, marginTop: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { color: "white", fontSize: 15, fontWeight: "800" },
  cardMeta: { color: "#9fb0cc", marginTop: 4 },

  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: "#0b1220" },
  thumbEmpty: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#121b2e",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmptyText: { color: "#7f8aa3", fontWeight: "900" },

  badge: {
    color: "#0b1220",
    backgroundColor: "#cfe3ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: "900",
  },

  fab: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: "#cfe3ff",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  fabText: { fontWeight: "900", color: "#0b1220" },
});
