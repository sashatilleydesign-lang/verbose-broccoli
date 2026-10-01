import { View, Text, StyleSheet } from "react-native";

export function ClientDot({ colorTag, name, size = 8 }: { colorTag: string; name?: string; size?: number }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorTag }]} />
      {name ? <Text style={styles.name}>{name}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 5 },
  dot:  {},
  name: { fontFamily: "System", fontSize: 12, fontWeight: "600", color: "#7a7868" },
});
