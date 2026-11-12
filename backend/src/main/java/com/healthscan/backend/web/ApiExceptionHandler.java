package com.healthscan.backend.web;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.stream.Collectors;

/** Maps invalid input to 400 and oversized uploads to 413, instead of a generic 500. */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> invalidParameter(ConstraintViolationException e) {
        String detail = e.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .sorted()
                .collect(Collectors.joining("; "));
        return problem(HttpStatus.BAD_REQUEST, detail);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemDetail> invalidParameter(HandlerMethodValidationException e) {
        String detail = e.getAllErrors().stream()
                .map(error -> String.valueOf(error.getDefaultMessage()))
                .sorted()
                .collect(Collectors.joining("; "));
        return problem(HttpStatus.BAD_REQUEST, detail);
    }

    @ExceptionHandler(InvalidImageException.class)
    public ResponseEntity<ProblemDetail> invalidImage(InvalidImageException e) {
        return problem(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler({ImageTooLargeException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<ProblemDetail> imageTooLarge(Exception e) {
        return problem(HttpStatus.PAYLOAD_TOO_LARGE, "Image is larger than the upload limit");
    }

    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail) {
        return ResponseEntity.status(status).body(ProblemDetail.forStatusAndDetail(status, detail));
    }
}
