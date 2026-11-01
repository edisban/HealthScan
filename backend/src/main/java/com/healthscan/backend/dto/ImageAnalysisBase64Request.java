package com.healthscan.backend.dto;

public class ImageAnalysisBase64Request {
    private String image;

    public ImageAnalysisBase64Request() {}

    public ImageAnalysisBase64Request(String image) {
        this.image = image;
    }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
}
