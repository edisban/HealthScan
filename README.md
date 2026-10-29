# Health Scan Mobile

Health Scan is a mobile app that scans product barcodes and uses AI to analyze their nutritional health value.

React Native (Expo) app for scanning product barcodes and viewing an AI-based nutritional health analysis.

## Stack
- Expo SDK 58 / React Native 0.88
- React 19
- expo-camera (barcode scanning)
- expo-blur, expo-linear-gradient
- Backend API at `http://192.168.1.1:8080` (`/api/v1/product/{barcode}`)

## Features
- Barcode scanning via camera (EAN-13, EAN-8, UPC-A, UPC-E, Code128)
- Manual barcode entry
- Product image, name, and health score gauge
- AI explanation, positive ingredients, negatives/additives
## Architecture
- Single-screen app (`App.js`): state managed with React hooks (dark mode, camera permission, scan/result/loading/error).
- `fetchProduct` calls the backend REST endpoint and stores the JSON response in `result`.
- Camera modal with `CameraView` and `onBarcodeScanned`; manual input fallback.
- UI built with `LinearGradient`, `BlurView`, and `StyleSheet`; no navigation library.
