import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Unit, UnitPhoto } from '@/lib/models';
import { loadUnits, persistPhoto, saveUnits } from '@/lib/storage';

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [unit, setUnit] = useState<Unit | null>(null);

  const refreshUnit = useCallback(async () => {
    const units = await loadUnits();
    const found = units.find((item) => item.id === id) ?? null;
    setUnit(found);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnit();
    }, [refreshUnit]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: unit?.name ?? 'Unit detail' });
  }, [navigation, unit?.name]);

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
      await addPhoto(result.assets[0].uri);
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
      await addPhoto(result.assets[0].uri);
    }
  };

  const addPhoto = async (sourceUri: string) => {
    if (!unit) {
      return;
    }

    const persistentPath = await persistPhoto(sourceUri, unit.id);
    const photo: UnitPhoto = {
      id: `${Date.now()}`,
      unitId: unit.id,
      path: persistentPath,
      createdAt: new Date().toISOString(),
    };

    const units = await loadUnits();
    const updatedUnits = units.map((item) => {
      if (item.id !== unit.id) {
        return item;
      }

      return {
        ...item,
        photos: [photo, ...item.photos],
      };
    });

    await saveUnits(updatedUnits);
    await refreshUnit();
  };

  if (!unit) {
    return (
      <View style={styles.centered}>
        <Text>Unit non trovata.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{unit.name}</Text>
      <Text style={styles.meta}>Posizione: {unit.location}</Text>
      {unit.notes ? <Text style={styles.meta}>Note: {unit.notes}</Text> : null}

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
          <Image key={photo.id} source={{ uri: photo.path }} style={styles.image} contentFit="cover" />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  buttonSecondary: {
    flex: 1,
    borderColor: '#2d7a46',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
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
});
