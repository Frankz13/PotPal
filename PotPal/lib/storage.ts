import AsyncStorage from "@react-native-async-storage/async-storage";

export type Area = "Veranda" | "Serra" | "Marciapiede" | "Casa";

export type PlantUnit = {
  id: string;
  name: string;
  area: Area;
  photoUri?: string | null;
  createdAt: number;
};

const KEY = "potpal_units_v1";

export async function loadUnits(): Promise<PlantUnit[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as PlantUnit[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveUnits(units: PlantUnit[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(units));
}

export async function addUnit(unit: Omit<PlantUnit, "id" | "createdAt">): Promise<PlantUnit> {
  const units = await loadUnits();
  const newUnit: PlantUnit = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    ...unit,
  };
  const updated = [newUnit, ...units];
  await saveUnits(updated);
  return newUnit;
}

export async function clearUnits(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
