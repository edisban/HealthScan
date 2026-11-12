import { View, Text, TouchableOpacity } from "react-native";
import type { Theme } from "@/constants/theme";
import { styles } from "./styles";

export const LangToggle = ({
  lang,
  onChange,
  theme,
}: {
  lang: "el" | "en";
  onChange: (l: "el" | "en") => void;
  theme: Theme;
}) => (
  <View style={[styles.segment, { backgroundColor: theme.palette.glass.fill, borderColor: theme.palette.glass.border }]}>
    {(["el", "en"] as const).map((l) => {
      const active = l === lang;
      return (
        <TouchableOpacity
          key={l}
          onPress={() => onChange(l)}
          style={[styles.segmentItem, active && { backgroundColor: theme.palette.primary.main }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Language ${l.toUpperCase()}`}
        >
          <Text style={[styles.segmentText, { color: active ? "#fff" : theme.palette.text.secondary }]}>
            {l.toUpperCase()}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
