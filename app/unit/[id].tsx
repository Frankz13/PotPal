import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CARE_TASK_LABELS, type CareTaskKey } from '@/lib/care';
import type { Unit, UnitPhoto } from '@/lib/models';
import { loadUnits, persistPhoto, saveUnits } from '@/lib/storage';

export default function UnitDetailScreen() {
  const DONE_FEEDBACK_MS = 8000;
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [isEditingIntervals, setIsEditingIntervals] = useState(false);
  const [doneFeedbackTasks, setDoneFeedbackTasks] = useState<Partial<Record<CareTaskKey, boolean>>>({});
  const doneFeedbackTimersRef = useRef<Partial<Record<CareTaskKey, ReturnType<typeof setTimeout>>>>({});

  const ensureDisplayUri = useCallback((path: string) => {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
      return path;
    }

    if (Platform.OS !== 'web' && path.startsWith('/')) {
      return `file://${path}`;
    }

    return path;
  }, []);

  const refreshUnit = useCallback(async () => {
    const units = await loadUnits();
    const found = units.find((item) => item.id === id) ?? null;
    setUnit(found);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnit();

      setDoneFeedbackTasks({});

      Object.values(doneFeedbackTimersRef.current).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
      doneFeedbackTimersRef.current = {};
    }, [refreshUnit]),
  );

  const updateUnit = useCallback(
    async (nextUnit: Unit) => {
      setUnit(nextUnit);
      const units = await loadUnits();
      const updatedUnits = units.map((item) => (item.id === nextUnit.id ? nextUnit : item));
      await saveUnits(updatedUnits);
    },
    [],
  );

  const deleteUnit = useCallback(async () => {
    if (!unit) {
      return;
    }

    const units = await loadUnits();
    const nextUnits = units.filter((item) => item.id !== unit.id);

    await Promise.all(
      unit.photos.map(async (photo) => {
        try {
          await FileSystem.deleteAsync(photo.path, { idempotent: true });
        } catch {
          // best effort cleanup
        }
      }),
    );

    await saveUnits(nextUnits);
    navigation.navigate('index' as never);
  }, [navigation, unit]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: unit?.name ?? 'Unit detail',
      headerRight: () => (
        <Pressable
          onPress={() => {
            Alert.alert('Delete unit?', 'This will remove the unit and its photos.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  void deleteUnit();
                },
              },
            ]);
          }}>
          <Text style={styles.deleteHeaderAction}>✕</Text>
        </Pressable>
      ),
    });
  }, [deleteUnit, navigation, unit?.name]);

  const markCareDone = useCallback(
    async (taskKey: CareTaskKey) => {
      if (!unit || doneFeedbackTasks[taskKey]) {
        return;
      }

      setDoneFeedbackTasks((current) => ({ ...current, [taskKey]: true }));

      if (doneFeedbackTimersRef.current[taskKey]) {
        clearTimeout(doneFeedbackTimersRef.current[taskKey]);
      }

      doneFeedbackTimersRef.current[taskKey] = setTimeout(() => {
        setDoneFeedbackTasks((current) => ({ ...current, [taskKey]: false }));
      }, DONE_FEEDBACK_MS);

      const nextUnit: Unit = {
        ...unit,
        care: {
          ...unit.care,
          [taskKey]: {
            ...unit.care[taskKey],
            lastDoneISO: new Date().toISOString(),
          },
        },
      };

      await updateUnit(nextUnit);
    },
    [doneFeedbackTasks, unit, updateUnit],
  );

  const updateInterval = useCallback(
    async (taskKey: CareTaskKey, rawValue: string) => {
      if (!unit) {
        return;
      }

      const parsed = Number(rawValue);
      const intervalDays = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
      const nextUnit: Unit = {
        ...unit,
        care: {
          ...unit.care,
          [taskKey]: {
            ...unit.care[taskKey],
            intervalDays,
          },
        },
      };

      await updateUnit(nextUnit);
    },
    [unit, updateUnit],
  );

  const addPhotoFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permesso camera richiesto',
        'Per scattare una foto, abilita l\'accesso alla camera dalle impostazioni.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPendingPhotoUri(result.assets[0].uri);
    }
  };

  const addPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permesso libreria richiesto',
        'Per scegliere una foto, abilita l\'accesso alla libreria dalle impostazioni.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled) {
      setPendingPhotoUri(result.assets[0].uri);
    }
  };

  const addPhoto = async () => {
    if (!pendingPhotoUri) {
      return;
    }

    if (!unit) {
      return;
    }

    const persistentPath = await persistPhoto(pendingPhotoUri, unit.id);
    const photo: UnitPhoto = {
      id: `${Date.now()}`,
      unitId: unit.id,
      path: persistentPath,
      createdAt: new Date().toISOString(),
    };

    const nextUnit: Unit = {
      ...unit,
      photos: [photo, ...unit.photos],
    };

    await updateUnit(nextUnit);
    setPendingPhotoUri(null);
    await refreshUnit();
  };

  const cancelPendingPhoto = () => {
    setPendingPhotoUri(null);
  };

  const formatLastDone = (lastDoneISO: string | null) => {
    if (!lastDoneISO) {
      return 'Never';
    }

    return new Date(lastDoneISO).toLocaleDateString();
  };

  if (!unit) {
    return (
      <View style={styles.centered}>
        <Text>Unit non trovata.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.name}>{unit.name}</Text>
          <Text style={styles.meta}>Location: {unit.location}</Text>
          <Text style={styles.meta}>Species: {unit.species}</Text>
          {unit.notes ? <Text style={styles.meta}>Note: {unit.notes}</Text> : null}

          <View style={styles.careSection}>
        <View style={styles.careHeader}>
          <Text style={styles.careTitle}>Care</Text>
          <Pressable style={styles.buttonSecondarySmall} onPress={() => setIsEditingIntervals((prev) => !prev)}>
            <Text style={styles.buttonSecondaryText}>{isEditingIntervals ? 'Done editing' : 'Edit intervals'}</Text>
          </Pressable>
        </View>

        {(Object.keys(unit.care) as CareTaskKey[]).map((taskKey) => {
          const task = unit.care[taskKey];
          const isDoneFeedbackVisible = Boolean(doneFeedbackTasks[taskKey]);
          return (
            <View key={taskKey} style={styles.careRow}>
              <View style={styles.careInfo}>
                <Text style={styles.careLabel}>{CARE_TASK_LABELS[taskKey]}</Text>
                <Text style={styles.careMeta}>every {task.intervalDays} days</Text>
                <Text style={styles.careMeta}>last done: {formatLastDone(task.lastDoneISO)}</Text>
                {isEditingIntervals ? (
                  <TextInput
                    defaultValue={`${task.intervalDays}`}
                    keyboardType="number-pad"
                    style={styles.intervalInput}
                    onEndEditing={(event) => void updateInterval(taskKey, event.nativeEvent.text)}
                  />
                ) : null}
              </View>
              <Pressable
                style={[styles.button, isDoneFeedbackVisible ? styles.buttonDisabled : null]}
                disabled={isDoneFeedbackVisible}
                onPress={() => void markCareDone(taskKey)}>
                <Text style={styles.buttonText}>{isDoneFeedbackVisible ? 'Done ✓' : 'Done'}</Text>
              </Pressable>
            </View>
          );
        })}
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={addPhotoFromCamera}>
              <Text style={styles.buttonText}>Scatta foto</Text>
            </Pressable>
            <Pressable style={styles.buttonSecondary} onPress={addPhotoFromLibrary}>
              <Text style={styles.buttonSecondaryText}>Da libreria</Text>
            </Pressable>
          </View>

          <Text style={styles.galleryTitle}>Galleria ({unit.photos.length})</Text>
          {unit.photos.length === 0 ? <Text style={styles.empty}>Nessuna foto caricata.</Text> : null}

          <View style={styles.gallery}>
            {unit.photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: ensureDisplayUri(photo.path) }}
                style={styles.image}
                contentFit="cover"
              />
            ))}
          </View>

          <Modal visible={Boolean(pendingPhotoUri)} transparent animationType="fade" onRequestClose={cancelPendingPhoto}>
            <View style={styles.previewOverlay}>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Anteprima foto</Text>
                {pendingPhotoUri ? (
                  <Image source={{ uri: pendingPhotoUri }} style={styles.previewImage} contentFit="cover" />
                ) : null}
                <View style={styles.previewActions}>
                  <Pressable style={styles.buttonSecondary} onPress={cancelPendingPhoto}>
                    <Text style={styles.buttonSecondaryText}>Annulla</Text>
                  </Pressable>
                  <Pressable style={styles.button} onPress={addPhoto}>
                    <Text style={styles.buttonText}>Salva</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
  },
  meta: {
    color: '#374151',
  },
  careSection: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 10,
  },
  careHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  careTitle: {
    fontWeight: '700',
    fontSize: 20,
  },
  careRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  careInfo: {
    flex: 1,
    gap: 2,
  },
  careLabel: {
    fontWeight: '600',
  },
  careMeta: {
    color: '#4b5563',
  },
  intervalInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 120,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#2d7a46',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonSecondary: {
    flex: 1,
    borderColor: '#2d7a46',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonSecondarySmall: {
    borderColor: '#2d7a46',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#2d7a46',
    fontWeight: '600',
  },
  deleteHeaderAction: {
    color: '#b91c1c',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  galleryTitle: {
    marginTop: 12,
    fontWeight: '700',
    fontSize: 18,
  },
  empty: {
    color: '#6b7280',
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  image: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  previewTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
