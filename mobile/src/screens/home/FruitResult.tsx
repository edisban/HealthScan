import { View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import type { ImageAnalysisResponse } from "@/api/image";
import type { AppStrings } from "@/constants/strings";
import type { Theme } from "@/constants/theme";
import type { IconName } from "./shared";
import { styles } from "./styles";

type FruitResultProps = {
  result: ImageAnalysisResponse;
  strings: AppStrings;
  theme: Theme;
};

export const FruitResult = ({ result, strings, theme }: FruitResultProps) => {
  const { text } = theme.palette;
  const tone =
    result.quality === "good"
      ? { color: theme.palette.success.main, label: strings.qualityGood, icon: "checkmark-circle" as IconName }
      : result.quality === "bad"
      ? { color: theme.palette.error.main, label: strings.qualityBad, icon: "close-circle" as IconName }
      : { color: theme.palette.warning.main, label: strings.qualityUncertain, icon: "help-circle" as IconName };
  const confidence = Math.round(result.confidence);
  // Not a fruit: the title names what the photo shows instead
  const title = result.fruitName || result.detectedObject || "";
  const name = title ? title.charAt(0).toUpperCase() + title.slice(1) : "";

  return (
    <Card style={styles.noPad}>
      {result.imageUri && (
        <View>
          <Image source={{ uri: result.imageUri }} style={styles.fruitImage} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.65)"]} style={styles.fruitOverlay}>
            <Text style={styles.fruitOverline}>
              {result.fruitDetected ? strings.fruitDetected : strings.noFruit}
            </Text>
            {!!name && <Text style={styles.fruitName}>{name}</Text>}
          </LinearGradient>
        </View>
      )}
      <View style={styles.fruitBody}>
        {!result.imageUri && (
          <Text style={[styles.productName, { color: text.primary }]}>{name || strings.noFruit}</Text>
        )}
        {result.fruitDetected && (
          <>
            <View style={styles.qualityRow}>
              <Text style={[styles.label, { color: text.secondary, marginBottom: 0 }]}>{strings.fruitQuality}</Text>
              <View style={[styles.qualityBadge, { backgroundColor: tone.color + "22", borderColor: tone.color + "55" }]}>
                <Ionicons name={tone.icon} size={16} color={tone.color} />
                <Text style={[styles.qualityText, { color: tone.color }]}>{tone.label}</Text>
              </View>
            </View>
            <View style={styles.confRow}>
              <Text style={[styles.infoLabel, { color: text.muted }]}>{strings.confidence}</Text>
              <Text style={[styles.infoLabel, { color: text.primary }]}>{confidence}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.palette.border }]}>
              <View style={[styles.trackFill, { width: `${confidence}%`, backgroundColor: tone.color }]} />
            </View>
          </>
        )}
        <Text style={[styles.body, { color: text.secondary, marginTop: 14 }]}>{result.summary}</Text>
      </View>
    </Card>
  );
};
