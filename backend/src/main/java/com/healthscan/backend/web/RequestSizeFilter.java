package com.healthscan.backend.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.healthscan.backend.config.HealthscanProperties;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rejects image uploads whose declared Content-Length is over the limit with 413, before the body is read.
 * Bodies without a length (chunked) are checked after parsing, in {@link Base64Image}.
 */
@Component
@Order(3)
public class RequestSizeFilter extends OncePerRequestFilter {

    private final long maxBytes;

    public RequestSizeFilter(HealthscanProperties properties) {
        this.maxBytes = properties.maxImageSize().toBytes();
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return RateLimitFilter.tierOf(request.getMethod(), request.getRequestURI()) != RateLimitFilter.Tier.STRICT
                || request.getRequestURI().endsWith("/web-search");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        if (request.getContentLengthLong() > maxBytes) {
            ProblemResponses.write(response, HttpStatus.PAYLOAD_TOO_LARGE, "Image is larger than the upload limit");
            return;
        }
        chain.doFilter(request, response);
    }
}
