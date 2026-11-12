import { extractProductCode, SCANNED_BARCODE_TYPES } from "../barcode";

describe("plain barcodes", () => {
  it.each([
    ["EAN-13", "5449000000996", "5449000000996"],
    ["EAN-8", "96385074", "96385074"],
    ["UPC-A", "036000291452", "036000291452"],
    ["ITF-14 with a packaging digit", "15449000000993", "15449000000993"],
    ["GTIN-14 with a leading zero becomes the EAN-13", "05449000000996", "5449000000996"],
    ["surrounding spaces", " 5449000000996 ", "5449000000996"],
  ])("%s", (_, raw, expected) => {
    expect(extractProductCode(raw)).toBe(expected);
  });
});

describe("GS1 DataMatrix and GS1-128", () => {
  it("reads the GTIN from an element string with batch and expiry", () => {
    expect(extractProductCode("0105449000000996172612311012345")).toBe("5449000000996");
  });

  it("reads the human-readable form with parentheses", () => {
    expect(extractProductCode("(01)05449000000996(17)261231(10)AB12")).toBe("5449000000996");
  });

  it("ignores the symbology identifier and FNC1 separators", () => {
    expect(extractProductCode("]d20105449000000996\u001d10AB12")).toBe("5449000000996");
  });
});

describe("GS1 Digital Link QR codes", () => {
  it.each([
    "https://id.gs1.org/01/05449000000996",
    "https://id.gs1.org/01/05449000000996/10/AB12?17=261231",
    "https://brand.example.com/01/05449000000996?utm=pack",
    "HTTPS://BRAND.EXAMPLE.COM/01/05449000000996#info",
  ])("%s", (raw) => {
    expect(extractProductCode(raw)).toBe("5449000000996");
  });
});

describe("codes without a product", () => {
  it.each([
    ["a website QR code", "https://www.example.com/recipes"],
    ["text", "Hello"],
    ["too few digits", "1234567"],
    ["too many digits", "123456789012345"],
    ["an element string without a GTIN", "(10)AB12(17)261231"],
    ["an empty code", "   "],
  ])("%s gives null", (_, raw) => {
    expect(extractProductCode(raw)).toBeNull();
  });
});

it("the scanner reads every format the camera supports", () => {
  expect(SCANNED_BARCODE_TYPES).toEqual(
    expect.arrayContaining(["ean13", "ean8", "upc_a", "upc_e", "itf14", "code128", "qr", "datamatrix", "pdf417", "aztec"])
  );
  expect(SCANNED_BARCODE_TYPES).toHaveLength(13);
});
