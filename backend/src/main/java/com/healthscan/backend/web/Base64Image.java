package com.healthscan.backend.web;

import java.util.Base64;
import java.util.regex.Pattern;

/** Decodes an image sent as base64 text or as a "data:...;base64," URL. */
public final class Base64Image {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private Base64Image() {}

    /**
     * Returns the image bytes.
     *
     * @param maxChars the largest base64 text accepted, in characters
     * @throws InvalidImageException if the value is blank or not valid base64
     * @throws ImageTooLargeException if the base64 text is longer than {@code maxChars}
     */
    public static byte[] decode(String value, long maxChars) {
        if (value == null || value.isBlank()) {
            throw new InvalidImageException("No image provided");
        }
        String data = stripDataUrlPrefix(value);
        if (data.length() > maxChars) {
            throw new ImageTooLargeException("Image is larger than the " + maxChars + "-byte limit");
        }
        // Some platforms wrap base64 in lines; the strict decoder rejects everything else that is not base64
        data = WHITESPACE.matcher(data).replaceAll("");
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(data);
        } catch (IllegalArgumentException notBase64) {
            throw new InvalidImageException("Image is not valid base64");
        }
        if (bytes.length == 0) {
            throw new InvalidImageException("No image provided");
        }
        return bytes;
    }

    static String stripDataUrlPrefix(String value) {
        if (!value.startsWith("data:")) return value;
        int comma = value.indexOf(',');
        if (comma < 0 || !value.substring(0, comma).endsWith(";base64")) {
            throw new InvalidImageException("Image must be a base64 data URL");
        }
        return value.substring(comma + 1);
    }
}
