import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip } from "@/components/ui";
import type { AppStrings } from "@/constants/strings";
import type { Theme } from "@/constants/theme";
import type { IconName } from "./shared";
import { styles } from "./styles";

type NotFoundProps = {
  barcode: string;
  strings: AppStrings;
  theme: Theme;
  onLabelPhoto: () => void;
  onLabelLibrary: () => void;
};

export const NotFound = ({ barcode, strings, theme, onLabelPhoto, onLabelLibrary }: NotFoundProps) => {
  const { text } = theme.palette;
  const options: { icon: IconName; title: string; sub: string; color: string; onPress: () => void }[] = [
    { icon: "camera", title: strings.labelPhoto, sub: strings.labelPhotoSub, color: theme.palette.primary.main, onPress: onLabelPhoto },
    { icon: "images", title: strings.labelLibrary, sub: strings.labelLibrarySub, color: theme.palette.accent.main, onPress: onLabelLibrary },
  ];

  return (
    <Card style={styles.notFoundCard}>
      <View style={[styles.stateIcon, { backgroundColor: theme.palette.warning.soft }]}>
        <Ionicons name="search-outline" size={30} color={theme.palette.warning.main} />
      </View>
      <Text style={[styles.stateTitle, { color: text.primary }]}>{strings.notFoundTitle}</Text>
      <View style={styles.notFoundChip}>
        <Chip label={barcode} icon="barcode-outline" />
      </View>
      <Text style={[styles.stateSub, styles.notFoundSub, { color: text.secondary }]}>{strings.notFoundSub}</Text>
      {options.map((o) => (
        <TouchableOpacity
          key={o.title}
          onPress={o.onPress}
          activeOpacity={0.85}
          style={[styles.sheetOption, styles.fullWidthOption, { backgroundColor: theme.palette.glass.fill, borderColor: theme.palette.border }]}
        >
          <View style={[styles.rowIcon, { backgroundColor: o.color + "22" }]}>
            <Ionicons name={o.icon} size={22} color={o.color} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: text.primary }]}>{o.title}</Text>
            <Text style={[styles.rowSub, { color: text.secondary }]}>{o.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={text.muted} />
        </TouchableOpacity>
      ))}
    </Card>
  );
};
