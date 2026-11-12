import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip, Input } from "@/components/ui";
import { scoreColor } from "@/constants/theme";
import type { AppStrings } from "@/constants/strings";
import type { Theme } from "@/constants/theme";
import type { HistoryEntry } from "@/hooks/useHistory";
import type { IconName } from "./shared";
import { historyStyles, styles } from "./styles";

interface HomeContentProps {
  strings: AppStrings;
  theme: Theme;
  manualBarcode: string;
  onManualBarcodeChange: (value: string) => void;
  onManualSubmit: () => void;
  onOpenScanner: () => void;
  onOpenFruitCheck: () => void;
  history: HistoryEntry[];
  onHistorySelect: (barcode: string) => void;
  onHistoryClear: () => void;
}

/** The start screen: scan, fruit check, manual entry, recent scans and how it works. */
export const HomeContent = ({
  strings,
  theme,
  manualBarcode,
  onManualBarcodeChange,
  onManualSubmit,
  onOpenScanner,
  onOpenFruitCheck,
  history,
  onHistorySelect,
  onHistoryClear,
}: HomeContentProps) => {
  const { text } = theme.palette;
  const canSubmit = !!manualBarcode.trim();

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Chip label={strings.aiPowered} icon="sparkles" color={theme.palette.accent.main} />
        <Text style={[styles.heroTitle, { color: text.primary }]}>{strings.subtitle}</Text>
      </View>

      {/* Primary action */}
      <TouchableOpacity activeOpacity={0.9} onPress={onOpenScanner} testID="open-scanner">
        <LinearGradient
          colors={[theme.palette.primary.main, "#0d9488", theme.palette.accent.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scanHero}
        >
          <View style={styles.scanHeroGlow} />
          <View style={styles.scanIconWrap}>
            <Ionicons name="barcode-outline" size={34} color="#fff" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.scanHeroTitle}>{strings.scanCamera}</Text>
            <Text style={styles.scanHeroSub}>{strings.scanSub}</Text>
          </View>
          <View style={styles.scanArrow}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Secondary action */}
      <TouchableOpacity activeOpacity={0.85} onPress={onOpenFruitCheck} testID="open-fruit-check">
        <Card style={styles.rowCard}>
          <View style={[styles.rowIcon, { backgroundColor: theme.palette.success.soft }]}>
            <Ionicons name="nutrition-outline" size={22} color={theme.palette.success.main} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: text.primary }]}>{strings.photoScan}</Text>
            <Text style={[styles.rowSub, { color: text.secondary }]}>{strings.photoScanSub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={text.muted} />
        </Card>
      </TouchableOpacity>

      {/* Manual entry */}
      <Card>
        <Text style={[styles.label, { color: text.secondary }]}>{strings.manualEntry}</Text>
        <View style={styles.inputRow}>
          <Input
            value={manualBarcode}
            onChangeText={onManualBarcodeChange}
            placeholder={strings.placeholder}
            keyboardType="numeric"
            onSubmitEditing={onManualSubmit}
            style={styles.flex}
            testID="barcode-input"
          />
          <TouchableOpacity
            onPress={onManualSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={{ opacity: canSubmit ? 1 : 0.4 }}
            testID="barcode-submit"
            accessibilityRole="button"
            accessibilityLabel={strings.analyze}
          >
            <LinearGradient colors={[theme.palette.primary.main, theme.palette.primary.dark]} style={styles.goBtn}>
              <Ionicons name="search" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Card>

      {history.length > 0 && (
        <View testID="history">
          <View style={historyStyles.header}>
            <Text style={[styles.sectionHeading, { color: text.muted, marginTop: 0, marginBottom: 0 }]}>{strings.recentScans}</Text>
            <TouchableOpacity onPress={onHistoryClear} testID="history-clear">
              <Text style={[historyStyles.clear, { color: theme.palette.primary.main }]}>{strings.clearHistory}</Text>
            </TouchableOpacity>
          </View>
          <Card>
            {history.map((entry, i) => (
              <View key={entry.barcode}>
                {i > 0 && <View style={[historyStyles.divider, { backgroundColor: theme.palette.border }]} />}
                <TouchableOpacity
                  style={historyStyles.row}
                  onPress={() => onHistorySelect(entry.barcode)}
                  activeOpacity={0.8}
                  testID={`history-${entry.barcode}`}
                >
                  <View style={styles.flex}>
                    <Text style={[historyStyles.name, { color: text.primary }]} numberOfLines={1}>
                      {entry.name || strings.unknownProduct}
                    </Text>
                    <Text style={[historyStyles.barcode, { color: text.muted }]}>{entry.barcode}</Text>
                  </View>
                  {entry.healthScore != null && (
                    <View style={[historyStyles.score, { backgroundColor: scoreColor(entry.healthScore) + "22" }]}>
                      <Text style={[historyStyles.scoreText, { color: scoreColor(entry.healthScore) }]}>{entry.healthScore}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* How it works */}
      <Text style={[styles.sectionHeading, { color: text.muted }]}>{strings.howItWorks}</Text>
      <View style={styles.steps}>
        {(
          [
            { icon: "scan-outline", label: strings.step1 },
            { icon: "sparkles-outline", label: strings.step2 },
            { icon: "pulse-outline", label: strings.step3 },
          ] as { icon: IconName; label: string }[]
        ).map((s, i) => (
          <Card key={s.label} style={styles.stepCard}>
            <Text style={[styles.stepNum, { color: text.muted }]}>0{i + 1}</Text>
            <Ionicons name={s.icon} size={22} color={theme.palette.primary.main} />
            <Text style={[styles.stepLabel, { color: text.primary }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      <Text style={[styles.footer, { color: text.muted }]}>{strings.footer}</Text>
    </ScrollView>
  );
};
