package com.healthscan.backend.web;

/** The AI service could not answer (down, timed out or returned an error); answered with 502. */
public class AiUnavailableException extends RuntimeException {
    public AiUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
