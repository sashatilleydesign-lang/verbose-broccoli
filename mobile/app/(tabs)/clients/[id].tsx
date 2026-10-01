import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "../../../components/Text";
import { ClientDot } from "../../../components/ClientDot";
import { api } from "../../../lib/api";
import { light, dark } from "../../../lib/colors";
import type { ClientDetail, Task, TimelineEntry, Project } from "../../../lib/api";

function TaskItem({ task, onPin, onTouch, colors }: {
  task: Task;
  onPin: (id: string) => void;
  onTouch: (id: string) => void;
  colors: typeof light;
}) {
  return (
    <View style={[styles.taskRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={styles.taskMain}>
        {task.clientColor ? <ClientDot colorTag={task.clientColor} size={6} /> : null}
        <Text style={[styles.taskTitle, { color: colors.ink }]} numberOfLines={2}>{task.title}</Text>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity onPress={() => onPin(task.id)} style={[styles.actionBtn, { borderColor: colors.line }]}>
          <Text style={[styles.actionText, { color: task.pinned ? colors.accent : colors.inkDim }]}>
            {task.pinned ? "● Pin" : "Pin"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTouch(task.id)} style={[styles.actionBtn, { borderColor: colors.line }]}>
          <Text style={[styles.actionText, { color: colors.inkDim }]}>Touch</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ClientDetailScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ClientDetail | null>(null);
  // id is a cuid string
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    setLoading(true);
    try { setData(await api.client(id)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function handlePin(taskId: string) {
    await api.markAsNext(taskId).catch(() => {});
    load();
  }

  async function handleTouch(taskId: string) {
    await api.touchTask(taskId).catch(() => {});
    load();
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.ground }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: c.ground }]}>
        <Text variant="body" dim>Client not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.ground }]} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: c.inkDim }]}>← Clients</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.colorSwatch, { backgroundColor: data.color }]} />
        <View>
          <Text style={[styles.eyebrow, { color: c.inkDim }]}>CLIENT WORKSPACE</Text>
          <Text style={[styles.clientName, { color: c.ink }]}>{data.name}</Text>
        </View>
      </View>

      {/* Pinned next */}
      {data.pinnedTask ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.accentDot, { backgroundColor: c.accent }]} />
            <Text style={[styles.sectionLabel, { color: c.accent }]}>PINNED NEXT</Text>
          </View>
          <View style={[styles.pinnedCard, { backgroundColor: c.panel, borderColor: c.line }]}>
            <Text style={[styles.pinnedTitle, { color: c.ink }]}>{data.pinnedTask.title}</Text>
          </View>
        </View>
      ) : null}

      {/* Tasks */}
      {data.tasks && data.tasks.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>TASKS</Text>
          {data.tasks.map((t) => (
            <TaskItem key={t.id} task={t} onPin={handlePin} onTouch={handleTouch} colors={c} />
          ))}
        </View>
      ) : null}

      {/* Projects */}
      {data.projects && data.projects.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>PROJECTS</Text>
          {data.projects.map((p: Project) => (
            <View key={p.id} style={[styles.projectCard, { backgroundColor: c.panel, borderColor: c.line }]}>
              <Text style={[styles.projectName, { color: c.ink }]}>{p.name}</Text>
              {p.description ? (
                <Text style={[styles.projectDesc, { color: c.inkDim }]} numberOfLines={2}>{p.description}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* Timeline */}
      {data.timeline && data.timeline.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>RECENT ACTIVITY</Text>
          {data.timeline.map((entry: TimelineEntry, i: number) => (
            <View key={i} style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: c.line }]} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: c.ink }]}>{entry.title}</Text>
                <Text style={[styles.timelineDate, { color: c.inkDim }]}>{entry.date}</Text>
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
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: "600" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 24 },
  colorSwatch: { width: 10, height: 10, borderRadius: 5, marginTop: 14 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  clientName: { fontFamily: "EBGaramond_500Medium", fontSize: 30 },
  section: { marginBottom: 28, gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  accentDot: { width: 6, height: 6, borderRadius: 3 },
  pinnedCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  pinnedTitle: { fontFamily: "EBGaramond_500Medium", fontSize: 18 },
  taskRow: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  taskMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  taskTitle: { flex: 1, fontSize: 13 },
  taskActions: { flexDirection: "row", gap: 6 },
  actionBtn: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  actionText: { fontSize: 11, fontWeight: "600" },
  projectCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  projectName: { fontFamily: "EBGaramond_500Medium", fontSize: 16 },
  projectDesc: { fontSize: 12, lineHeight: 17 },
  timelineRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 13 },
  timelineDate: { fontSize: 11, marginTop: 2 },
});
