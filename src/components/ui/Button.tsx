import { TouchableOpacity, Text, StyleSheet, TextStyle, ViewStyle, StyleProp, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

type IconName = keyof typeof Ionicons.glyphMap;

interface ButtonProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  onPress?: () => void;
  disabled?: boolean;
  icon?: IconName;
  variant?: "primary" | "ghost";
  children: React.ReactNode;
}

export const Button = ({
  style,
  textStyle,
  onPress,
  disabled,
  icon,
  variant = "primary",
  children,
}: ButtonProps) => {
  const { theme } = useTheme();
  const isPrimary = variant === "primary";
  const color = isPrimary ? "#fff" : theme.palette.text.primary;
  const content = (
    <View style={styles.row}>
      {icon && <Ionicons name={icon} size={18} color={color} style={{ marginRight: 8 }} />}
      <Text style={[styles.text, { color }, textStyle]}>{children}</Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={[styles.base, { opacity: disabled ? 0.45 : 1 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[theme.palette.primary.main, theme.palette.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inner}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.inner,
            { backgroundColor: theme.palette.glass.fill, borderColor: theme.palette.glass.border, borderWidth: 1 },
          ]}
        >
          {content}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const IconButton = ({ icon, onPress, size = 42, style }: IconButtonProps) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.iconBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.palette.glass.fill,
          borderColor: theme.palette.glass.border,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.45} color={theme.palette.text.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { borderRadius: 16, overflow: "hidden" },
  inner: { paddingVertical: 15, paddingHorizontal: 18, alignItems: "center", borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  text: { fontWeight: "700", fontSize: 16, letterSpacing: 0.2 },
  iconBtn: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
