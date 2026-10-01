import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { api, setToken } from "@/lib/api";
import { light, dark } from "@/lib/colors";

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.login(email, password);
      await setToken(token);
      router.replace("/(tabs)/focus");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.ground }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={[styles.wordmark, { color: c.ink }]}>
          Strobe<Text style={{ color: c.accent }}>.</Text>
        </Text>
        <Text style={[styles.lead, { color: c.inkDim }]}>
          Sign in to continue
        </Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: c.accentDim, borderColor: c.accent + "44" }]}>
            <Text style={[styles.errorText, { color: c.accent }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.field, { borderColor: c.line, backgroundColor: c.panel }]}>
          <TextInput
            style={[styles.input, { color: c.ink }]}
            placeholder="Email"
            placeholderTextColor={c.inkDim}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={[styles.field, { borderColor: c.line, backgroundColor: c.panel }]}>
          <TextInput
            style={[styles.input, { color: c.ink }]}
            placeholder="Password"
            placeholderTextColor={c.inkDim}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.accent, opacity: loading ? 0.7 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 14 },
  wordmark: { fontFamily: "EBGaramond_500Medium", fontSize: 34, marginBottom: 4 },
  lead: { fontFamily: "EBGaramond_400Regular_Italic", fontSize: 18, marginBottom: 8 },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13, fontWeight: "600" },
  field: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  button: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
