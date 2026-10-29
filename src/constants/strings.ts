export interface AppStrings {
  appTitle: string;
  subtitle: string;
  scanCamera: string;
  scanSub: string;
  manualEntry: string;
  placeholder: string;
  analyze: string;
  history: string;
  historySub: string;
  favorites: string;
  favoritesSub: string;
  statistics: string;
  statisticsSub: string;
  tips: string;
  tipsSub: string;
  loading: string;
  error: string;
  retry: string;
  unknownProduct: string;
    barcode: string;
    aiAnalysis: string;
    pros: string;
    ingredients: string;
    cons: string;
    none: string;
    rescan: string;
    scannerTitle: string;
    noCamera: string;
    grant: string;
    close: string;
    hint: string;
    origin: string;
    nutrition: string;
    scoreLabelHigh: string;
    scoreLabelMid: string;
    scoreLabelLow: string;
    footer: string;
    // Photo scan / fruit quality
    photoScan: string;
    photoScanSub: string;
    fruitDetected: string;
    fruitQuality: string;
    qualityGood: string;
    qualityBad: string;
    qualityUncertain: string;
    imageAnalysis: string;
    pickPhoto: string;
    photoLoading: string;
    photoError: string;
  }

export const strings: Record<string, AppStrings> = {
  el: {
    appTitle: "Health Scan",
    subtitle: "Σάρωσε ένα προϊόν και δες τη διατροφική του αξία",
    scanCamera: "Άνοιγμα Κάμερας",
    scanSub: "Σάρωση Barcode",
    photoScan: "Φωτογραφία Φρούτου",
    photoScanSub: "Έλεγχος ποιότητας φρούτου",
    manualEntry: "Χειροκίνητη Εισαγωγή",
    placeholder: "Εισάγετε barcode",
    analyze: "Ανάλυση",
    history: "Ιστορικό",
    historySub: "Προηγούμενες σαρώσεις",
    favorites: "Αγαπημένα",
    favoritesSub: "Αποθηκευμένα προϊόντα",
    statistics: "Στατιστικά",
    statisticsSub: "Γρήγορη επισκόπηση",
    tips: "Συμβουλές",
    tipsSub: "Διατροφικές συμβουλές",
    loading: "Ανάλυση συστατικών με AI...",
    error: "Σφάλμα σύνδεσης",
    retry: "Προσπάθεια ξανά",
    unknownProduct: "Άγνωστο Προϊόν",
    barcode: "Barcode",
    aiAnalysis: "🤖 AI Ανάλυση",
    pros: "✅ Θετικά Συστατικά",
    ingredients: "📋 Συστατικά",
    cons: "⚠️ Αρνητικά / Πρόσθετα",
    none: "—",
    rescan: "Σάρωση Άλλου Προϊόντος",
    scannerTitle: "Σάρωση Barcode",
    noCamera: "Δεν υπάρχει πρόσβαση στην κάμερα",
    grant: "Χορήγηση Άδειας",
    close: "Κλείσιμο",
    hint: "Κεντράρετε το barcode στο πλαίσιο",
    origin: "Origin",
    nutrition: "Nutrition",
    scoreLabelHigh: "Υψηλή Διατροφική Αξία",
    scoreLabelMid: "Μέτρια Αξία",
    scoreLabelLow: "Προσοχή στα Συστατικά",
    footer: "Health Scan (c) 2026",
    fruitDetected: "Ανιχνεύθηκε Φρούτο",
    fruitQuality: "Ποιότητα Φρούτου",
    qualityGood: "Καλό",
    qualityBad: "Κακό",
    qualityUncertain: "Αβέβαιο",
    imageAnalysis: "📸 Ανάλυση Φωτογραφίας",
    pickPhoto: "Επιλογή Φωτογραφίας",
    photoLoading: "Ανάλυση φωτογραφίας...",
    photoError: "Σφάλμα ανάλυσης φωτογραφίας",
  },
  en: {
    appTitle: "Health Scan",
    subtitle: "Scan a product and see its nutritional value",
    scanCamera: "Open Camera",
    scanSub: "Scan Barcode",
    photoScan: "Photo Scan",
    photoScanSub: "Check fruit quality",
    manualEntry: "Manual Entry",
    placeholder: "Enter barcode",
    analyze: "Analyze",
    history: "History",
    historySub: "Previous scans",
    favorites: "Favorites",
    favoritesSub: "Saved products",
    statistics: "Statistics",
    statisticsSub: "Quick overview",
    tips: "Tips",
    tipsSub: "Nutritional advice",
    loading: "Analyzing ingredients with AI...",
    error: "Connection error",
    retry: "Try again",
    unknownProduct: "Unknown Product",
    barcode: "Barcode",
    aiAnalysis: "🤖 AI Analysis",
    pros: "✅ Positive Ingredients",
    ingredients: "📋 Ingredients",
    cons: "⚠️ Negatives / Additives",
    none: "—",
    rescan: "Scan Another Product",
    scannerTitle: "Scan Barcode",
    noCamera: "No camera access",
    grant: "Grant Permission",
    close: "Close",
    hint: "Center the barcode in the frame",
    origin: "Origin",
    nutrition: "Nutrition",
    scoreLabelHigh: "High Nutritional Value",
    scoreLabelMid: "Medium Value",
    scoreLabelLow: "Caution with Ingredients",
    footer: "Health Scan (c) 2026",
    fruitDetected: "Fruit Detected",
    fruitQuality: "Fruit Quality",
    qualityGood: "Good",
    qualityBad: "Bad",
    qualityUncertain: "Uncertain",
    imageAnalysis: "📸 Image Analysis",
    pickPhoto: "Pick Photo",
    photoLoading: "Analyzing photo...",
    photoError: "Image analysis error",
  },
};
