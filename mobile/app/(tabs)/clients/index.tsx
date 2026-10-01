import { useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { ClientDot } from "@/components/ClientDot";
import { api } from "@/lib/api";
import { light, dark } from "@/lib/colors";
import type { ClientSummary } from "@/lib/api";

export default function ClientsScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.clients()
      .then(setClients)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.ground }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.ground }]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>CLIENTS</Text>
        <Text variant="display" style={{ color: c.ink, marginTop: 4 }}>Workspaces</Text>
        <Text variant="reading" dim style={{ marginTop: 6 }}>
          Your active client engagements.
        </Text>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.clientCard, { backgroundColor: c.panel, borderColor: c.line }]}
            onPress={() => router.push(`/clients/${item.id}`)}
          >
            <View style={[styles.colorBar, { backgroundColor: item.color }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={[styles.clientName, { color: c.ink }]}>{item.name}</Text>
                {item.pinnedTask ? (
                  <View style={[styles.pinnedBadge, { backgroundColor: c.accentDim }]}>
                    <View style={[styles.badgeDot, { backgroundColor: c.accent }]} />
                    <Text style={[styles.badgeText, { color: c.accent }]}>PINNED</Text>
                  </View>
                ) : null}
              </View>
              {item.pinnedTask ? (
                <Text style={[styles.pinnedTaskTitle, { color: c.inkDim }]} numberOfLines={1}>
                  {item.pinnedTask}
                </Text>
              ) : null}
              <View style={styles.cardMeta}>
                <Text style={[styles.metaText, { color: c.inkDim }]}>
                  {item.taskCount} task{item.taskCount !== 1 ? "s" : ""}
                </Text>
                {item.projectCount ? (
                  <Text style={[styles.metaText, { color: c.inkDim }]}>
                    · {item.projectCount} project{item.projectCount !== 1 ? "s" : ""}
                  </Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  clientCard: { borderWidth: 1, borderRadius: 18, overflow: "hidden", flexDirection: "row" },
  colorBar: { width: 4 },
  cardContent: { flex: 1, padding: 16, gap: 5 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clientName: { fontFamily: "EBGaramond_500Medium", fontSize: 20 },
  pinnedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  pinnedTaskTitle: { fontSize: 13 },
  cardMeta: { flexDirection: "row", gap: 2, marginTop: 2 },
  metaText: { fontSize: 12 },
});
