import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Unit } from '@/lib/models';
import { createDefaultCare } from '@/lib/care';
import { loadUnits, saveUnits } from '@/lib/storage';

const LOCATION_PRESETS = ['Veranda', 'Serra', 'Casa', 'Marciapiede'] as const;
const CUSTOM_OPTION = 'Custom...';

type PresetOption = (typeof LOCATION_PRESETS)[number] | typeof CUSTOM_OPTION;

export default function AddUnitScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [locationOption, setLocationOption] = useState<PresetOption>('Veranda');
  const [customLocation, setCustomLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const hydrateLocationPreference = async () => {
      const units = await loadUnits();
      const lastUsedLocation = units[0]?.location?.trim();

      if (!lastUsedLocation) {
        return;
      }

      if (LOCATION_PRESETS.includes(lastUsedLocation as (typeof LOCATION_PRESETS)[number])) {
        setLocationOption(lastUsedLocation as (typeof LOCATION_PRESETS)[number]);
        setCustomLocation('');
        return;
      }

      setLocationOption(CUSTOM_OPTION);
      setCustomLocation(lastUsedLocation);
    };

    void hydrateLocationPreference();
  }, []);

  const selectedLocation = locationOption === CUSTOM_OPTION ? customLocation.trim() : locationOption;

  const onSave = async () => {
    if (!name.trim() || !selectedLocation) {
      Alert.alert('Campi obbligatori', 'Inserisci almeno nome e posizione della unit.');
      return;
    }

    const units = await loadUnits();

    const newUnit: Unit = {
      id: `${Date.now()}`,
      name: name.trim(),
      location: selectedLocation,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      photos: [],
      care: createDefaultCare(),
    };

    await saveUnits([newUnit, ...units]);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Unit</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Name *</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Es. Pomodori" />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Location *</Text>
          <View style={styles.presetWrap}>
            {[...LOCATION_PRESETS, CUSTOM_OPTION].map((option) => {
              const isSelected = locationOption === option;

              return (
                <Pressable
                  key={option}
                  style={[styles.presetButton, isSelected && styles.presetButtonSelected]}
                  onPress={() => setLocationOption(option)}>
                  <Text style={[styles.presetButtonText, isSelected && styles.presetButtonTextSelected]}>{option}</Text>
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
          <Text style={styles.label}>Notes (opzionale)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notesInput]}
            placeholder="Dettagli utili..."
            multiline
          />
        </View>

        <Pressable style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Salva Unit</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    padding: 16,
    paddingTop: 12,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'white',
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  presetButtonSelected: {
    borderColor: '#2d7a46',
    backgroundColor: '#ecfdf3',
  },
  presetButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  presetButtonTextSelected: {
    color: '#2d7a46',
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2d7a46',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
});
