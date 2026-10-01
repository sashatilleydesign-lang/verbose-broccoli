import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { light, dark } from "@/lib/colors";
import Svg, { Path, Circle } from "react-native-svg";

function FocusIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" fill={color} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function WeeklyIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </Svg>
  );
}

function ClientsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" />
      <Path d="M2 20c0-4 3.1-7 7-7s7 3 7 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M16 11c2.2 0 4 1.8 4 4v1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function ScheduleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M3 12h18M3 18h12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function CaptureIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export default function TabLayout() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.panel,
          borderTopColor: c.line,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.inkDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="focus"
        options={{
          title: "Focus",
          tabBarIcon: ({ color }) => <FocusIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="weekly"
        options={{
          title: "Weekly",
          tabBarIcon: ({ color }) => <WeeklyIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color }) => <ClientsIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => <ScheduleIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ color }) => <CaptureIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
