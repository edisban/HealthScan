import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, TextInput, Modal, Animated, Switch, SafeAreaView,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";

const API_BASE = "http://192.168.1.1:8080";

const scoreColor = (s) => (s >= 70 ? "#6366f1" : s >= 45 ? "#f39c12" : "#e74c3c");
const scoreLabel = (s) =>
  s >= 70 ? "Υψηλή Διατροφική Αξία" : s >= 45 ? "Μέτρια Αξία" : "Προσοχή στα Συστατικά";

export default function App() {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState("el");
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pulse = useRef(new Animated.Value(0)).current;
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

  const fetchProduct = async (barcode) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowScanner(false);
    try {
      const res = await fetch(`${API_BASE}/api/v1/product/${barcode}?lang=${lang}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResult({ barcode, ...json });
    } catch (e) {
      setError(e.message || "Σφάλμα σύνδεσης");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (!data || scanned || loading) return;
    setScanned(true);
    fetchProduct(data);
  };

  const resetAll = () => {
    setResult(null);
    setError(null);
    setScanned(false);
    setManualBarcode("");
  };

  const scanLineTop = pulse.interpolate({ inputRange: [0, 1], outputRange: [20, 260] });
  const bg = dark ? ["#1e1b4b", "#312e81"] : ["#eef2ff", "#f8fafc"];
  const text = dark ? "#f1f5f9" : "#1a1a2e";
  const sub = dark ? "#94a3b8" : "#666";

  const glass = dark ? "rgba(30,41,59,0.6)" : "rgba(255,255,255,0.6)";

  return (
    <LinearGradient colors={bg} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>Health Scan</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity onPress={() => setLang(lang === "el" ? "en" : "el")} style={{ marginRight: 12 }}>
            <Text style={{ color: sub, fontWeight: "700" }}>{lang === "el" ? "EN" : "EL"}</Text>
          </TouchableOpacity>
          <Text style={{ color: sub, marginRight: 8 }}>🌙</Text>
          <Switch value={dark} onValueChange={setDark} />
        </View>
      </View>
      <Text style={[styles.subtitle, { color: sub }]}>Σάρωσε ένα προϊόν και δες τη διατροφική του αξία</Text>

      {!result && !loading && !error && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <TouchableOpacity style={styles.scanCard} onPress={() => setShowScanner(true)}>
            <LinearGradient colors={["#6366f1", "#4f46e5"]} style={styles.scanGradient}>
              <Text style={styles.scanIcon}>📷</Text>
              <Text style={styles.scanTitle}>Άνοιγμα Κάμερας</Text>
              <Text style={styles.scanSub}>Σάρωση Barcode</Text>
    </LinearGradient>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: glass }]}>
            <BlurView intensity={40} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <Text style={[styles.cardTitle, { color: text }]}>Χειροκίνητη Εισαγωγή</Text>
            <TextInput
              style={[styles.input, { color: text, borderColor: dark ? "#475569" : "#ccc", backgroundColor: dark ? "rgba(15,23,42,0.5)" : "#f9f9f9" }]}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Εισάγετε barcode"
              placeholderTextColor={sub}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => manualBarcode && fetchProduct(manualBarcode)}>
              <Text style={styles.primaryBtnText}>Ανάλυση</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {[
              { icon: "📜", title: "Ιστορικό", sub: "Προηγούμενες σαρώσεις" },
              { icon: "⭐", title: "Αγαπημένα", sub: "Αποθηκευμένα προϊόντα" },
              { icon: "📊", title: "Στατιστικά", sub: "Γρήγορη επισκόπηση" },
              { icon: "💡", title: "Συμβουλές", sub: "Διατροφικές συμβουλές" },
            ].map((c, i) => (
              <View key={i} style={[styles.featureCard, { backgroundColor: glass }]}>
                <BlurView intensity={30} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <Text style={styles.featureIcon}>{c.icon}</Text>
                <Text style={[styles.featureTitle, { color: text }]}>{c.title}</Text>
                <Text style={[styles.featureSub, { color: sub }]}>{c.sub}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={[styles.loadingText, { color: sub }]}>Ανάλυση συστατικών με AI...</Text>
        </View>
      )}

      {error && (
        <View style={[styles.errorCard, { backgroundColor: dark ? "rgba(220,38,38,0.2)" : "#fdecea" }]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={resetAll}>
            <Text style={styles.primaryBtnText}>Προσπάθεια ξανά</Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={[styles.card, { backgroundColor: glass }]}>
            <BlurView intensity={40} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            {result.imageUrl ? (
              <Image source={{ uri: result.imageUrl }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.imagePlaceholder]} />
            )}
            <Text style={[styles.productName, { color: text }]}>{result.name || "Άγνωστο Προϊόν"}</Text>
            <Text style={[styles.barcodeText, { color: sub }]}>Barcode: {result.barcode}</Text>

            <View style={styles.gaugeWrap}>
              <View style={[styles.gauge, { borderColor: scoreColor(result.healthScore ?? 0) }]}>
                <Text style={[styles.gaugeText, { color: scoreColor(result.healthScore ?? 0) }]}>
                  {result.healthScore ?? 0}%
                </Text>
              </View>
              <Text style={[styles.scoreLabel, { color: scoreColor(result.healthScore ?? 0) }]}>
                {scoreLabel(result.healthScore ?? 0)}
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: glass }]}>
            <BlurView intensity={40} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <Text style={[styles.cardTitle, { color: text }]}>🤖 AI Ανάλυση</Text>
            <Text style={[styles.summaryText, { color: sub }]}>{result.explanation || result.summary || "—"}</Text>
            {result.origin ? <Text style={[styles.barcodeText, { color: sub }]}>Origin: {result.origin}</Text> : null}
            {result.nutrition ? <Text style={[styles.summaryText, { color: sub }]}>Nutrition: {result.nutrition}</Text> : null}
          </View>

          <View style={[styles.card, { backgroundColor: glass }]}>
            <BlurView intensity={40} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <Text style={[styles.sectionTitle, { color: text }]}>✅ Θετικά Συστατικά</Text>
            {(result.pros || []).length === 0 && <Text style={[styles.emptyText, { color: sub }]}>—</Text>}
            {(result.pros || []).map((p, i) => (
              <Text key={i} style={styles.proItem}>• {p}</Text>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: glass }]}>
            <BlurView intensity={40} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <Text style={[styles.sectionTitle, { color: text }]}>📋 Ingredients</Text>
            {(result.ingredients || []).length === 0 && <Text style={[styles.emptyText, { color: sub }]}>—</Text>}
            {(result.ingredients || []).map((p, i) => (
              <Text key={i} style={styles.proItem}>• {p}</Text>
            ))}
          </View>
            {(result.cons || []).length === 0 && <Text style={[styles.emptyText, { color: sub }]}>—</Text>}
            {(result.cons || []).map((c, i) => (
              <Text key={i} style={styles.conItem}>• {c}</Text>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={resetAll}>
            <Text style={styles.primaryBtnText}>Σάρωση Άλλου Προϊόντος</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Σάρωση Barcode</Text>
          {permission && permission.granted ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />
              <View style={styles.overlay} pointerEvents="none">
                <View style={styles.frame} />
                <Animated.View style={[styles.scanLine, { top: scanLineTop }]} />
                <Text style={styles.scanHint}>Κεντράρετε το barcode στο πλαίσιο</Text>
              </View>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.infoText}>Δεν υπάρχει πρόσβαση στην κάμερα</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>Χορήγηση Άδειας</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowScanner(false)}>
            <Text style={styles.closeBtnText}>Κλείσιμο</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: "#94a3b8" }]}>Health Scan (c) 2026</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "800" },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  subtitle: { textAlign: "center", marginBottom: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanCard: { borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  scanGradient: { padding: 24, alignItems: "center", borderRadius: 20 },
  scanIcon: { fontSize: 48, marginBottom: 8 },
  scanTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  scanSub: { color: "#eafff3", marginTop: 4 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, overflow: "hidden" },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  primaryBtn: { backgroundColor: "#4338ca", padding: 14, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
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
  gaugeWrap: { alignItems: "center", marginTop: 12 },
  gauge: { width: 110, height: 110, borderRadius: 55, borderWidth: 8, justifyContent: "center", alignItems: "center" },
  gaugeText: { fontSize: 26, fontWeight: "800" },
  scoreLabel: { marginTop: 6, fontWeight: "700" },
  summaryText: { lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  proItem: { color: "#4f46e5", marginBottom: 4 },
  conItem: { color: "#c0392b", marginBottom: 4 },
  emptyText: { color: "#aaa" },
  infoText: { textAlign: "center", marginBottom: 12 },
  modalContainer: { flex: 1, backgroundColor: "#000", padding: 16, justifyContent: "center" },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  cameraContainer: { height: 320, borderRadius: 16, overflow: "hidden" },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  frame: { width: 260, height: 160, borderWidth: 3, borderColor: "#6366f1", borderRadius: 16 },
  scanLine: { position: "absolute", left: 30, right: 30, height: 2, backgroundColor: "#6366f1" },
  scanHint: { marginTop: 12, color: "#fff", fontWeight: "600" },
  closeBtn: { marginTop: 16, backgroundColor: "#e74c3c", padding: 12, borderRadius: 12, alignItems: "center" },
  closeBtnText: { color: "#fff", fontWeight: "700" },
  footer: { paddingVertical: 12, alignItems: 'center' },
  footerText: { fontSize: 12 } })
