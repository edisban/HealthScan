import type { BarcodeType } from "expo-camera";

/** Every format the camera can read; extractProductCode decides which ones carry a product. */
export const SCANNED_BARCODE_TYPES: BarcodeType[] = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "itf14",
  "code128",
  "code39",
  "code93",
  "codabar",
  "qr",
  "datamatrix",
  "pdf417",
  "aztec",
];

// GS1 symbology identifiers some scanners put in front of the data, e.g. "]d2" for GS1 DataMatrix
const SYMBOLOGY_ID = /^\][A-Za-z]\d/;
// FNC1 separator between GS1 fields
const GROUP_SEPARATOR = /\u001d/g;
// GS1 Digital Link, e.g. https://id.gs1.org/01/05449000000996/10/ABC
const DIGITAL_LINK_GTIN = /\/01\/(\d{8,14})(?:[/?#]|$)/;
// GS1 element string, with or without parentheses: (01)05449000000996(17)261231 or 0105449000000996...
const ELEMENT_STRING_GTIN = /^\(?01\)?(\d{14})/;

/** GTIN-14 with a leading 0 is the same product as the EAN-13 printed on the pack. */
const normalize = (digits: string): string => (digits.length === 14 && digits.startsWith("0") ? digits.slice(1) : digits);

/**
 * Turns whatever the camera read into the product code the backend looks up (8 to 14 digits),
 * or null when the code holds no product, such as an ordinary website QR code.
 *
 * Handles plain barcodes (EAN, UPC, ITF-14), GS1 DataMatrix and GS1-128 element strings that
 * start with the GTIN (01), and GS1 Digital Link QR codes.
 */
export const extractProductCode = (raw: string): string | null => {
  const data = raw.trim().replace(SYMBOLOGY_ID, "").replace(GROUP_SEPARATOR, "");
  if (!data) return null;

  if (/^\d{8,14}$/.test(data)) return normalize(data);

  const link = data.match(DIGITAL_LINK_GTIN);
  if (link) return normalize(link[1]);

  const element = data.match(ELEMENT_STRING_GTIN);
  if (element) return normalize(element[1]);

  return null;
};
