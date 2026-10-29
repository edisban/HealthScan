import { TextInput, StyleSheet, TextStyle } from "react-native";

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: TextStyle;
  keyboardType?: "numeric" | "default";
}

export const Input = ({
  value,
  onChangeText,
  placeholder,
  style,
  keyboardType = "default",
}: InputProps) => (
  <TextInput
    style={[styles.input, style]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#94a3b8"
    keyboardType={keyboardType}
  />
);

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
});
