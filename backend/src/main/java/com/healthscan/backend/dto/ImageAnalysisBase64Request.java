package com.healthscan.backend.dto;

/** Body of the base64 upload endpoints: the photo as base64 text or a data URL. */
public record ImageAnalysisBase64Request(String image) {}
