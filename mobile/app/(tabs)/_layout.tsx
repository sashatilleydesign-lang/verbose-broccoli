import { Tabs } from "expo-router";
import { Text, useColorScheme } from "react-native";
import { light, dark } from "../../lib/colors";

function TabIcon({ label, active, color }: { label: string; active: boolean; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{label}</Text>;
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
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.inkDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" as const, letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="focus"
        options={{
          title: "Focus",
          tabBarIcon: ({ color }) => <TabIcon label="◉" active={false} color={color} />,
        }}
      />
      <Tabs.Screen
        name="weekly"
        options={{
          title: "Weekly",
          tabBarIcon: ({ color }) => <TabIcon label="≡" active={false} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color }) => <TabIcon label="◎" active={false} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => <TabIcon label="▦" active={false} color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ color }) => <TabIcon label="⊕" active={false} color={color} />,
        }}
      />
    </Tabs>
  );
}
