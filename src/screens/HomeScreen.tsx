import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Input, Card, Gauge } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProduct } from "@/hooks/useProduct";
import { useCamera } from "@/hooks/useCamera";
import { useImageAnalysis } from "@/hooks/useImageAnalysis";

export const HomeScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { lang, strings } = useLanguage();
  const { granted } = useCamera();
  const { result, loading, error, fetchProduct, reset } = useProduct(lang);
  const { result: imageResult, loading: imageLoading, error: imageError, pickImage, reset: resetImage } = useImageAnalysis();
  const [manualBarcode, setManualBarcode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);

  const bgColors = theme.palette.background.default as unknown as readonly [string, string];
  const gradientColors = ["#6366f1", "#4f46e5"] as readonly [string, string];

  const handleManual = () => {
    if (manualBarcode) fetchProduct(manualBarcode);
  };

  const handleReset = () => {
    reset();
    setManualBarcode("");
    setScanned(false);
    setShowScanner(false);
    resetImage();
  };

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.palette.text.primary }]}>
          {strings.appTitle}
        </Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity onPress={() => {}} style={{ marginRight: 12 }}>
            <Text style={{ color: theme.palette.text.secondary, fontWeight: "700" }}>
              {lang === "el" ? "EN" : "EL"}
            </Text>
          </TouchableOpacity>
          <Text style={{ color: theme.palette.text.secondary, marginRight: 8 }}>🌙</Text>
          <Button onPress={toggleTheme} style={{ backgroundColor: theme.palette.border }}>
            {isDark ? "☀️" : "🌙"}
          </Button>
        </View>
      </View>
      <Text style={[styles.subtitle, { color: theme.palette.text.secondary }]}>
        {strings.subtitle}
      </Text>

      {!result && !loading && !error && !imageResult && !imageLoading && !imageError && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.scanOptions}>
            <TouchableOpacity style={styles.scanCard} onPress={() => setShowScanner(true)}>
              <LinearGradient colors={gradientColors} style={styles.scanGradient}>
                <Text style={styles.scanIcon}>📷</Text>
                <Text style={[styles.scanTitle, { color: "#fff" }]}>{strings.scanCamera}</Text>
                <Text style={[styles.scanSub, { color: "#eafff3" }]}>{strings.scanSub}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.scanCard} onPress={pickImage}>
              <LinearGradient colors={["#10b981", "#059669"]} style={styles.scanGradient}>
                <Text style={styles.scanIcon}>🍎</Text>
                <Text style={[styles.scanTitle, { color: "#fff" }]}>{strings.photoScan}</Text>
                <Text style={[styles.scanSub, { color: "#eafff3" }]}>{strings.photoScanSub}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Card tint={theme.mode} style={styles.card} containerStyle={styles.card}>
            <BlurView intensity={40} tint={theme.mode} style={StyleSheet.absoluteFill} />
            <Text style={[styles.cardTitle, { color: theme.palette.text.primary }]}>
              {strings.manualEntry}
            </Text>
            <Input
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder={strings.placeholder}
              keyboardType="numeric"
              style={{
                color: theme.palette.text.primary,
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.inputBg,
              }}
            />
            <Button
              onPress={handleManual}
              disabled={!manualBarcode}
              style={{ backgroundColor: theme.palette.primary.main }}
            >
              {strings.analyze}
            </Button>
          </Card>

          <View style={styles.grid}>
            {[
              { icon: "📜", title: strings.history, sub: strings.historySub },
              { icon: "⭐", title: strings.favorites, sub: strings.favoritesSub },
              { icon: "📊", title: strings.statistics, sub: strings.statisticsSub },
              { icon: "💡", title: strings.tips, sub: strings.tipsSub },
            ].map((c, i) => (
              <View
                key={i}
                style={[
                  styles.featureCard,
                  { backgroundColor: theme.palette.background.paper },
                ]}
              >
                <BlurView intensity={30} tint={theme.mode} style={StyleSheet.absoluteFill} />
                <Text style={styles.featureIcon}>{c.icon}</Text>
                <Text style={[styles.featureTitle, { color: theme.palette.text.primary }]}>
                  {c.title}
                </Text>
                <Text style={[styles.featureSub, { color: theme.palette.text.secondary }]}>
                  {c.sub}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={[styles.loadingText, { color: theme.palette.text.secondary }]}>
            {strings.loading}
          </Text>
        </View>
      )}

      {error && (
        <View style={[styles.errorCard, { backgroundColor: theme.palette.background.paper }]}>
          <Text style={[styles.errorText, { color: theme.palette.error.main }]}>{error}</Text>
          <Button onPress={handleReset} style={{ backgroundColor: theme.palette.primary.main }}>
            {strings.retry}
          </Button>
        </View>
      )}

      {imageLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { color: theme.palette.text.secondary }]}>
            {strings.photoLoading}
          </Text>
        </View>
      )}

      {imageError && (
        <View style={[styles.errorCard, { backgroundColor: theme.palette.background.paper }]}>
          <Text style={[styles.errorText, { color: theme.palette.error.main }]}>{imageError}</Text>
          <Button onPress={resetImage} style={{ backgroundColor: theme.palette.primary.main }}>
            {strings.retry}
          </Button>
        </View>
      )}

      {result && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Card tint={theme.mode} style={styles.card} containerStyle={styles.card}>
            <BlurView intensity={40} tint={theme.mode} style={StyleSheet.absoluteFill} />
            {result.imageUrl ? (
              <Image source={{ uri: result.imageUrl }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.imagePlaceholder]} />
            )}
            <Text style={[styles.productName, { color: theme.palette.text.primary }]}>
              {result.name || strings.unknownProduct}
            </Text>
            <Text style={[styles.barcodeText, { color: theme.palette.text.secondary }]}>
              {strings.barcode}: {result.barcode}
            </Text>
            <Gauge score={result.healthScore ?? 0} />
          </Card>

          <Card tint={theme.mode} style={styles.card} containerStyle={styles.card}>
            <BlurView intensity={40} tint={theme.mode} style={StyleSheet.absoluteFill} />
            <Text style={[styles.cardTitle, { color: theme.palette.text.primary }]}>
              {strings.aiAnalysis}
            </Text>
            <Text style={[styles.summaryText, { color: theme.palette.text.secondary }]}>
              {result.explanation || result.summary || strings.none}
            </Text>
            {result.origin && (
              <Text style={[styles.barcodeText, { color: theme.palette.text.secondary }]}>
                {strings.origin}: {result.origin}
              </Text>
            )}
            {result.nutrition && (
              <Text style={[styles.summaryText, { color: theme.palette.text.secondary }]}>
                {strings.nutrition}: {result.nutrition}
              </Text>
            )}
          </Card>

          <Card tint={theme.mode} style={styles.card} containerStyle={styles.card}>
            <BlurView intensity={40} tint={theme.mode} style={StyleSheet.absoluteFill} />
            <Text style={[styles.sectionTitle, { color: theme.palette.text.primary }]}>
              {strings.pros}
            </Text>
            {(result.pros || []).length === 0 && (
              <Text style={[styles.emptyText, { color: theme.palette.text.secondary }]}>
                {strings.none}
              </Text>
            )}
            {(result.pros || []).map((p, i) => (
              <Text key={i} style={[styles.proItem, { color: theme.palette.success.main }]}>
                {p}
              </Text>
            ))}
          </Card>

          <Card tint={theme.mode} style={styles.card} containerStyle={styles.card}>
            <BlurView intensity={40} tint={theme.mode} style={StyleSheet.absoluteFill} />
            <Text style={[styles.sectionTitle, { color: theme.palette.text.primary }]}>
              {strings.ingredients}
            </Text>
            {(result.ingredients || []).length === 0 && (
              <Text style={[styles.emptyText, { color: theme.palette.text.secondary }]}>
                {strings.none}
              </Text>
            )}
            {(result.ingredients || []).map((p, i) => (
              <Text key={i} style={[styles.proItem, { color: theme.palette.text.primary }]}>
                {p}
              </Text>
            ))}
          </Card>

          <Card tint={theme.mode} style={styles.card} containerStyle={styles.card}>
            <BlurView intensity={40} tint={theme.mode} style={StyleSheet.absoluteFill} />
            <Text style={[styles.sectionTitle, { color: theme.palette.text.primary }]}>
              {strings.cons}
            </Text>
            {(result.cons || []).length === 0 && (
              <Text style={[styles.emptyText, { color: theme.palette.text.secondary }]}>
                {strings.none}
              </Text>
            )}
            {(result.cons || []).map((c, i) => (
              <Text key={i} style={[styles.conItem, { color: theme.palette.error.main }]}>
                {c}
              </Text>
            ))}
          </Card>

          <Button onPress={handleReset} style={{ backgroundColor: theme.palette.primary.main }}>
            {strings.rescan}
          </Button>
        </ScrollView>
      )}

      {imageResult && (
        <View style={styles.center}>
            <Card tint={theme.mode} style={styles.card} containerStyle={styles.resultCard}>
            <BlurView intensity={40} tint={theme.mode} style={StyleSheet.absoluteFill} />
            {imageResult.imageUri && (
              <Image source={{ uri: imageResult.imageUri }} style={styles.resultImage} />
            )}
            <Text style={[styles.sectionTitle, { color: theme.palette.text.primary }]}>
              {strings.fruitDetected}
            </Text>
            <Text style={[styles.title, { color: theme.palette.text.primary }]}>
              {imageResult.fruitName}
            </Text>
            <View style={styles.qualityRow}>
              <Text style={[styles.qualityLabel, { color: theme.palette.text.secondary }]}>
                {strings.fruitQuality}:
              </Text>
              <Text
                style={[
                  styles.qualityValue,
                  {
                    color:
                      imageResult.quality === "good"
                        ? theme.palette.success.main
                        : imageResult.quality === "bad"
                        ? theme.palette.error.main
                        : theme.palette.warning.main,
                  },
                ]}
              >
                {imageResult.quality === "good"
                  ? strings.qualityGood
                  : imageResult.quality === "bad"
                  ? strings.qualityBad
                  : strings.qualityUncertain}
              </Text>
              <Text style={[styles.confidenceText, { color: theme.palette.text.secondary }]}>
                ({Math.round(imageResult.confidence)}% confidence)
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: theme.palette.text.secondary }]}>
              {imageResult.summary}
            </Text>
            <Button onPress={resetImage} style={{ backgroundColor: theme.palette.primary.main }}>
              {strings.close}
            </Button>
          </Card>
        </View>
      )}

      <ScannerModal
        visible={showScanner}
        granted={granted}
        strings={strings}
        onRequestClose={handleReset}
        onBarcodeScanned={(data: string) => {
          if (!data || scanned || loading) return;
          setScanned(true);
          fetchProduct(data);
        }}
      />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: "#94a3b8" }]}>{strings.footer}</Text>
      </View>
    </LinearGradient>
  );
};

