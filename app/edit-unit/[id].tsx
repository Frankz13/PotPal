import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LOCATION_PRESETS, type UnitLocationPreset } from "@/lib/locations";
import { filterSpeciesOptions } from "@/lib/species";
import type { Unit } from "@/lib/models";
import { loadUnits, saveUnits } from "@/lib/storage";

const CUSTOM_OPTION = "Custom...";

type LocationOption =
  | (typeof LOCATION_PRESETS)[number]
  | typeof CUSTOM_OPTION
  | string;

export default function EditUnitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const speciesSearchInputRef = useRef<TextInput>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [name, setName] = useState("");
  const [locationOption, setLocationOption] = useState<LocationOption>("Veranda");
  const [customLocation, setCustomLocation] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [species, setSpecies] = useState("");
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState("");
  const [speciesModalVisible, setSpeciesModalVisible] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [notesModalVisible, setNotesModalVisible] = useState(false);

  const hydrateScreen = useCallback(async () => {
    setIsLoading(true);

    try {
      const units = await loadUnits();
      const found = units.find((item) => item.id === id) ?? null;
      setUnit(found);

      if (!found) {
        return;
      }

      const customLocations = Array.from(
        new Set(
          units
            .map((item) => item.location.trim())
            .filter(
              (location) =>
                Boolean(location) &&
                !LOCATION_PRESETS.includes(location as UnitLocationPreset),
            ),
        ),
      ).sort((a, b) => a.localeCompare(b));

      setLocationOptions([...LOCATION_PRESETS, ...customLocations, CUSTOM_OPTION]);

      setName(found.name);
      setSpecies(found.species);
      setNotes(found.notes ?? "");

      if (
        LOCATION_PRESETS.includes(found.location as UnitLocationPreset) ||
        customLocations.includes(found.location)
      ) {
        setLocationOption(found.location);
        setCustomLocation("");
      } else {
        setLocationOption(CUSTOM_OPTION);
        setCustomLocation(found.location);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void hydrateScreen();
    }, [hydrateScreen]),
  );

  const selectedLocation =
    locationOption === CUSTOM_OPTION ? customLocation.trim() : locationOption.trim();

  const speciesSuggestions = filterSpeciesOptions(speciesSearchQuery).slice(0, 50);
  const customSpeciesLabel = speciesSearchQuery.trim();
  const notesPreview = notes.trim();

  const openSpeciesModal = () => {
    setSpeciesSearchQuery(species);
    setSpeciesModalVisible(true);
    setTimeout(() => {
      speciesSearchInputRef.current?.focus();
    }, 0);
  };

  const saveChanges = async () => {
    if (!unit) {
      return;
    }

    const units = await loadUnits();
    const nextUnits = units.map((item) => {
      if (item.id !== unit.id) {
        return item;
      }

      return {
        ...item,
        name: name.trim(),
        location: selectedLocation,
        species: species.trim(),
        notes: notes.trim() || undefined,
      };
    });

    await saveUnits(nextUnits);
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text>Loading unit...</Text>
      </View>
    );
  }

  if (!unit) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundMessage}>Unit not found</Text>
        <Pressable style={styles.button} onPress={() => router.replace("/")}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>Edit Unit</Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Es. Pomodori"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Location *</Text>
            <View style={styles.presetWrap}>
              {locationOptions.map((option) => {
                const isSelected = locationOption === option;

                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.presetButton,
                      isSelected && styles.presetButtonSelected,
                    ]}
                    onPress={() => setLocationOption(option)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        isSelected && styles.presetButtonTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {locationOption === CUSTOM_OPTION ? (
              <TextInput
                value={customLocation}
                onChangeText={setCustomLocation}
                style={styles.input}
                placeholder="Inserisci posizione personalizzata"
              />
            ) : null}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Plant species</Text>
            <Pressable onPress={openSpeciesModal}>
              <View pointerEvents="none" style={styles.input}>
                <Text style={species ? styles.inputValue : styles.inputPlaceholder}>
                  {species || "Es. Mint — Mentha spp."}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Notes (opzionale)</Text>
            <Pressable
              onPress={() => {
                setNotesDraft(notes);
                setNotesModalVisible(true);
              }}
              style={[styles.input, styles.notesRow]}
            >
              <Text
                style={notesPreview ? styles.inputValue : styles.inputPlaceholder}
                numberOfLines={2}
              >
                {notesPreview || "Add notes..."}
              </Text>
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.buttonSecondary, styles.actionButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.actionButton]}
              disabled={!name.trim() || !selectedLocation}
              onPress={() => {
                void saveChanges();
              }}
            >
              <Text style={styles.buttonText}>Save</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={notesModalVisible}
        animationType="slide"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <SafeAreaView style={styles.notesModalSafeArea} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            style={styles.notesModalKeyboardAvoiding}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.notesModalHeader}>
              <Text style={styles.notesModalTitle}>Notes</Text>
            </View>

            <View style={styles.notesModalContent}>
              <TextInput
                value={notesDraft}
                onChangeText={setNotesDraft}
                style={[styles.input, styles.notesModalInput]}
                placeholder="Dettagli utili..."
                multiline
                autoFocus
                textAlignVertical="top"
              />
            </View>

            <View style={styles.notesModalActions}>
              <Pressable
                style={[styles.notesModalButton, styles.notesModalCancelButton]}
                onPress={() => setNotesModalVisible(false)}
              >
                <Text style={styles.notesModalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.notesModalButton, styles.notesModalSaveButton]}
                onPress={() => {
                  setNotes(notesDraft);
                  setNotesModalVisible(false);
                }}
              >
                <Text style={styles.notesModalSaveButtonText}>Save</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={speciesModalVisible}
        animationType="slide"
        onRequestClose={() => setSpeciesModalVisible(false)}
      >
        <SafeAreaView style={styles.speciesModalSafeArea} edges={["top", "bottom"]}>
          <View style={styles.speciesModalHeader}>
            <Text style={styles.speciesModalTitle}>Search species</Text>
            <TextInput
              ref={speciesSearchInputRef}
              value={speciesSearchQuery}
              onChangeText={setSpeciesSearchQuery}
              style={styles.input}
              placeholder="Type species name"
              autoFocus
            />
          </View>

          <FlatList
            data={speciesSuggestions}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.speciesListContent}
            ListHeaderComponent={
              customSpeciesLabel ? (
                <Pressable
                  style={styles.suggestionItem}
                  onPress={() => {
                    setSpecies(customSpeciesLabel);
                    setSpeciesModalVisible(false);
                  }}
                >
                  <Text style={styles.suggestionText}>Use: {customSpeciesLabel}</Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestionItem}
                onPress={() => {
                  setSpecies(item.label);
                  setSpeciesModalVisible(false);
                }}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </Pressable>
            )}
          />

          <Pressable
            style={styles.speciesModalCloseButton}
            onPress={() => setSpeciesModalVisible(false)}
          >
            <Text style={styles.speciesModalCloseButtonText}>Done</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 12,
    paddingBottom: 96,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  notFoundMessage: {
    color: "#374151",
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white",
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
  },
  presetButtonSelected: {
    borderColor: "#2d7a46",
    backgroundColor: "#ecfdf3",
  },
  presetButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  presetButtonTextSelected: {
    color: "#2d7a46",
    fontWeight: "700",
  },
  inputPlaceholder: {
    color: "#9ca3af",
  },
  inputValue: {
    color: "#111827",
  },
  notesRow: {
    minHeight: 80,
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  button: {
    backgroundColor: "#2d7a46",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
  buttonSecondary: {
    borderColor: "#2d7a46",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: "#2d7a46",
    fontWeight: "600",
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  suggestionText: {
    color: "#111827",
  },
  speciesModalSafeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  speciesModalHeader: {
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  speciesModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  speciesListContent: {
    paddingBottom: 20,
  },
  speciesModalCloseButton: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  speciesModalCloseButtonText: {
    fontWeight: "600",
    color: "#111827",
  },
  notesModalSafeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  notesModalKeyboardAvoiding: {
    flex: 1,
  },
  notesModalHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  notesModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  notesModalContent: {
    flex: 1,
    padding: 16,
  },
  notesModalInput: {
    flex: 1,
    minHeight: 240,
  },
  notesModalActions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 8,
  },
  notesModalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  notesModalCancelButton: {
    backgroundColor: "#f3f4f6",
  },
  notesModalSaveButton: {
    backgroundColor: "#2d7a46",
  },
  notesModalCancelButtonText: {
    color: "#111827",
    fontWeight: "600",
  },
  notesModalSaveButtonText: {
    color: "white",
    fontWeight: "700",
  },
});
