import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip, Gauge } from "@/components/ui";
import type { Product } from "@/api/types";
import type { AppStrings } from "@/constants/strings";
import type { Theme } from "@/constants/theme";
import { CardTitle, ListCard, IconName } from "./shared";
import { styles } from "./styles";

type ProductResultProps = {
  result: Product;
  strings: AppStrings;
  theme: Theme;
};

export const ProductResult = ({ result, strings, theme }: ProductResultProps) => {
  const { text } = theme.palette;
  const score = result.healthScore ?? 0;
  const label = score >= 70 ? strings.scoreLabelHigh : score >= 45 ? strings.scoreLabelMid : strings.scoreLabelLow;

  return (
    <>
      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productImageWrap}>
            {result.imageUrl ? (
              <Image source={{ uri: result.imageUrl }} style={styles.productImage} />
            ) : (
              <Ionicons name="cube-outline" size={34} color="#94a3b8" />
            )}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.productName, { color: text.primary }]} numberOfLines={3}>
              {result.name || strings.unknownProduct}
            </Text>
            <View style={styles.chipRow}>
              <Chip label={result.barcode} icon="barcode-outline" />
              {!!result.origin && <Chip label={result.origin} icon="location-outline" />}
              {!!result.source && (
                <Chip label={result.source} icon={sourceIcon(result.source)} color={theme.palette.accent.main} />
              )}
            </View>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.palette.border }]} />
        <Gauge score={score} label={label} caption={strings.healthScore} />
        {!!result.scoreSource && (
          <Text style={[styles.scoreBasis, { color: text.muted }]}>{scoreBasis(result, strings)}</Text>
        )}
      </Card>

      <Card>
        <CardTitle icon="sparkles" color={theme.palette.accent.main} title={strings.aiAnalysis} theme={theme} />
        <Text style={[styles.body, { color: text.secondary }]}>
          {result.explanation || result.summary || strings.none}
        </Text>
        {!!result.nutrition && (
          <View style={[styles.infoBox, { backgroundColor: theme.palette.background.surface, borderColor: theme.palette.border }]}>
            <Text style={[styles.infoLabel, { color: text.muted }]}>{strings.nutrition}</Text>
            <Text style={[styles.body, { color: text.primary }]}>{result.nutrition}</Text>
          </View>
        )}
      </Card>

      <ListCard
        title={strings.pros}
        items={result.pros}
        icon="checkmark-circle"
        color={theme.palette.success.main}
        empty={strings.none}
        theme={theme}
      />
      <ListCard
        title={strings.cons}
        items={result.cons}
        icon="alert-circle"
        color={theme.palette.error.main}
        empty={strings.none}
        theme={theme}
      />

      {(result.ingredients || []).length > 0 && (
        <Card>
          <CardTitle icon="list-outline" color={theme.palette.primary.main} title={strings.ingredients} theme={theme} />
          <View style={styles.chipRow}>
            {result.ingredients.map((ing, i) => (
              <Chip key={i} label={ing.trim()} />
            ))}
          </View>
        </Card>
      )}
      <Text style={[styles.disclaimer, { color: text.muted }]}>{strings.disclaimer}</Text>
    </>
  );
};

// "Calculated from Nutri-Score C · NOVA 4" or "AI estimate"
export const scoreBasis = (result: Product, strings: AppStrings): string => {
  if (result.scoreSource !== "Nutri-Score") return strings.scoreEstimated;
  const grade = result.nutriScore ? ` ${result.nutriScore.toUpperCase()}` : "";
  const nova = result.novaGroup ? ` · NOVA ${result.novaGroup}` : "";
  return `${strings.scoreFromNutriScore}${grade}${nova}`;
};

const sourceIcon = (source: string): IconName =>
  source === "Label photo" ? "camera-outline" : source === "Web search" ? "globe-outline" : "server-outline";
