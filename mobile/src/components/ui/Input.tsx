import { TextInput, StyleSheet, TextStyle, StyleProp } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  keyboardType?: "numeric" | "default";
  onSubmitEditing?: () => void;
  testID?: string;
}

export const Input = ({
  value,
  onChangeText,
  placeholder,
  style,
  keyboardType = "default",
  onSubmitEditing,
  testID,
}: InputProps) => {
  const { theme } = useTheme();
  return (
    <TextInput
      style={[
        styles.input,
        {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.inputBg,
          borderColor: theme.palette.border,
        },
        style,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.palette.text.muted}
      keyboardType={keyboardType}
      returnKeyType="search"
      onSubmitEditing={onSubmitEditing}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
});
