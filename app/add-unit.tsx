import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
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

import { createDefaultCare } from "@/lib/care";
import { filterSpeciesOptions } from "@/lib/species";
import { LOCATION_PRESETS } from "@/lib/locations";
import type { Unit } from "@/lib/models";
import { loadUnits, saveUnits } from "@/lib/storage";

const CUSTOM_OPTION = "Custom...";

type PresetOption = (typeof LOCATION_PRESETS)[number] | typeof CUSTOM_OPTION;

export default function AddUnitScreen() {
  const router = useRouter();
  const speciesSearchInputRef = useRef<TextInput>(null);
  const [name, setName] = useState("");
  const [locationOption, setLocationOption] = useState<PresetOption>("Veranda");
  const [customLocation, setCustomLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [species, setSpecies] = useState("");
  const [speciesModalVisible, setSpeciesModalVisible] = useState(false);
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState("");

  useEffect(() => {
    const hydrateLocationPreference = async () => {
      const units = await loadUnits();
      const lastUsedLocation = units[0]?.location?.trim();

      if (!lastUsedLocation) {
        return;
      }

      if (
        LOCATION_PRESETS.includes(
          lastUsedLocation as (typeof LOCATION_PRESETS)[number],
        )
      ) {
        setLocationOption(
          lastUsedLocation as (typeof LOCATION_PRESETS)[number],
        );
        setCustomLocation("");
        return;
      }

      setLocationOption(CUSTOM_OPTION);
      setCustomLocation(lastUsedLocation);
    };

    void hydrateLocationPreference();
  }, []);

  const selectedLocation =
    locationOption === CUSTOM_OPTION ? customLocation.trim() : locationOption;

  const speciesSuggestions = filterSpeciesOptions(speciesSearchQuery).slice(0, 50);

  const openSpeciesModal = () => {
    setSpeciesSearchQuery(species);
    setSpeciesModalVisible(true);
    setTimeout(() => {
      speciesSearchInputRef.current?.focus();
    }, 0);
  };

  const closeSpeciesModal = () => {
    setSpeciesModalVisible(false);
  };

  const openNotesModal = () => {
    setNotesDraft(notes);
    setNotesModalVisible(true);
  };

  const closeNotesModal = () => {
    setNotesModalVisible(false);
  };

  const saveNotes = () => {
    setNotes(notesDraft);
    closeNotesModal();
  };

  const notesPreview = notes.trim();

  const customSpeciesLabel = speciesSearchQuery.trim();

  const onSave = async () => {
    if (!name.trim() || !selectedLocation) {
      Alert.alert(
        "Campi obbligatori",
        "Inserisci almeno nome e posizione della unit.",
      );
      return;
    }

    const units = await loadUnits();

    const newUnit: Unit = {
      id: `${Date.now()}`,
      name: name.trim(),
      location: selectedLocation,
      species: species.trim(),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      photos: [],
      care: createDefaultCare(),
    };

    await saveUnits([newUnit, ...units]);
    router.back();
  };

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
          <Text style={styles.title}>Add Unit</Text>

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
              {[...LOCATION_PRESETS, CUSTOM_OPTION].map((option) => {
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
              onPress={openNotesModal}
              style={[styles.input, styles.notesRow]}
              accessibilityRole="button"
            >
              <Text
                style={notesPreview ? styles.inputValue : styles.inputPlaceholder}
                numberOfLines={2}
              >
                {notesPreview || "Add notes..."}
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.button} onPress={onSave}>
            <Text style={styles.buttonText}>Salva Unit</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={notesModalVisible}
        animationType="slide"
        onRequestClose={closeNotesModal}
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
                onPress={closeNotesModal}
              >
                <Text style={styles.notesModalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.notesModalButton, styles.notesModalSaveButton]}
                onPress={saveNotes}
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
        onRequestClose={closeSpeciesModal}
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
                    closeSpeciesModal();
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
                  closeSpeciesModal();
                }}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </Pressable>
            )}
          />

          <Pressable style={styles.speciesModalCloseButton} onPress={closeSpeciesModal}>
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
  notesRow: {
    minHeight: 80,
    justifyContent: "center",
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
});
