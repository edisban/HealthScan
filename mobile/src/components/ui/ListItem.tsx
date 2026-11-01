import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface ListItemProps {
  title: string;
  children: React.ReactNode;
}

export const ListItem = ({ title, children }: ListItemProps) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.item, { backgroundColor: theme.palette.background.paper }]}>
      <Text style={[styles.title, { color: theme.palette.text.primary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.palette.text.secondary }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  item: { borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 20 },
});
