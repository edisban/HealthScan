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
                <Chip
                  label={sourceLabel(result.source, strings)}
                  icon={sourceIcon(result.source)}
                  color={theme.palette.accent.main}
                />
              )}
            </View>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.palette.border }]} />
        {result.healthScore == null ? (
          // The analysis failed (e.g. the AI service was down): say so instead of showing a red 0
          <View style={styles.infoBox} testID="score-unavailable">
            <Text style={[styles.body, { color: text.secondary, textAlign: "center" }]}>{strings.scoreUnavailable}</Text>
          </View>
        ) : (
          <Gauge score={score} label={label} caption={strings.healthScore} />
        )}
        {result.healthScore != null && (
          <>
            <ScoreFacts result={result} strings={strings} theme={theme} />
            {!!result.scoreSource && (
              <Text style={[styles.scoreBasis, { color: text.muted }]}>{scoreBasis(result, strings)}</Text>
            )}
          </>
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

// The Nutri-Score letter is printed on many packs, so it stays; the NOVA group is shown in words
const ScoreFacts = ({ result, strings, theme }: ProductResultProps) => {
  const grade = isGrade(result.nutriScore) ? result.nutriScore.toUpperCase() : "";
  const processing = processingLabel(result.novaGroup, strings);
  if (!grade && !processing) return null;
  return (
    <View style={styles.factRow} testID="score-facts">
      {!!grade && <Chip label={`Nutri-Score ${grade}`} icon="nutrition-outline" color={gradeColor(grade, theme)} />}
      {!!processing && (
        <Chip label={processing} icon="construct-outline" color={processingColor(result.novaGroup!, theme)} />
      )}
    </View>
  );
};

const isGrade = (grade?: string): grade is string => !!grade && /^[a-e]$/i.test(grade);

// Green for A and B, amber for C, red for D and E
const gradeColor = (grade: string, theme: Theme): string =>
  grade <= "B" ? theme.palette.success.main : grade === "C" ? theme.palette.warning.main : theme.palette.error.main;

const processingColor = (nova: number, theme: Theme): string =>
  nova <= 2 ? theme.palette.success.main : nova === 3 ? theme.palette.warning.main : theme.palette.error.main;

/** NOVA 1 to 4 in plain words, e.g. "Ultra-processed"; empty when unknown. */
export const processingLabel = (nova: number | null | undefined, strings: AppStrings): string =>
  nova != null && nova >= 1 && nova <= 4 ? strings.processing[nova - 1] : "";

/** Where the score comes from, in a sentence. */
export const scoreBasis = (result: Product, strings: AppStrings): string =>
  result.scoreSource === "Nutri-Score" ? strings.scoreFromNutriScore : strings.scoreEstimated;

/** Database names stay as they are; the app's own sources are translated. */
export const sourceLabel = (source: string, strings: AppStrings): string =>
  source === "Label photo" ? strings.sourceLabelPhoto : source === "Web search" ? strings.sourceWebSearch : source;

const sourceIcon = (source: string): IconName =>
  source === "Label photo" ? "camera-outline" : source === "Web search" ? "globe-outline" : "server-outline";
