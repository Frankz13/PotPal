import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CARE_TASK_LABELS, type CareTaskKey } from "@/lib/care";
import type { Unit, UnitPhoto } from "@/lib/models";
import { loadUnits, persistPhoto, saveUnits } from "@/lib/storage";

export default function UnitDetailScreen() {
  const DONE_FEEDBACK_MS = 8000;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const viewerListRef = useRef<FlatList<UnitPhoto> | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isEditingIntervals, setIsEditingIntervals] = useState(false);
  const [doneFeedbackTasks, setDoneFeedbackTasks] = useState<
    Partial<Record<CareTaskKey, boolean>>
  >({});
  const doneFeedbackTimersRef = useRef<
    Partial<Record<CareTaskKey, ReturnType<typeof setTimeout>>>
  >({});
  const intervalInputRefs = useRef<
    Partial<Record<CareTaskKey, TextInput | null>>
  >({});

  const ensureDisplayUri = useCallback((path: string) => {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
      return path;
    }

    if (Platform.OS !== "web" && path.startsWith("/")) {
      return `file://${path}`;
    }

    return path;
  }, []);

  const refreshUnit = useCallback(async () => {
    setIsLoading(true);

    try {
      const units = await loadUnits();
      const found = units.find((item) => item.id === id) ?? null;
      setUnit(found);
    } finally {
      setIsLoading(false);
    }
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

  const updateUnit = useCallback(async (nextUnit: Unit) => {
    setUnit(nextUnit);
    const units = await loadUnits();
    const updatedUnits = units.map((item) =>
      item.id === nextUnit.id ? nextUnit : item,
    );
    await saveUnits(updatedUnits);
  }, []);

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
    navigation.navigate("index" as never);
  }, [navigation, unit]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: unit?.name ?? "Unit detail",
      headerRight: () => (
        isLoading || !unit ? null : (
        <Pressable
          onPress={() => {
            Alert.alert(
              "Delete unit?",
              "This will remove the unit and its photos.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    void deleteUnit();
                  },
                },
              ],
            );
          }}
        >
          <Text style={styles.deleteHeaderAction}>✕</Text>
        </Pressable>
        )
      ),
    });
  }, [deleteUnit, isLoading, navigation, unit, unit?.name]);

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
      const intervalDays =
        Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
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
        "Permesso camera richiesto",
        "Per scattare una foto, abilita l'accesso alla camera dalle impostazioni.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
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
        "Permesso libreria richiesto",
        "Per scegliere una foto, abilita l'accesso alla libreria dalle impostazioni.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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
    const createdAtISO = new Date().toISOString();
    const photo: UnitPhoto = {
      id: `${Date.now()}`,
      unitId: unit.id,
      path: persistentPath,
      createdAt: createdAtISO,
      createdAtISO,
    };

    const nextUnit: Unit = {
      ...unit,
      photos: [photo, ...unit.photos],
      coverPhotoId: unit.coverPhotoId ?? photo.id,
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
      return "Never";
    }

    return new Date(lastDoneISO).toLocaleDateString();
  };

  const formatPhotoDate = (createdAtISO: string) => {
    if (!createdAtISO) {
      return "";
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(createdAtISO));
  };

  const getCoverPhotoId = useCallback((targetUnit: Unit) => {
    return targetUnit.coverPhotoId ?? targetUnit.photos[0]?.id;
  }, []);

  const setPhotoAsCover = useCallback(
    async (photoId: string) => {
      if (!unit) {
        return;
      }

      const nextUnit: Unit = {
        ...unit,
        coverPhotoId: photoId,
      };

      await updateUnit(nextUnit);
    },
    [unit, updateUnit],
  );

  const deletePhoto = useCallback(
    async (photo: UnitPhoto, currentIndex: number) => {
      if (!unit) {
        return;
      }

      const remainingPhotos = unit.photos.filter((item) => item.id !== photo.id);
      const nextCoverPhotoId =
        getCoverPhotoId(unit) === photo.id ? remainingPhotos[0]?.id : unit.coverPhotoId;

      const nextUnit: Unit = {
        ...unit,
        photos: remainingPhotos,
        coverPhotoId: nextCoverPhotoId,
      };

      await updateUnit(nextUnit);
      if (remainingPhotos.length === 0) {
        setViewerIndex(null);
      } else {
        const nextIndex = Math.min(currentIndex, remainingPhotos.length - 1);
        setViewerIndex(nextIndex);
      }

      try {
        if (photo.path.startsWith("/") || photo.path.startsWith("file://")) {
          const deletablePath = photo.path.startsWith("/")
            ? `file://${photo.path}`
            : photo.path;
          await FileSystem.deleteAsync(deletablePath, { idempotent: true });
        }
      } catch {
        // best effort cleanup
      }
    },
    [getCoverPhotoId, unit, updateUnit],
  );



  useEffect(() => {
    const photoCount = unit?.photos?.length ?? 0;

    if (viewerIndex === null) {
      return;
    }

    if (photoCount === 0) {
      setViewerIndex(null);
      return;
    }

    if (viewerIndex > photoCount - 1) {
      setViewerIndex(photoCount - 1);
      return;
    }

    if (viewerIndex < 0) {
      setViewerIndex(0);
      return;
    }

    if (!viewerListRef.current) {
      return;
    }

    viewerListRef.current.scrollToIndex({ index: viewerIndex, animated: false });
  }, [unit?.photos?.length, viewerIndex]);

  const unitPhotos = unit?.photos ?? [];
  const currentPhoto =
    viewerIndex !== null ? unitPhotos[viewerIndex] ?? null : null;
  const isCurrentPhotoMain = currentPhoto
    ? unit !== null && getCoverPhotoId(unit) === currentPhoto.id
    : false;

  const scrollToInput = (input: TextInput | null) => {
    const node = findNodeHandle(input);

    if (!node) {
      return;
    }

    scrollRef.current
      ?.getScrollResponder()
      ?.scrollResponderScrollNativeHandleToKeyboard(node, 110, true);
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
        <Text style={styles.notFoundMessage}>This unit no longer exists.</Text>
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
          ref={scrollRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable
            style={styles.editButton}
            onPress={() => router.push(`/edit-unit/${unit.id}`)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>

          <Text style={styles.name}>{unit.name}</Text>
          <Text style={styles.meta}>Location: {unit.location}</Text>
          <Text style={styles.meta}>Species: {unit.species}</Text>
          {unit.notes ? (
            <Text style={styles.meta}>Note: {unit.notes}</Text>
          ) : null}

          <View style={styles.careSection}>
            <View style={styles.careHeader}>
              <Text style={styles.careTitle}>Care</Text>
              <Pressable
                style={styles.buttonSecondarySmall}
                onPress={() => setIsEditingIntervals((prev) => !prev)}
              >
                <Text style={styles.buttonSecondaryText}>
                  {isEditingIntervals ? "Done editing" : "Edit intervals"}
                </Text>
              </Pressable>
            </View>

            {(Object.keys(unit.care) as CareTaskKey[]).map((taskKey) => {
              const task = unit.care[taskKey];
              const isDoneFeedbackVisible = Boolean(doneFeedbackTasks[taskKey]);
              return (
                <View key={taskKey} style={styles.careRow}>
                  <View style={styles.careInfo}>
                    <Text style={styles.careLabel}>
                      {CARE_TASK_LABELS[taskKey]}
                    </Text>
                    <Text style={styles.careMeta}>
                      every {task.intervalDays} days
                    </Text>
                    <Text style={styles.careMeta}>
                      last done: {formatLastDone(task.lastDoneISO)}
                    </Text>
                    {isEditingIntervals ? (
                      <TextInput
                        ref={(input) => {
                          intervalInputRefs.current[taskKey] = input;
                        }}
                        defaultValue={`${task.intervalDays}`}
                        keyboardType="number-pad"
                        style={styles.intervalInput}
                        onFocus={() =>
                          scrollToInput(
                            intervalInputRefs.current[taskKey] ?? null,
                          )
                        }
                        onEndEditing={(event) =>
                          void updateInterval(taskKey, event.nativeEvent.text)
                        }
                      />
                    ) : null}
                  </View>
                  <Pressable
                    style={[
                      styles.button,
                      isDoneFeedbackVisible ? styles.buttonDisabled : null,
                    ]}
                    disabled={isDoneFeedbackVisible}
                    onPress={() => void markCareDone(taskKey)}
                  >
                    <Text style={styles.buttonText}>
                      {isDoneFeedbackVisible ? "Done ✓" : "Done"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={addPhotoFromCamera}>
              <Text style={styles.buttonText}>Scatta foto</Text>
            </Pressable>
            <Pressable
              style={styles.buttonSecondary}
              onPress={addPhotoFromLibrary}
            >
              <Text style={styles.buttonSecondaryText}>Da libreria</Text>
            </Pressable>
          </View>

          <Text style={styles.galleryTitle}>Galleria ({unitPhotos.length})</Text>
          {unitPhotos.length === 0 ? <Text style={styles.empty}>Nessuna foto caricata.</Text> : null}

          {unitPhotos.length > 0 ? (
            <FlatList
              horizontal
              data={unitPhotos}
              keyExtractor={(photo) => photo.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryList}
              renderItem={({ item: photo, index }) => {
                const isCover = getCoverPhotoId(unit) === photo.id;
                return (
                  <Pressable
                    style={styles.photoCard}
                    onPress={() => {
                      if (unitPhotos.length > 0) {
                        setViewerIndex(index);
                      }
                    }}
                  >
                    {photo.path ? (
                      <Image
                        source={{ uri: ensureDisplayUri(photo.path) }}
                        style={styles.image}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.image, styles.missingPhotoPlaceholder]}>
                        <Text style={styles.missingPhotoText}>Missing photo</Text>
                      </View>
                    )}
                    {isCover ? (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>Main</Text>
                      </View>
                    ) : null}
                    {photo.createdAtISO || photo.createdAt ? (
                      <Text style={styles.photoDate}>
                        {formatPhotoDate(photo.createdAtISO ?? photo.createdAt)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          ) : null}

          <Modal
            visible={viewerIndex !== null && unitPhotos.length > 0}
            animationType="slide"
            onRequestClose={() => setViewerIndex(null)}
          >
            <SafeAreaView style={styles.viewerSafeArea} edges={["top", "bottom"]}>
              <View style={styles.viewerContent}>
                {viewerIndex !== null ? (
                  <FlatList
                    ref={viewerListRef}
                    horizontal
                    pagingEnabled
                    data={unitPhotos}
                    initialScrollIndex={viewerIndex}
                    keyExtractor={(photo) => photo.id}
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={(_, index) => ({
                      length: windowWidth,
                      offset: windowWidth * index,
                      index,
                    })}
                    onMomentumScrollEnd={(event) => {
                      const nextIndex = Math.round(
                        event.nativeEvent.contentOffset.x / windowWidth,
                      );
                      setViewerIndex(nextIndex);
                    }}
                    onScrollToIndexFailed={() => {
                      // no-op fallback for dynamic list updates
                    }}
                    renderItem={({ item: photo }) => {
                      const isPhotoMain = getCoverPhotoId(unit) === photo.id;
                      return (
                        <View style={[styles.viewerImageSlide, { width: windowWidth }]}>
                          {photo.path ? (
                            <Image
                              source={{ uri: ensureDisplayUri(photo.path) }}
                              style={styles.viewerImage}
                              contentFit="contain"
                            />
                          ) : (
                            <View style={[styles.viewerImage, styles.missingPhotoPlaceholder]}>
                              <Text style={styles.missingPhotoText}>Missing photo</Text>
                            </View>
                          )}
                          {isPhotoMain ? (
                            <View style={styles.viewerMainBadge}>
                              <Text style={styles.mainBadgeText}>Main</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    }}
                  />
                ) : null}

                {currentPhoto?.createdAtISO || currentPhoto?.createdAt ? (
                  <Text style={styles.viewerDate}>
                    {formatPhotoDate(currentPhoto?.createdAtISO ?? currentPhoto?.createdAt ?? "")}
                  </Text>
                ) : null}
                {viewerIndex !== null ? (
                  <Text style={styles.viewerCounter}>
                    {viewerIndex + 1} / {unitPhotos.length}
                  </Text>
                ) : null}
              </View>

              <View style={styles.viewerActions}>
                <Pressable
                  style={styles.viewerButtonSecondary}
                  onPress={() => setViewerIndex(null)}
                >
                  <Text style={styles.buttonSecondaryText}>Close</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.viewerButtonSecondary,
                    pressed ? styles.viewerButtonPressed : null,
                    isCurrentPhotoMain ? styles.viewerButtonDisabled : null,
                  ]}
                  disabled={isCurrentPhotoMain}
                  onPress={() => currentPhoto && void setPhotoAsCover(currentPhoto.id)}
                >
                  <Text style={styles.buttonSecondaryText}>
                    {isCurrentPhotoMain ? "Main ✓" : "Set as main"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.viewerDeleteButton}
                  onPress={() => {
                    if (!currentPhoto || viewerIndex === null) {
                      return;
                    }

                    Alert.alert("Delete photo?", "This action cannot be undone.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          void deletePhoto(currentPhoto, viewerIndex);
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.viewerDeleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </Modal>

          <Modal
            visible={Boolean(pendingPhotoUri)}
            transparent
            animationType="fade"
            onRequestClose={cancelPendingPhoto}
          >
            <View style={styles.previewOverlay}>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Anteprima foto</Text>
                {pendingPhotoUri ? (
                  <Image
                    source={{ uri: pendingPhotoUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                ) : null}
                <View style={styles.previewActions}>
                  <Pressable
                    style={styles.buttonSecondary}
                    onPress={cancelPendingPhoto}
                  >
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
    backgroundColor: "white",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 96,
    gap: 10,
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
  editButton: {
    alignSelf: "flex-start",
    borderColor: "#2d7a46",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 2,
  },
  editButtonText: {
    color: "#2d7a46",
    fontWeight: "700",
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
  },
  meta: {
    color: "#374151",
  },
  careSection: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 10,
  },
  careHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  careTitle: {
    fontWeight: "700",
    fontSize: 20,
  },
  careRow: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  careInfo: {
    flex: 1,
    gap: 2,
  },
  careLabel: {
    fontWeight: "600",
  },
  careMeta: {
    color: "#4b5563",
  },
  intervalInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 120,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: "#2d7a46",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonSecondary: {
    flex: 1,
    borderColor: "#2d7a46",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonSecondarySmall: {
    borderColor: "#2d7a46",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: "#2d7a46",
    fontWeight: "600",
  },
  deleteHeaderAction: {
    color: "#b91c1c",
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  galleryTitle: {
    marginTop: 12,
    fontWeight: "700",
    fontSize: 18,
  },
  empty: {
    color: "#6b7280",
  },
  galleryList: {
    gap: 10,
    paddingRight: 8,
  },
  image: {
    width: 132,
    height: 132,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  missingPhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  missingPhotoText: {
    color: "#4b5563",
    fontWeight: "600",
  },

  photoCard: {
    width: 132,
    gap: 4,
  },
  mainBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(45,122,70,0.95)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mainBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  photoDate: {
    fontSize: 12,
    color: "#4b5563",
  },
  viewerSafeArea: {
    flex: 1,
    backgroundColor: "black",
  },
  viewerContent: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  viewerImageSlide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  viewerImage: {
    width: "100%",
    height: "88%",
    backgroundColor: "#111827",
    borderRadius: 12,
  },
  viewerMainBadge: {
    position: "absolute",
    top: 16,
    left: 20,
    backgroundColor: "rgba(45,122,70,0.95)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  viewerDate: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  viewerCounter: {
    color: "#d1d5db",
    fontSize: 13,
    fontWeight: "600",
  },
  viewerActions: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  viewerButtonPressed: {
    opacity: 0.7,
  },
  viewerButtonDisabled: {
    opacity: 0.65,
  },
  viewerButtonSecondary: {
    flex: 1,
    borderColor: "#2d7a46",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "white",
  },
  viewerDeleteButton: {
    flex: 1,
    backgroundColor: "#b91c1c",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewerDeleteButtonText: {
    color: "white",
    fontWeight: "700",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  previewCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  previewTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  previewActions: {
    flexDirection: "row",
    gap: 8,
  },
});
