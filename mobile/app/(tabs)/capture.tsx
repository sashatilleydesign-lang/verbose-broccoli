import { useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "../../components/Text";
import { api } from "../../lib/api";
import { light, dark } from "../../lib/colors";
import type { CaptureData, CaptureItem, EmailThread } from "../../lib/api";

function ThreadCard({ thread, onArchive, onConvert, colors }: {
  thread: EmailThread;
  onArchive: (id: string) => void;
  onConvert: (id: string) => void;
  colors: typeof light;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.cardSubject, { color: colors.ink }]} numberOfLines={2}>
        {thread.subject}
      </Text>
      <Text style={[styles.cardFrom, { color: colors.inkDim }]} numberOfLines={1}>
        {thread.from}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.line }]}
          onPress={() => onConvert(thread.id)}
        >
          <Text style={[styles.actionText, { color: colors.accent }]}>→ Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.line }]}
          onPress={() => onArchive(thread.id)}
        >
          <Text style={[styles.actionText, { color: colors.inkDim }]}>Archive</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CaptureCard({ item, colors }: { item: CaptureItem; colors: typeof light }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.captureText, { color: colors.ink }]}>{item.text}</Text>
      <Text style={[styles.captureDate, { color: colors.inkDim }]}>{item.createdAt}</Text>
    </View>
  );
}

export default function CaptureScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;
  const [data, setData] = useState<CaptureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"inbox" | "threads">("inbox");

  async function load() {
    setLoading(true);
    try { setData(await api.capture()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCapture() {
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      await api.captureCreate(input.trim());
      setInput("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(threadId: string) {
    await api.archiveThread(threadId).catch(() => {});
    load();
  }

  async function handleConvert(threadId: string) {
    await api.convertThread(threadId).catch(() => {});
    load();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.ground }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>CAPTURE</Text>
        <Text variant="display" style={{ color: c.ink, marginTop: 4 }}>Inbox</Text>
      </View>

      {/* Quick capture */}
      <View style={[styles.captureBox, { backgroundColor: c.panel, borderColor: c.line }]}>
        <TextInput
          style={[styles.captureInput, { color: c.ink }]}
          placeholder="Capture a thought, task, or note…"
          placeholderTextColor={c.inkDim}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.captureBtn, { backgroundColor: input.trim() ? c.accent : c.line }]}
          onPress={handleCapture}
          disabled={!input.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.captureBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: c.line }]}>
        {(["inbox", "threads"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: c.accent, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? c.accent : c.inkDim }]}>
              {t === "inbox" ? "Inbox" : "Email threads"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.listCenter}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : tab === "threads" ? (
        <FlatList
          data={data?.threads ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="reading" dim>No email threads to review.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ThreadCard
              thread={item}
              onArchive={handleArchive}
              onConvert={handleConvert}
              colors={c}
            />
          )}
        />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="reading" dim>Nothing captured yet.</Text>
            </View>
          }
          renderItem={({ item }) => <CaptureCard item={item} colors={c} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  captureBox: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  captureInput: { flex: 1, fontSize: 14, maxHeight: 100 },
  captureBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  captureBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 20, marginBottom: 12 },
  tabBtn: { paddingHorizontal: 4, paddingBottom: 10, marginRight: 20 },
  tabText: { fontSize: 13, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  listCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { paddingTop: 40, alignItems: "center" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardSubject: { fontSize: 14, fontWeight: "600" },
  cardFrom: { fontSize: 12 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  actionText: { fontSize: 12, fontWeight: "600" },
  captureText: { fontSize: 14 },
  captureDate: { fontSize: 11 },
});
