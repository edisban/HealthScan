import { TouchableOpacity, Text, StyleSheet, TextStyle, ViewStyle } from "react-native";

interface ButtonProps {
  style?: ViewStyle;
  textStyle?: TextStyle;
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button = ({
  style,
  textStyle,
  onPress,
  disabled,
  children,
}: ButtonProps) => (
  <TouchableOpacity
    style={[styles.base, style]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <Text style={[styles.text, textStyle]}>{children}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  base: { padding: 14, borderRadius: 12, alignItems: "center" },
  text: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
