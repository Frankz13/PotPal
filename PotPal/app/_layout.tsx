import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0b1220" },
        headerTintColor: "white",
        contentStyle: { backgroundColor: "#0b1220" },
      }}
    />
  );
}
