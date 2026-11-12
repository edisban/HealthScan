import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Button, IconButton, Input, Card, Gauge, Chip, Background } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProduct } from "@/hooks/useProduct";
import { useCamera } from "@/hooks/useCamera";
import { useImageAnalysis } from "@/hooks/useImageAnalysis";
import type { AppStrings } from "@/constants/strings";
import type { Theme } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export const HomeScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { lang, setLang, strings } = useLanguage();
  const { granted } = useCamera();
  const {
    result,
    loading,
    loadingKind,
    error,
    fetchProduct,
    analyzeLabel,
    skipWebSearch,
    reset,
  } = useProduct(lang);
  const {
    result: imageResult,
    loading: imageLoading,
    error: imageError,
    pickImage,
    takePhoto,
    reset: resetImage,
  } = useImageAnalysis();
  const [manualBarcode, setManualBarcode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoSource, setShowPhotoSource] = useState(false);
  const { text } = theme.palette;

  const isHome = !result && !loading && !error && !imageResult && !imageLoading && !imageError;

  const handleManual = () => {
    if (manualBarcode.trim()) fetchProduct(manualBarcode.trim());
  };

  const handleReset = () => {
    reset();
    resetImage();
    setManualBarcode("");
    setShowScanner(false);
  };

  return (
    <Background>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.brand} onPress={handleReset} activeOpacity={0.8}>
            <LinearGradient
              colors={[theme.palette.primary.main, theme.palette.accent.main]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Ionicons name="leaf" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.brandText, { color: text.primary }]}>{strings.appTitle}</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <LangToggle lang={lang} onChange={setLang} theme={theme} />
            <IconButton icon={isDark ? "sunny-outline" : "moon-outline"} onPress={toggleTheme} size={40} />
          </View>
        </View>

        {isHome && (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Chip label={strings.aiPowered} icon="sparkles" color={theme.palette.accent.main} />
              <Text style={[styles.heroTitle, { color: text.primary }]}>{strings.subtitle}</Text>
            </View>

            {/* Primary action */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShowScanner(true)}>
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
            <TouchableOpacity activeOpacity={0.85} onPress={() => setShowPhotoSource(true)}>
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
                  onChangeText={setManualBarcode}
                  placeholder={strings.placeholder}
                  keyboardType="numeric"
                  onSubmitEditing={handleManual}
                  style={styles.flex}
                />
                <TouchableOpacity
                  onPress={handleManual}
                  disabled={!manualBarcode.trim()}
                  activeOpacity={0.85}
                  style={{ opacity: manualBarcode.trim() ? 1 : 0.4 }}
                >
                  <LinearGradient
                    colors={[theme.palette.primary.main, theme.palette.primary.dark]}
                    style={styles.goBtn}
                  >
                    <Ionicons name="search" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Card>

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
        )}

        {(loading || imageLoading) && (
          <View style={styles.centerFill}>
            <Card style={styles.stateCard}>
              <View style={[styles.stateIcon, { backgroundColor: theme.palette.primary.main + "22" }]}>
                <ActivityIndicator size="large" color={theme.palette.primary.main} />
              </View>
              <Text style={[styles.stateTitle, { color: text.primary }]}>
                {!loading
                  ? strings.photoLoading
                  : loadingKind === "label"
                  ? strings.labelLoading
                  : loadingKind === "web"
                  ? strings.webLoading
                  : strings.loading}
              </Text>
              {loading && (
                <Text style={[styles.stateSub, { color: text.secondary }]}>
                  {loadingKind === "label"
                    ? strings.labelLoadingSub
                    : loadingKind === "web"
                    ? strings.webLoadingSub
                    : strings.loadingSub}
                </Text>
              )}
              {loading && loadingKind === "web" && (
                <Button variant="ghost" onPress={skipWebSearch} style={styles.fullWidth}>
                  {strings.webSearchSkip}
                </Button>
              )}
            </Card>
          </View>
        )}

        {(error || imageError) && (
          <View style={styles.centerFill}>
            <Card style={styles.stateCard}>
              <View style={[styles.stateIcon, { backgroundColor: theme.palette.error.soft }]}>
                <Ionicons name="cloud-offline-outline" size={30} color={theme.palette.error.main} />
              </View>
              <Text style={[styles.stateTitle, { color: text.primary }]}>
                {error ? strings.error : strings.photoError}
              </Text>
              <Text style={[styles.stateSub, { color: text.secondary }]}>{error || imageError}</Text>
              <Button onPress={handleReset} icon="refresh" style={styles.fullWidth}>
                {strings.retry}
              </Button>
            </Card>
          </View>
        )}

        {result && !loading && !error && (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {result.found === false ? (
              <NotFound
                barcode={result.barcode}
                strings={strings}
                theme={theme}
                onLabelPhoto={() => analyzeLabel(result.barcode, "camera")}
                onLabelLibrary={() => analyzeLabel(result.barcode, "library")}
              />
            ) : (
              <ProductResult result={result} strings={strings} theme={theme} />
            )}
            <Button
              onPress={handleReset}
              icon="scan-outline"
              variant={result.found === false ? "ghost" : "primary"}
            >
              {strings.rescan}
            </Button>
          </ScrollView>
        )}

        {imageResult && (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <FruitResult result={imageResult} strings={strings} theme={theme} />
            <Button onPress={handleReset} icon="camera-outline">
              {strings.close}
            </Button>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ScannerModal
        visible={showScanner}
        granted={granted}
        strings={strings}
        onRequestClose={() => setShowScanner(false)}
        onBarcodeScanned={(data: string) => {
          if (!data || loading) return;
          setShowScanner(false);
          fetchProduct(data);
        }}
      />

      <PhotoSourceModal
        visible={showPhotoSource}
        strings={strings}
        theme={theme}
        onRequestClose={() => setShowPhotoSource(false)}
        onTakePhoto={() => {
          setShowPhotoSource(false);
          takePhoto();
        }}
        onPickImage={() => {
          setShowPhotoSource(false);
          pickImage();
        }}
      />
    </Background>
  );
};

