import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { Text } from "@/components/Text";
import { ClientDot } from "@/components/ClientDot";
import { api } from "@/lib/api";
import { light, dark } from "@/lib/colors";
import type { WeeklyData, Task } from "@/lib/api";

function TaskRow({ task, onMarkNext, colors }: {
  task: Task;
  onMarkNext?: (id: string) => void;
  colors: typeof light;
}) {
  return (
    <View style={[styles.taskRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={styles.taskMain}>
        {task.clientColor ? <ClientDot colorTag={task.clientColor} size={7} /> : null}
        <Text style={[styles.taskTitle, { color: colors.ink }]} numberOfLines={2}>{task.title}</Text>
      </View>
      {onMarkNext ? (
        <TouchableOpacity
          style={[styles.pinBtn, { borderColor: colors.line }]}
          onPress={() => onMarkNext(task.id)}
        >
          <Text style={[styles.pinText, { color: colors.inkDim }]}>Pin next</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function WeeklyScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setData(await api.weekly()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleMarkNext(taskId: string) {
    await api.markAsNext(taskId).catch(() => {});
    load();
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.ground }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.ground }]} contentContainerStyle={styles.content}>
      {/* Eyebrow */}
      <Text style={[styles.eyebrow, { color: c.accent }]}>WEEKLY REVIEW</Text>
      <Text variant="reading" dim style={styles.lead}>
        How is the week looking? Here's what's moving and what's waiting.
      </Text>

      {/* Pinned next */}
      {data?.pinnedTask ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.accentDot, { backgroundColor: c.accent }]} />
            <Text style={[styles.sectionLabel, { color: c.accent }]}>PINNED NEXT</Text>
          </View>
          <View style={[styles.pinnedCard, { backgroundColor: c.panel, borderColor: c.line }]}>
            {data.pinnedTask.clientColor ? (
              <ClientDot colorTag={data.pinnedTask.clientColor} name={data.pinnedTask.clientName} size={8} />
            ) : null}
            <Text style={[styles.pinnedTitle, { color: c.ink }]}>{data.pinnedTask.title}</Text>
          </View>
        </View>
      ) : null}

      {/* Overdue */}
      {data?.overdue && data.overdue.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>OVERDUE</Text>
          {data.overdue.map((t) => (
            <TaskRow key={t.id} task={t} onMarkNext={handleMarkNext} colors={c} />
          ))}
        </View>
      ) : null}

      {/* In flight */}
      {data?.inFlight && data.inFlight.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>IN FLIGHT</Text>
          {data.inFlight.map((t) => (
            <TaskRow key={t.id} task={t} onMarkNext={handleMarkNext} colors={c} />
          ))}
        </View>
      ) : null}

      {/* Upcoming */}
      {data?.upcoming && data.upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>UPCOMING</Text>
          {data.upcoming.map((t) => (
            <TaskRow key={t.id} task={t} onMarkNext={handleMarkNext} colors={c} />
          ))}
        </View>
      ) : null}

      {/* Completed this week */}
      {data?.completedThisWeek && data.completedThisWeek.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>DONE THIS WEEK</Text>
          {data.completedThisWeek.map((t) => (
            <View key={t.id} style={[styles.taskRow, styles.doneRow, { borderColor: c.line, backgroundColor: c.panel, opacity: 0.6 }]}>
              <View style={styles.taskMain}>
                {t.clientColor ? <ClientDot colorTag={t.clientColor} size={7} /> : null}
                <Text style={[styles.taskTitle, { color: c.inkDim }]} numberOfLines={2}>{t.title}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 6 },
  lead: { marginBottom: 24 },
  section: { marginBottom: 24, gap: 8 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  accentDot: { width: 6, height: 6, borderRadius: 3 },
  pinnedCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  pinnedTitle: { fontFamily: "EBGaramond_500Medium", fontSize: 20 },
  taskRow: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  doneRow: {},
  taskMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  taskTitle: { flex: 1, fontSize: 14 },
  pinBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pinText: { fontSize: 11, fontWeight: "600" },
});
