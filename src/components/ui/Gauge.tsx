import { View, Text, StyleSheet } from "react-native";
import { scoreColor } from "@/constants/theme";

interface GaugeProps {
  score: number;
  size?: number;
}

export const Gauge = ({ score, size = 110 }: GaugeProps) => {
  const color = scoreColor(score);
  const label =
    score >= 70 ? "Υψηλή Διατροφική Αξία" : score >= 45 ? "Μέτρια Αξία" : "Προσοχή στα Συστατικά";

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.gauge,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
        ]}
      >
        <Text style={[styles.text, { color }]}>{score}%</Text>
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginTop: 12 },
  gauge: { borderWidth: 8, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 26, fontWeight: "800" },
  label: { marginTop: 6, fontWeight: "700" },
});