const LangToggle = ({
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
        >
          <Text style={[styles.segmentText, { color: active ? "#fff" : theme.palette.text.secondary }]}>
            {l.toUpperCase()}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

type ProductResultProps = {
  result: NonNullable<ReturnType<typeof useProduct>["result"]>;
  strings: AppStrings;
  theme: Theme;
};

const ProductResult = ({ result, strings, theme }: ProductResultProps) => {
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
    </>
  );
};

const sourceIcon = (source: string): IconName =>
  source === "Label photo" ? "camera-outline" : source === "Web search" ? "globe-outline" : "server-outline";

type NotFoundProps = {
  barcode: string;
  strings: AppStrings;
  theme: Theme;
  onLabelPhoto: () => void;
  onLabelLibrary: () => void;
};

const NotFound = ({ barcode, strings, theme, onLabelPhoto, onLabelLibrary }: NotFoundProps) => {
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

type FruitResultProps = {
  result: NonNullable<ReturnType<typeof useImageAnalysis>["result"]>;
  strings: AppStrings;
  theme: Theme;
};

const FruitResult = ({ result, strings, theme }: FruitResultProps) => {
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

const CardTitle = ({ icon, color, title, theme }: { icon: IconName; color: string; title: string; theme: Theme }) => (
  <View style={styles.cardTitleRow}>
    <View style={[styles.cardTitleIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={[styles.cardTitle, { color: theme.palette.text.primary }]}>{title}</Text>
  </View>
);

const ListCard = ({
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

interface PhotoSourceModalProps {
  visible: boolean;
  strings: AppStrings;
  theme: Theme;
  onRequestClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
}

const PhotoSourceModal = ({ visible, strings, theme, onRequestClose, onTakePhoto, onPickImage }: PhotoSourceModalProps) => {
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

interface ScannerModalProps {
  visible: boolean;
  granted: boolean;
  strings: AppStrings;
  onRequestClose: () => void;
  onBarcodeScanned: (data: string) => void;
}

const FRAME_W = 280;
const FRAME_H = 180;

const ScannerModal = ({ visible, granted, strings, onRequestClose, onBarcodeScanned }: ScannerModalProps) => {
  const [scanned, setScanned] = useState(false);
  // The camera fires several events per barcode before state updates; a ref blocks the repeats immediately
  const scannedRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const pulse = useRef(new Animated.Value(0)).current;
  const scanLineTop = pulse.interpolate({ inputRange: [0, 1], outputRange: [10, FRAME_H - 12] });

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      setScanned(false);
    }
  }, [visible]);

  const handleScan = ({ data }: { data: string }) => {
    if (!data || scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);
    onBarcodeScanned(data);
  };

  const hasCamera = granted && permission?.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onRequestClose}>
      <View style={styles.scanner}>
        {hasCamera ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
              onBarcodeScanned={scanned ? undefined : handleScan}
            />
            {/* Dimmed surround with a clear window for the barcode */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.dim} />
              <View style={{ flexDirection: "row", height: FRAME_H }}>
                <View style={styles.dim} />
                <View style={styles.frame}>
                  {(["tl", "tr", "bl", "br"] as const).map((c) => (
                    <View key={c} style={[styles.corner, styles[c]]} />
                  ))}
                  <Animated.View style={[styles.scanLine, { top: scanLineTop }]} />
                </View>
                <View style={styles.dim} />
              </View>
              <View style={[styles.dim, styles.dimBottom]}>
                <View style={styles.hintPill}>
                  <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                  <Ionicons name="barcode-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.hintText}>{strings.hint}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.centerFill}>
            <View style={[styles.stateIcon, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Ionicons name="camera-outline" size={30} color="#fff" />
            </View>
            <Text style={[styles.stateTitle, { color: "#fff" }]}>{strings.scannerTitle}</Text>
            <Text style={[styles.stateSub, { color: "#cbd5e1" }]}>{strings.noCamera}</Text>
            <Button onPress={requestPermission} icon="lock-open-outline" style={{ minWidth: 220 }}>
              {strings.grant}
            </Button>
          </View>
        )}

        {/* Top bar */}
        <View style={styles.scannerTop}>
          <Text style={styles.scannerTitle}>{strings.scannerTitle}</Text>
          <TouchableOpacity onPress={onRequestClose} style={styles.closeCircle} activeOpacity={0.8}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const CORNER = 26;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fullWidth: { alignSelf: "stretch", marginTop: 6 },
  scroll: { paddingHorizontal: 18, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 12,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  logo: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  brandText: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  segment: { flexDirection: "row", borderRadius: 999, borderWidth: 1, padding: 3 },
  segmentItem: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  segmentText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },

  hero: { marginTop: 10, marginBottom: 20, alignItems: "flex-start" },
  heroTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8, lineHeight: 38, marginTop: 4 },

  scanHero: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    padding: 20,
    minHeight: 120,
    marginBottom: 14,
    overflow: "hidden",
  },
  scanHeroGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -60,
    top: -90,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  scanIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  scanHeroTitle: { color: "#fff", fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  scanHeroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 4 },
  scanArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  rowCard: { flexDirection: "row", alignItems: "center" },
  rowIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 14 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowSub: { fontSize: 13, marginTop: 2 },

  label: { fontSize: 13, fontWeight: "600", marginBottom: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  goBtn: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  sectionHeading: { fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 8, marginBottom: 10 },
  steps: { flexDirection: "row", gap: 10 },
  stepCard: { flex: 1, padding: 14, alignItems: "flex-start", gap: 8 },
  stepNum: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  stepLabel: { fontSize: 13, fontWeight: "700" },
  footer: { textAlign: "center", fontSize: 12, marginTop: 18 },

  centerFill: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  stateCard: { alignSelf: "stretch", alignItems: "center", paddingVertical: 28 },
  stateIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  stateTitle: { fontSize: 19, fontWeight: "800", textAlign: "center" },
  stateSub: { fontSize: 14, textAlign: "center", marginTop: 6, marginBottom: 18, lineHeight: 20 },

  productCard: { paddingBottom: 22 },
  productHeader: { flexDirection: "row", alignItems: "center" },
  productImageWrap: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  productImage: { width: 74, height: 74, resizeMode: "contain" },
  productName: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  divider: { height: 1, marginVertical: 16 },

  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitleIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 15, lineHeight: 22 },
  infoBox: { borderRadius: 16, borderWidth: 1, padding: 12, marginTop: 14 },
  infoLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, marginBottom: 4 },
  listItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  listIcon: { marginRight: 10, marginTop: 2 },

  notFoundCard: { alignItems: "center", paddingTop: 26 },
  notFoundChip: { marginTop: 10 },
  notFoundSub: { marginBottom: 14 },
  fullWidthOption: { alignSelf: "stretch" },

  noPad: { padding: 0 },
  fruitImage: { width: "100%", height: 260, resizeMode: "cover" },
  fruitOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 18, paddingTop: 60 },
  fruitOverline: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  fruitName: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  fruitBody: { padding: 18 },
  qualityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  qualityText: { fontWeight: "800", fontSize: 14 },
  confRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  trackFill: { height: 8, borderRadius: 4 },

  sheetBackdrop: { ...StyleSheet.absoluteFill },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
    overflow: "hidden",
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 16, opacity: 0.5 },
  sheetTitle: { fontSize: 21, fontWeight: "800" },
  sheetSub: { fontSize: 14, marginTop: 4, marginBottom: 18 },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },

  scanner: { flex: 1, backgroundColor: "#000" },
  scannerTop: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 36,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scannerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  closeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  dimBottom: { alignItems: "center", paddingTop: 28 },
  frame: { width: FRAME_W, height: FRAME_H },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: "#10b981" },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  hintPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  hintText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
