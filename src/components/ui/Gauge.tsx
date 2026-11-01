import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { scoreColor } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

interface GaugeProps {
  score: number;
  label: string;
  caption?: string;
  size?: number;
}

// Circular score ring; the arc length shows the 0-100 score
export const Gauge = ({ score, label, caption, size = 150 }: GaugeProps) => {
  const { theme } = useTheme();
  const color = scoreColor(score);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={1} />
              <Stop offset="1" stopColor={color} stopOpacity={0.55} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.palette.border}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#ring)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.score, { color: theme.palette.text.primary }]}>{clamped}</Text>
          {caption && <Text style={[styles.caption, { color: theme.palette.text.muted }]}>{caption}</Text>}
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginTop: 8 },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  score: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  caption: { fontSize: 12, fontWeight: "600", marginTop: -2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  label: { fontWeight: "700", fontSize: 13 },
});
