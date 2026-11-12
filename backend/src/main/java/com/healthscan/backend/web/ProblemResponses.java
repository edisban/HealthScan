package com.healthscan.backend.web;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.io.IOException;

/** Writes RFC 9457 problem responses from servlet filters, which run before Spring MVC error handling. */
final class ProblemResponses {

    private ProblemResponses() {}

    // Callers pass fixed messages only, never request data, so no JSON escaping is needed
    static void write(HttpServletResponse response, HttpStatus status, String detail) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + status.getReasonPhrase()
                + "\",\"status\":" + status.value() + ",\"detail\":\"" + detail + "\"}");
    }
}
