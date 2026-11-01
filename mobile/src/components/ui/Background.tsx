import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";

interface BackgroundProps {
  children: React.ReactNode;
}

// Gradient backdrop with soft radial color glows, so glass cards have color to blur
export const Background = ({ children }: BackgroundProps) => {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const [a, b, c] = theme.palette.orbs;
  const glowOpacity = theme.mode === "dark" ? 0.45 : 0.7;
  const orbs = [
    { id: "o1", color: a, cx: width * 0.05, cy: height * 0.12, r: width * 0.75 },
    { id: "o2", color: b, cx: width * 1.0, cy: height * 0.42, r: width * 0.7 },
    { id: "o3", color: c, cx: width * 0.2, cy: height * 0.95, r: width * 0.8 },
  ];

  return (
    <LinearGradient
      colors={theme.palette.background.default as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {orbs.map((o) => (
            <RadialGradient key={o.id} id={o.id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={o.color} stopOpacity={glowOpacity} />
              <Stop offset="1" stopColor={o.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {orbs.map((o) => (
          <Circle key={o.id} cx={o.cx} cy={o.cy} r={o.r} fill={`url(#${o.id})`} />
        ))}
      </Svg>
      <View style={styles.fill}>{children}</View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
