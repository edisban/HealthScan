import { View, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

interface CardProps {
  children: React.ReactNode;
  tint?: "light" | "dark";
  intensity?: number;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
}

export const Card = ({
  children,
  tint = "light",
  intensity = 40,
  style,
  containerStyle,
}: CardProps) => (
  <View style={[StyleSheet.flatten([styles.card, containerStyle, style])]}>
    <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12, overflow: "hidden" },
});
