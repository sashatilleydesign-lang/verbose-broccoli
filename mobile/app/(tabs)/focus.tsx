import { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  Modal,
  Animated,
} from "react-native";
import { Text } from "../../components/Text";
import { ClientDot } from "../../components/ClientDot";
import { api } from "../../lib/api";
import { light, dark } from "../../lib/colors";
import type { FocusData, Task } from "../../lib/api";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function SessionModal({ task, onEnd, colors }: {
  task: Task;
  onEnd: () => void;
  colors: typeof light;
}) {
  const DURATION = 25 * 60;
  const [seconds, setSeconds] = useState(DURATION);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api.startSession(task.id).then((r: { sessionId: string }) => setSessionId(r.sessionId)).catch(() => {});
    const tick = setInterval(() => {
      setSeconds((s) => {
        if (s <= 0) { clearInterval(tick); return 0; }
        return s - 1;
      });
    }, 1000);
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION * 1000,
      useNativeDriver: false,
    }).start();
    return () => clearInterval(tick);
  }, []);

  async function handleEnd() {
    if (sessionId) await api.endSession(sessionId, task.id).catch(() => {});
    onEnd();
  }

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Modal animationType="fade" statusBarTranslucent>
      <View style={[styles.sessionBg, { backgroundColor: colors.ground === "#141210" ? "#141210" : "#1a1a14" }]}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionWordmark, { color: colors.ink }]}>
            Strobe<Text style={[styles.sessionWordmark, { color: colors.accent }]}>.</Text>
          </Text>
          <TouchableOpacity onPress={handleEnd} style={[styles.endBtn, { borderColor: colors.line }]}>
            <Text style={[styles.endBtnText, { color: colors.inkDim }]}>Esc · end session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sessionBody}>
          {task.clientName ? (
            <View style={styles.sessionClient}>
              <ClientDot colorTag={task.clientColor ?? "#8a90e8"} name={task.clientName} size={8} />
            </View>
          ) : null}
          <Text style={[styles.sessionTitle, { color: colors.ink }]}>{task.title}</Text>

          <Text style={[styles.countdown, { color: colors.ink }]}>{formatTime(seconds)}</Text>

          <View style={[styles.progressTrack, { backgroundColor: colors.line }]}>
            <Animated.View style={[styles.progressFill, { width: barWidth, backgroundColor: colors.accent }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.inkDim }]}>
            LEFT OF {formatTime(DURATION)}
          </Text>

          <View style={styles.sessionActions}>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.accent }]}
              onPress={() => { api.completeTask(task.id).catch(() => {}); handleEnd(); }}
            >
              <Text style={styles.doneBtnText}>✓ Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.endSessionBtn, { borderColor: colors.line }]}
              onPress={handleEnd}
            >
              <Text style={[styles.endSessionBtnText, { color: colors.inkDim }]}>End session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function FocusScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;
  const [data, setData] = useState<FocusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);

  async function load() {
    setLoading(true);
    try { setData(await api.focus()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleComplete() {
    if (!data?.task) return;
    await api.completeTask(data.task.id).catch(() => {});
    load();
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.ground }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!data?.task) {
    return (
      <View style={[styles.center, { backgroundColor: c.ground }]}>
        <Text variant="display" style={{ color: c.ink }}>All clear</Text>
        <Text variant="reading" dim style={{ marginTop: 8, textAlign: "center", paddingHorizontal: 32 }}>
          No task pinned right now. Head to a client workspace to pin the next one.
        </Text>
      </View>
    );
  }

  const task = data.task;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.ground }]} contentContainerStyle={styles.content}>
      {sessionActive && (
        <SessionModal task={task} colors={c} onEnd={() => { setSessionActive(false); load(); }} />
      )}

      {/* Eyebrow */}
      <View style={styles.eyebrow}>
        <View style={[styles.accentDot, { backgroundColor: c.accent }]} />
        <Text style={[styles.eyebrowText, { color: c.accent }]}>RIGHT NOW</Text>
      </View>

      {/* Lead */}
      <Text variant="reading" dim style={styles.lead}>
        Your pinned task for this focus block.
      </Text>

      {/* Hero card */}
      <View style={[styles.card, { backgroundColor: c.panel, borderColor: c.line }]}>
        {task.clientName ? (
          <View style={styles.cardClient}>
            <ClientDot colorTag={task.clientColor ?? "#8a90e8"} name={task.clientName} size={8} />
          </View>
        ) : null}

        <Text style={[styles.taskTitle, { color: c.ink }]}>{task.title}</Text>

        {/* Chips */}
        <View style={styles.chips}>
          {task.energy ? (
            <View style={[styles.chip, { backgroundColor: c.accentDim, borderColor: c.line }]}>
              <Text style={[styles.chipText, { color: c.inkDim }]}>{task.energy.toUpperCase()}</Text>
            </View>
          ) : null}
          {task.context ? (
            <View style={[styles.chip, { backgroundColor: c.accentDim, borderColor: c.line }]}>
              <Text style={[styles.chipText, { color: c.inkDim }]}>{task.context.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        {/* Batch progress */}
        {task.batchSize && task.batchSize > 1 ? (
          <View style={styles.batch}>
            {Array.from({ length: task.batchSize }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.batchPill,
                  {
                    backgroundColor: i < (task.batchDone ?? 0) ? c.accent : c.line,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: c.accent }]}
            onPress={() => setSessionActive(true)}
          >
            <Text style={styles.startBtnText}>▶  Start focus session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.completeBtn, { borderColor: c.line }]}
            onPress={handleComplete}
          >
            <Text style={[styles.completeBtnText, { color: c.inkDim }]}>Mark done</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Up next */}
      {data.upNext && data.upNext.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.inkDim }]}>UP NEXT</Text>
          {data.upNext.map((t) => (
            <View key={t.id} style={[styles.nextItem, { borderColor: c.line, backgroundColor: c.panel }]}>
              {t.clientColor ? <ClientDot colorTag={t.clientColor} size={7} /> : null}
              <Text style={[styles.nextTitle, { color: c.ink }]}>{t.title}</Text>
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
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  accentDot: { width: 6, height: 6, borderRadius: 3 },
  eyebrowText: { fontSize: 11, fontFamily: "System", fontWeight: "700", letterSpacing: 1 },
  lead: { marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
  cardClient: { marginBottom: 2 },
  taskTitle: { fontFamily: "EBGaramond_500Medium", fontSize: 32, lineHeight: 38 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  batch: { flexDirection: "row", gap: 4 },
  batchPill: { height: 6, width: 18, borderRadius: 3 },
  actions: { gap: 10, marginTop: 4 },
  startBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  startBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  completeBtn: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, alignItems: "center" },
  completeBtnText: { fontSize: 14, fontWeight: "600" },
  section: { marginTop: 28, gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  nextItem: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  nextTitle: { fontSize: 14, flex: 1 },
  // Session modal
  sessionBg: { flex: 1, paddingTop: 60, paddingHorizontal: 24 },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionWordmark: { fontFamily: "EBGaramond_500Medium", fontSize: 20 },
  endBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  endBtnText: { fontSize: 12, fontWeight: "600" },
  sessionBody: { flex: 1, justifyContent: "center", gap: 16 },
  sessionClient: { marginBottom: -4 },
  sessionTitle: { fontFamily: "EBGaramond_500Medium", fontSize: 30, lineHeight: 36 },
  countdown: { fontFamily: "EBGaramond_500Medium", fontSize: 96, lineHeight: 96, letterSpacing: -2 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  sessionActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  doneBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  endSessionBtn: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  endSessionBtnText: { fontSize: 14, fontWeight: "600" },
});
