import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, IconButton, Background } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProduct } from "@/hooks/useProduct";
import { useCamera } from "@/hooks/useCamera";
import { useImageAnalysis } from "@/hooks/useImageAnalysis";
import { useHistory } from "@/hooks/useHistory";
import { HomeContent } from "./home/HomeContent";
import { LangToggle } from "./home/LangToggle";
import { LoadingCard, ErrorCard } from "./home/StatusCard";
import { ProductResult } from "./home/ProductResult";
import { NotFound } from "./home/NotFound";
import { FruitResult } from "./home/FruitResult";
import { PhotoSourceModal } from "./home/PhotoSourceModal";
import { ScannerModal } from "./home/ScannerModal";
import { styles } from "./home/styles";

/** The app's single screen: picks what to show from the product, fruit and history state. */
export const HomeScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { lang, setLang, strings } = useLanguage();
  const { granted } = useCamera();
  const { result, loading, loadingKind, error, fetchProduct, analyzeLabel, skipWebSearch, reset } = useProduct(lang);
  const {
    result: imageResult,
    loading: imageLoading,
    error: imageError,
    pickImage,
    takePhoto,
    reset: resetImage,
  } = useImageAnalysis();
  const history = useHistory();
  const [manualBarcode, setManualBarcode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoSource, setShowPhotoSource] = useState(false);
  const { text } = theme.palette;

  const isHome = !result && !loading && !error && !imageResult && !imageLoading && !imageError;

  // Every identified product goes into the recent scans
  useEffect(() => {
    if (result && result.found !== false && !loading) history.add(result);
  }, [result, loading]);

  const handleManual = () => {
    if (manualBarcode.trim()) fetchProduct(manualBarcode.trim());
  };

  const handleReset = () => {
    reset();
    resetImage();
    setManualBarcode("");
    setShowScanner(false);
  };

  const loadingTitle = !loading
    ? strings.photoLoading
    : loadingKind === "label"
    ? strings.labelLoading
    : loadingKind === "web"
    ? strings.webLoading
    : strings.loading;
  const loadingSubtitle = !loading
    ? undefined
    : loadingKind === "label"
    ? strings.labelLoadingSub
    : loadingKind === "web"
    ? strings.webLoadingSub
    : strings.loadingSub;

  return (
    <Background>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.brand} onPress={handleReset} activeOpacity={0.8} testID="home">
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
          <HomeContent
            strings={strings}
            theme={theme}
            manualBarcode={manualBarcode}
            onManualBarcodeChange={setManualBarcode}
            onManualSubmit={handleManual}
            onOpenScanner={() => setShowScanner(true)}
            onOpenFruitCheck={() => setShowPhotoSource(true)}
            history={history.entries}
            onHistorySelect={fetchProduct}
            onHistoryClear={history.clear}
          />
        )}

        {(loading || imageLoading) && (
          <LoadingCard
            theme={theme}
            title={loadingTitle}
            subtitle={loadingSubtitle}
            skipLabel={strings.webSearchSkip}
            onSkip={loading && loadingKind === "web" ? skipWebSearch : undefined}
          />
        )}

        {(error || imageError) && (
          <ErrorCard
            theme={theme}
            title={error ? strings.error : strings.photoError}
            message={error || imageError || ""}
            retryLabel={strings.retry}
            onRetry={handleReset}
          />
        )}

        {result && !loading && !error && (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="product-result">
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
            <Button onPress={handleReset} icon="scan-outline" variant={result.found === false ? "ghost" : "primary"}>
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
