import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import type { Theme } from "@/constants/theme";
import { styles } from "./styles";

export type IconName = keyof typeof Ionicons.glyphMap;

export const CardTitle = ({ icon, color, title, theme }: { icon: IconName; color: string; title: string; theme: Theme }) => (
  <View style={styles.cardTitleRow}>
    <View style={[styles.cardTitleIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={[styles.cardTitle, { color: theme.palette.text.primary }]}>{title}</Text>
  </View>
);

export const ListCard = ({
  title,
  items,
  icon,
  color,
  empty,
  theme,
}: {
  title: string;
  items?: string[];
  icon: IconName;
  color: string;
  empty: string;
  theme: Theme;
}) => (
  <Card>
    <CardTitle icon={icon} color={color} title={title} theme={theme} />
    {(items || []).length === 0 ? (
      <Text style={[styles.body, { color: theme.palette.text.muted }]}>{empty}</Text>
    ) : (
      (items || []).map((item, i) => (
        <View key={i} style={styles.listItem}>
          <Ionicons name={icon} size={18} color={color} style={styles.listIcon} />
          <Text style={[styles.body, styles.flex, { color: theme.palette.text.primary }]}>{item}</Text>
        </View>
      ))
    )}
  </Card>
);
