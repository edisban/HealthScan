import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Easing } from "react-native";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import type { AppStrings } from "@/constants/strings";
import { extractProductCode, SCANNED_BARCODE_TYPES } from "@/utils/barcode";
import { FRAME_H, styles } from "./styles";

interface ScannerModalProps {
  visible: boolean;
  granted: boolean;
  strings: AppStrings;
  onRequestClose: () => void;
  // Receives the product code (8 to 14 digits), already taken out of QR, DataMatrix or GS1 data
  onBarcodeScanned: (productCode: string) => void;
}

// How long "not a product barcode" stays on screen before the next code is read
const NOT_PRODUCT_PAUSE_MS = 2500;

export const ScannerModal = ({ visible, granted, strings, onRequestClose, onBarcodeScanned }: ScannerModalProps) => {
  const [scanned, setScanned] = useState(false);
  const [notProduct, setNotProduct] = useState(false);
  const notProductTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setNotProduct(false);
    }
    return () => {
      if (notProductTimer.current) clearTimeout(notProductTimer.current);
    };
  }, [visible]);

  const handleScan = ({ data }: { data: string }) => {
    if (!data || scannedRef.current) return;
    scannedRef.current = true;
    const productCode = extractProductCode(data);
    if (!productCode) {
      // A code without a product, e.g. a website QR: say so, then keep scanning
      setNotProduct(true);
      notProductTimer.current = setTimeout(() => {
        scannedRef.current = false;
        setNotProduct(false);
      }, NOT_PRODUCT_PAUSE_MS);
      return;
    }
    setScanned(true);
    onBarcodeScanned(productCode);
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
              barcodeScannerSettings={{ barcodeTypes: SCANNED_BARCODE_TYPES }}
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
                  <Text style={styles.hintText}>{notProduct ? strings.notProductCode : strings.hint}</Text>
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
