export interface AppStrings {
  appTitle: string;
  subtitle: string;
  aiPowered: string;
  scanCamera: string;
  scanSub: string;
  manualEntry: string;
  placeholder: string;
  analyze: string;
  howItWorks: string;
  step1: string;
  step2: string;
  step3: string;
  loading: string;
  loadingSub: string;
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
  healthScore: string;
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
  confidence: string;
  noFruit: string;
  imageAnalysis: string;
  imageAnalysisSub: string;
  takePhoto: string;
  takePhotoSub: string;
  chooseFromLibrary: string;
  chooseFromLibrarySub: string;
  photoLoading: string;
  photoError: string;
  // Barcode not found fallbacks
  notFoundTitle: string;
  notFoundSub: string;
  labelPhoto: string;
  labelPhotoSub: string;
  labelLibrary: string;
  labelLibrarySub: string;
  webSearch: string;
  webSearchSub: string;
  webSearchFailed: string;
  labelLoading: string;
  labelLoadingSub: string;
  webLoading: string;
  webLoadingSub: string;
  source: string;
}

export const strings: Record<string, AppStrings> = {
  el: {
    appTitle: "Health Scan",
    subtitle: "Μάθε τι τρως, σε δευτερόλεπτα.",
    aiPowered: "Με τεχνητή νοημοσύνη",
    scanCamera: "Σάρωση Barcode",
    scanSub: "Στόχευσε τον κωδικό οποιουδήποτε προϊόντος",
    photoScan: "Έλεγχος Φρούτου",
    photoScanSub: "Φρεσκάδα από φωτογραφία",
    manualEntry: "Ή πληκτρολόγησε τον κωδικό",
    placeholder: "π.χ. 5449000000996",
    analyze: "Ανάλυση",
    howItWorks: "Πώς λειτουργεί",
    step1: "Σάρωσε",
    step2: "Ανάλυση AI",
    step3: "Αποτέλεσμα",
    loading: "Ανάλυση προϊόντος",
    loadingSub: "Διαβάζουμε τα συστατικά με AI…",
    error: "Σφάλμα σύνδεσης",
    retry: "Δοκίμασε ξανά",
    unknownProduct: "Άγνωστο Προϊόν",
    barcode: "Barcode",
    aiAnalysis: "Ανάλυση AI",
    pros: "Θετικά",
    ingredients: "Συστατικά",
    cons: "Αρνητικά",
    none: "—",
    rescan: "Σάρωση άλλου προϊόντος",
    scannerTitle: "Σάρωση Barcode",
    noCamera: "Χρειαζόμαστε πρόσβαση στην κάμερα για τη σάρωση.",
    grant: "Να επιτραπεί",
    close: "Κλείσιμο",
    hint: "Κεντράρισε το barcode στο πλαίσιο",
    origin: "Προέλευση",
    nutrition: "Διατροφικά στοιχεία",
    healthScore: "από 100",
    scoreLabelHigh: "Υψηλή διατροφική αξία",
    scoreLabelMid: "Μέτρια αξία",
    scoreLabelLow: "Προσοχή στα συστατικά",
    footer: "Health Scan © 2026",
    fruitDetected: "Ανιχνεύθηκε φρούτο",
    fruitQuality: "Ποιότητα",
    qualityGood: "Φρέσκο",
    qualityBad: "Χαλασμένο",
    qualityUncertain: "Αβέβαιο",
    confidence: "Βεβαιότητα",
    noFruit: "Δεν βρέθηκε φρούτο",
    imageAnalysis: "Έλεγχος φρούτου",
    imageAnalysisSub: "Τράβηξε ή διάλεξε μια καθαρή φωτογραφία",
    takePhoto: "Λήψη φωτογραφίας",
    takePhotoSub: "Άνοιγμα κάμερας",
    chooseFromLibrary: "Από τη βιβλιοθήκη",
    chooseFromLibrarySub: "Επιλογή υπάρχουσας φωτογραφίας",
    photoLoading: "Ανάλυση φωτογραφίας…",
    photoError: "Σφάλμα ανάλυσης φωτογραφίας",
    notFoundTitle: "Το προϊόν δεν βρέθηκε",
    notFoundSub: "Δεν υπάρχει ακόμα σε καμία βάση δεδομένων. Βοήθησέ μας να το αναγνωρίσουμε:",
    labelPhoto: "Φωτογράφισε τα συστατικά",
    labelPhotoSub: "Το AI διαβάζει την ετικέτα · πιο αξιόπιστο",
    labelLibrary: "Ετικέτα από τη βιβλιοθήκη",
    labelLibrarySub: "Χρησιμοποίησε υπάρχουσα φωτογραφία",
    webSearch: "Αναζήτηση στο διαδίκτυο",
    webSearchSub: "Διαρκεί έως 30 δευτερόλεπτα",
    webSearchFailed: "Δεν βρέθηκε ούτε στο διαδίκτυο. Δοκίμασε μια φωτογραφία της ετικέτας.",
    labelLoading: "Ανάγνωση ετικέτας",
    labelLoadingSub: "Το AI διαβάζει τα συστατικά…",
    webLoading: "Αναζήτηση στο διαδίκτυο",
    webLoadingSub: "Μπορεί να διαρκέσει έως 30 δευτερόλεπτα…",
    source: "Πηγή",
  },
  en: {
    appTitle: "Health Scan",
    subtitle: "Know what you eat, in seconds.",
    aiPowered: "AI powered",
    scanCamera: "Scan Barcode",
    scanSub: "Point your camera at any product",
    photoScan: "Fruit Check",
    photoScanSub: "Freshness from a photo",
    manualEntry: "Or type the barcode",
    placeholder: "e.g. 5449000000996",
    analyze: "Analyze",
    howItWorks: "How it works",
    step1: "Scan",
    step2: "AI analysis",
    step3: "Your score",
    loading: "Analyzing product",
    loadingSub: "Reading the ingredients with AI…",
    error: "Connection error",
    retry: "Try again",
    unknownProduct: "Unknown Product",
    barcode: "Barcode",
    aiAnalysis: "AI Analysis",
    pros: "Positives",
    ingredients: "Ingredients",
    cons: "Negatives",
    none: "—",
    rescan: "Scan another product",
    scannerTitle: "Scan Barcode",
    noCamera: "We need camera access to scan barcodes.",
    grant: "Allow access",
    close: "Close",
    hint: "Center the barcode in the frame",
    origin: "Origin",
    nutrition: "Nutrition facts",
    healthScore: "out of 100",
    scoreLabelHigh: "High nutritional value",
    scoreLabelMid: "Moderate value",
    scoreLabelLow: "Watch the ingredients",
    footer: "Health Scan © 2026",
    fruitDetected: "Fruit detected",
    fruitQuality: "Quality",
    qualityGood: "Fresh",
    qualityBad: "Spoiled",
    qualityUncertain: "Uncertain",
    confidence: "Confidence",
    noFruit: "No fruit found",
    imageAnalysis: "Fruit check",
    imageAnalysisSub: "Take or choose a clear photo",
    takePhoto: "Take a photo",
    takePhotoSub: "Open the camera",
    chooseFromLibrary: "Choose from library",
    chooseFromLibrarySub: "Use an existing photo",
    photoLoading: "Analyzing photo…",
    photoError: "Image analysis error",
    notFoundTitle: "Product not found",
    notFoundSub: "It isn't in any product database yet. Help us identify it:",
    labelPhoto: "Photograph the ingredients",
    labelPhotoSub: "AI reads the label · most reliable",
    labelLibrary: "Label from library",
    labelLibrarySub: "Use an existing photo",
    webSearch: "Search the web",
    webSearchSub: "Takes up to 30 seconds",
    webSearchFailed: "Not found on the web either. Try a photo of the label.",
    labelLoading: "Reading the label",
    labelLoadingSub: "AI is reading the ingredients…",
    webLoading: "Searching the web",
    webLoadingSub: "This can take up to 30 seconds…",
    source: "Source",
  },
};
