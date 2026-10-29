import { View, Text, StyleSheet, ViewStyle } from "react-native";

interface SectionProps {
  children: React.ReactNode;
  style?: ViewStyle;
  title?: string;
}

export const Section = ({ children, style, title }: SectionProps) => (
  <View style={[StyleSheet.flatten([styles.section, style])]}>
    {title && <Text style={styles.title}>{title}</Text>}
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
});
