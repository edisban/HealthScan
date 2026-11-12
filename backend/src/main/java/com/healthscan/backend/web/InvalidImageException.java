package com.healthscan.backend.web;

/** The uploaded image is missing or not valid base64; answered with 400. */
public class InvalidImageException extends RuntimeException {
    public InvalidImageException(String message) {
        super(message);
    }
}
