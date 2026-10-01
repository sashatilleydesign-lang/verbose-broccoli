import { Text as RNText, TextProps, StyleSheet, Platform } from "react-native";
import { useColors } from "../lib/colors";

type Variant = "display" | "title" | "reading" | "body" | "label" | "mono";

type Props = TextProps & {
  variant?: Variant;
  dim?: boolean;
  accent?: boolean;
};

export function Text({ variant = "body", dim, accent, style, ...props }: Props) {
  const c = useColors();
  const color = accent ? c.accent : dim ? c.inkDim : c.ink;
  return <RNText style={[styles[variant], { color }, style]} {...props} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: "EBGaramond_500Medium", fontSize: 36, lineHeight: 40 },
  title:   { fontFamily: "EBGaramond_500Medium", fontSize: 24, lineHeight: 28 },
  reading: { fontFamily: "EBGaramond_400Regular_Italic", fontSize: 17, lineHeight: 26 },
  body:    { fontFamily: "System", fontSize: 15, lineHeight: 22 },
  label:   { fontFamily: "System", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  mono:    { fontFamily: Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" }), fontSize: 11, letterSpacing: 0.2 },
});
