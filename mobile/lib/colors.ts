import { useColorScheme } from "react-native";

export const light = {
  ground: "#f5f3ee",
  panel: "#fdfcf9",
  ink: "#1a1a14",
  inkDim: "#7a7868",
  accent: "#ff4b1f",
  accentDim: "#fff0ec",
  line: "#e5e2d9",
};

export const dark = {
  ground: "#141210",
  panel: "#1e1c18",
  ink: "#f0ede4",
  inkDim: "#8a8778",
  accent: "#ff5a30",
  accentDim: "#2a1a12",
  line: "rgba(255,255,255,0.09)",
};

export function useColors() {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

export const CLIENT_COLORS = [
  "#8a90e8", // indigo
  "#d9a94a", // ochre
  "#5b9fd6", // sky
  "#d987a6", // rose
  "#4fb3a4", // teal
  "#b784e0", // violet
  "#8fb573", // sage
  "#8fa3b8", // slate
];
