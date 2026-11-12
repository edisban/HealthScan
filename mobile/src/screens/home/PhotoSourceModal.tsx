import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import type { AppStrings } from "@/constants/strings";
import type { Theme } from "@/constants/theme";
import type { IconName } from "./shared";
import { styles } from "./styles";

interface PhotoSourceModalProps {
  visible: boolean;
  strings: AppStrings;
  theme: Theme;
  onRequestClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
}

export const PhotoSourceModal = ({ visible, strings, theme, onRequestClose, onTakePhoto, onPickImage }: PhotoSourceModalProps) => {
  const { text } = theme.palette;
  const options: { icon: IconName; title: string; sub: string; color: string; onPress: () => void }[] = [
    { icon: "camera", title: strings.takePhoto, sub: strings.takePhotoSub, color: theme.palette.primary.main, onPress: onTakePhoto },
    { icon: "images", title: strings.chooseFromLibrary, sub: strings.chooseFromLibrarySub, color: theme.palette.accent.main, onPress: onPickImage },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onRequestClose}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableOpacity>
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { borderColor: theme.palette.glass.border }]}>
          <BlurView intensity={80} tint={theme.palette.glass.tint} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.mode === "dark" ? "rgba(15,22,48,0.6)" : "rgba(255,255,255,0.6)" }]} />
          <View style={[styles.grabber, { backgroundColor: text.muted }]} />
          <Text style={[styles.sheetTitle, { color: text.primary }]}>{strings.imageAnalysis}</Text>
          <Text style={[styles.sheetSub, { color: text.secondary }]}>{strings.imageAnalysisSub}</Text>
          {options.map((o) => (
            <TouchableOpacity
              key={o.title}
              onPress={o.onPress}
              activeOpacity={0.85}
              style={[styles.sheetOption, { backgroundColor: theme.palette.glass.fill, borderColor: theme.palette.border }]}
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
          <Button variant="ghost" onPress={onRequestClose} style={{ marginTop: 4 }}>
            {strings.close}
          </Button>
        </View>
      </View>
    </Modal>
  );
};
