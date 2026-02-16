import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Image, Alert } from "react-native";
import { Stack, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { addUnit, Area } from "../lib/storage";

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function ensurePhotosDir() {
  const baseUri = Paths.document?.uri ?? Paths.cache?.uri;
  if (!baseUri) throw new Error("No writable directory available (Paths.document/cache missing).");

  const dir = baseUri.endsWith("/") ? `${baseUri}photos/` : `${baseUri}/photos/`;

  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

export default function AddScreen() {
  const [name, setName] = useState("");
  const [area, setArea] = useState<Area>("Veranda");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permesso negato", "Serve il permesso camera per scattare una foto.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled) return;

      const tempUri = result.assets[0].uri;

      const dir = await ensurePhotosDir();
      const filename = `potpal-${makeId()}.jpg`;
      const destUri = dir + filename;

      await FileSystem.copyAsync({ from: tempUri, to: destUri });
      setPhotoUri(destUri);
    } catch (e: any) {
      console.log(e);
      Alert.alert("Errore foto", e?.message ?? "Errore sconosciuto");
    }
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Manca il nome", "Scrivi un nome/codice per l’unità.");
      return;
    }

    try {
      setSaving(true);
      await addUnit({
        name: trimmed,
        area,
        photoUri: photoUri ?? null,
      });
      router.back();
    } catch (e: any) {
      console.log(e);
      Alert.alert("Errore salvataggio", e?.message ?? "Errore sconosciuto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "New plant unit" }} />

      <Text style={styles.title}>Nuova unità di coltivazione</Text>

      <Text style={styles.label}>Foto</Text>
      <Pressable style={styles.photoBtn} onPress={takePhoto}>
        <Text style={styles.photoBtnText}>{photoUri ? "Retake photo" : "Take photo"}</Text>
      </Pressable>

      {photoUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.previewImg} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewPlaceholderText}>Nessuna foto</Text>
        </View>
      )}

      <Text style={styles.label}>Nome / Codice (es. “AA1 Monstera”)</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Scrivi qui..."
        placeholderTextColor="#7f8aa3"
        style={styles.input}
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Zona</Text>
      <View style={styles.row}>
        {(["Veranda", "Serra", "Marciapiede", "Casa"] as const).map((x) => (
          <Pressable
            key={x}
            onPress={() => setArea(x as Area)}
            style={[styles.pill, area === x && styles.pillActive]}
          >
            <Text style={[styles.pillText, area === x && styles.pillTextActive]}>{x}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[styles.btn, saving && styles.btnDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.btnText}>{saving ? "Saving..." : "Save & Back"}</Text>
      </Pressable>

      <Pressable style={styles.btnGhost} onPress={() => router.back()} disabled={saving}>
        <Text style={styles.btnGhostText}>Back (no save)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220", padding: 16, paddingTop: 30 },
  title: { color: "white", fontSize: 22, fontWeight: "800" },
  label: { color: "#a9b4c7", marginTop: 18, marginBottom: 8 },

  photoBtn: { backgroundColor: "#1f2a44", padding: 12, borderRadius: 14, alignItems: "center" },
  photoBtnText: { color: "white", fontWeight: "800" },

  previewWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
    marginTop: 12,
    overflow: "hidden",
    backgroundColor: "#0f1930",
  },
  previewImg: { width: "100%", height: "100%" },

  previewPlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: "#0f1930",
    alignItems: "center",
    justifyContent: "center",
  },
  previewPlaceholderText: { color: "#7f8aa3", fontWeight: "700" },

  input: {
    backgroundColor: "#0f1930",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
  },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#121b2e" },
  pillActive: { backgroundColor: "#1f2a44" },
  pillText: { color: "#c9d3e6", fontWeight: "600" },
  pillTextActive: { color: "white" },

  btn: { backgroundColor: "#cfe3ff", padding: 14, borderRadius: 16, alignItems: "center", marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: "900", color: "#0b1220" },

  btnGhost: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2a44",
  },
  btnGhostText: { color: "#c9d3e6", fontWeight: "800" },
});
