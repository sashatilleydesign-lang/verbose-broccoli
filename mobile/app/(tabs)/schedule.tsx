import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Text } from "@/components/Text";
import { ClientDot } from "@/components/ClientDot";
import { api } from "@/lib/api";
import { light, dark } from "@/lib/colors";
import type { ScheduleData, ScheduleItem } from "@/lib/api";

function formatHour(hour: number) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "am" : "pm";
  return `${h}${ampm}`;
}

function ScheduleTile({ item, colors }: { item: ScheduleItem; colors: typeof light }) {
  const bgColor = item.clientColor ? item.clientColor + "28" : colors.panel;
  const borderColor = item.clientColor ? item.clientColor + "66" : colors.line;
  const height = Math.max(48, (item.durationMins / 60) * 64);

  return (
    <View
      style={[
        styles.tile,
        {
          height,
          backgroundColor: bgColor,
          borderColor,
        },
      ]}
    >
      {item.clientColor ? <ClientDot colorTag={item.clientColor} size={6} /> : null}
      <Text style={[styles.tileTitle, { color: colors.ink }]} numberOfLines={2}>
        {item.clientName ? `${item.clientName} – ${item.title}` : item.title}
      </Text>
      <Text style={[styles.tileMeta, { color: colors.inkDim }]}>
        {formatHour(item.startHour)} · {item.durationMins}m
      </Text>
    </View>
  );
}

function DayColumn({ day, items, colors }: {
  day: string;
  items: ScheduleItem[];
  colors: typeof light;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm

  return (
    <View style={styles.dayColumn}>
      <Text style={[styles.dayLabel, { color: colors.inkDim }]}>{day}</Text>
      <View style={[styles.dayGrid, { borderColor: colors.line }]}>
        {hours.map((h) => {
          const slotItems = items.filter((it) => it.startHour === h);
          return (
            <View key={h} style={[styles.hourSlot, { borderBottomColor: colors.line }]}>
              {slotItems.map((item) => (
                <ScheduleTile key={item.id} item={item} colors={colors} />
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.schedule()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.ground }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const days = data?.days ?? [];
  const today = data?.today ?? "";

  return (
    <View style={[styles.container, { backgroundColor: c.ground }]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>SCHEDULE</Text>
        <Text variant="display" style={{ color: c.ink, marginTop: 4 }}>This week</Text>
      </View>

      {/* Time axis + day columns */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.gridRow}>
            {/* Hour labels */}
            <View style={styles.timeAxis}>
              <View style={styles.dayLabel} />
              {Array.from({ length: 12 }, (_, i) => i + 8).map((h) => (
                <View key={h} style={styles.hourSlot}>
                  <Text style={[styles.hourLabel, { color: c.inkDim }]}>{formatHour(h)}</Text>
                </View>
              ))}
            </View>

            {/* Day columns */}
            {days.map((d) => (
              <DayColumn
                key={d.date}
                day={d.label}
                items={d.items}
                colors={c}
              />
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  gridRow: { flexDirection: "row", paddingBottom: 40 },
  timeAxis: { width: 44, paddingTop: 0 },
  dayColumn: { width: 120, marginRight: 8 },
  dayLabel: { height: 30, justifyContent: "center" },
  dayGrid: { borderTopWidth: 1 },
  hourSlot: { minHeight: 64, borderBottomWidth: 0.5, paddingHorizontal: 4, paddingVertical: 2 },
  hourLabel: { fontSize: 10, fontWeight: "600", paddingTop: 2 },
  tile: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 4, marginBottom: 2 },
  tileTitle: { fontSize: 12, fontWeight: "600" },
  tileMeta: { fontSize: 10 },
});
