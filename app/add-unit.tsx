import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Unit } from '@/lib/models';
import { loadUnits, saveUnits } from '@/lib/storage';

export default function AddUnitScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const onSave = async () => {
    if (!name.trim() || !location.trim()) {
      Alert.alert('Campi obbligatori', 'Inserisci almeno nome e posizione della unit.');
      return;
    }

    const units = await loadUnits();

    const newUnit: Unit = {
      id: `${Date.now()}`,
      name: name.trim(),
      location: location.trim(),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      photos: [],
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
          <TextInput
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            placeholder="Es. veranda / serra / casa"
          />
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
