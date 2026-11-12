package com.healthscan.backend.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Optional shared API key for /api/**, sent by the app in X-Api-Key. Disabled when no key is configured.
 * The key ships inside the app, so this deters casual abuse; it is not user authentication.
 */
@Component
@Order(2)
public class ApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Api-Key";

    private final byte[] expectedKey;

    public ApiKeyFilter(@Value("${healthscan.api-key:}") String apiKey) {
        this.expectedKey = apiKey == null ? new byte[0] : apiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return expectedKey.length == 0 || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String given = request.getHeader(HEADER);
        byte[] givenKey = given == null ? new byte[0] : given.getBytes(StandardCharsets.UTF_8);
        // Constant-time comparison, so response timing does not leak how much of the key matched
        if (!MessageDigest.isEqual(expectedKey, givenKey)) {
            ProblemResponses.write(response, HttpStatus.UNAUTHORIZED, "Missing or invalid API key");
            return;
        }
        chain.doFilter(request, response);
    }
}
