import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

interface ChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export const Chip = ({ label, icon, color }: ChipProps) => {
  const { theme } = useTheme();
  const fg = color ?? theme.palette.text.secondary;
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: color ? color + "1f" : theme.palette.background.surface,
          borderColor: color ? color + "44" : theme.palette.border,
        },
      ]}
    >
      {icon && <Ionicons name={icon} size={13} color={fg} style={{ marginRight: 5 }} />}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  text: { fontSize: 13, fontWeight: "600" },
});
