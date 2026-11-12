package com.healthscan.backend.web;

/** The uploaded image is over the configured size limit; answered with 413. */
public class ImageTooLargeException extends RuntimeException {
    public ImageTooLargeException(String message) {
        super(message);
    }
}