interface ScannerModalProps {
  visible: boolean;
  granted: boolean;
  strings: ReturnType<typeof useLanguage>["strings"];
  onRequestClose: () => void;
  onBarcodeScanned: (data: string) => void;
}

const ScannerModal = ({
  visible,
  granted,
  strings,
  onRequestClose,
  onBarcodeScanned,
}: ScannerModalProps) => {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const pulse = useRef(new Animated.Value(0)).current;
  const scanLineTop = pulse.interpolate({ inputRange: [0, 1], outputRange: [20, 260] });

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const handleScan = ({ data }: { data: string }) => {
    if (!data || scanned) return;
    setScanned(true);
    onBarcodeScanned(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onRequestClose}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{strings.scannerTitle}</Text>
        {granted && permission?.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
              }}
              onBarcodeScanned={scanned ? undefined : handleScan}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Animated.View style={[styles.scanLine, { top: scanLineTop }]} />
              <Text style={styles.scanHint}>{strings.hint}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.infoText}>{strings.noCamera}</Text>
            <Button onPress={requestPermission} style={{ backgroundColor: "#4f46e5" }}>
              {strings.grant}
            </Button>
          </View>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={onRequestClose}>
          <Text style={styles.closeBtnText}>{strings.close}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  title: { fontSize: 28, fontWeight: "800" },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  subtitle: { textAlign: "center", marginBottom: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanOptions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  scanCard: { flex: 1, borderRadius: 20, overflow: "hidden", height: 180 },
  scanGradient: { padding: 24, alignItems: "center", borderRadius: 20, height: "100%", justifyContent: "center" },
  scanIcon: { fontSize: 48, marginBottom: 8 },
  scanTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  scanSub: { color: "#eafff3", marginTop: 4 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, overflow: "hidden" },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  featureCard: { width: "48%", borderRadius: 16, padding: 14, marginBottom: 12, overflow: "hidden" },
  featureIcon: { fontSize: 28, marginBottom: 6 },
  featureTitle: { fontWeight: "700", marginBottom: 2 },
  featureSub: { fontSize: 12 },
  loadingText: { marginTop: 12, fontWeight: "600" },
  errorCard: { padding: 16, borderRadius: 12, marginTop: 16 },
  errorText: { color: "#c0392b", marginBottom: 8, textAlign: "center" },
  productImage: { width: "100%", height: 180, borderRadius: 12, marginBottom: 10, resizeMode: "contain" },
  imagePlaceholder: { backgroundColor: "#eee" },
  productName: { fontSize: 20, fontWeight: "700" },
  barcodeText: { marginTop: 2 },
  summaryText: { lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  proItem: { color: "#4f46e5", marginBottom: 4 },
  conItem: { color: "#c0392b", marginBottom: 4 },
  emptyText: { color: "#aaa" },
  infoText: { textAlign: "center", marginBottom: 12 },
  resultCard: { borderRadius: 16, padding: 16, marginBottom: 12, overflow: "hidden", alignItems: "center" },
  resultImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 12, resizeMode: "cover" },
  qualityRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  qualityLabel: { fontSize: 14 },
  qualityValue: { fontSize: 16, fontWeight: "800" },
  confidenceText: { fontSize: 12 },
  modalContainer: { flex: 1, backgroundColor: "#000", padding: 16, justifyContent: "center" },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  cameraContainer: { height: 320, borderRadius: 16, overflow: "hidden" },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "center", alignItems: "center" },
  frame: { width: 260, height: 160, borderWidth: 3, borderColor: "#6366f1", borderRadius: 16 },
  scanLine: { position: "absolute", left: 30, right: 30, height: 2, backgroundColor: "#6366f1" },
  scanHint: { marginTop: 12, color: "#fff", fontWeight: "600" },
  closeBtn: { marginTop: 16, backgroundColor: "#e74c3c", padding: 12, borderRadius: 12, alignItems: "center" },
  closeBtnText: { color: "#fff", fontWeight: "700" },
  footer: { paddingVertical: 12, alignItems: "center" },
  footerText: { fontSize: 12 },
});
