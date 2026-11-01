import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}

// Frosted glass panel: blur + translucent fill + hairline border + top sheen
export const Card = ({ children, intensity = 40, style }: CardProps) => {
  const { theme } = useTheme();
  const { glass } = theme.palette;
  return (
    <View style={[styles.card, { backgroundColor: glass.fill, borderColor: glass.border }, style]}>
      <BlurView intensity={intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[glass.sheen, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 18,
    marginBottom: 14,
    overflow: "hidden",
  },
});
