package com.healthscan.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@SuppressWarnings("null") // Reactor's Mono.just is not annotated, but this stub never returns null
class AiClientConfigTest {

    private final AtomicReference<ClientRequest> sent = new AtomicReference<>();

    private WebClient.Builder recordingBuilder() {
        return WebClient.builder().exchangeFunction(request -> {
            sent.set(request);
            return Mono.just(ClientResponse.create(HttpStatus.OK).build());
        });
    }

    @Test
    void sendsTheSharedSecretToTheAiService() {
        WebClient client = AiClientConfig.build(recordingBuilder(), "http://ai-service:8000", "s3cret");

        client.post().uri("/analyze").retrieve().toBodilessEntity().block();

        assertThat(sent.get().url().toString()).isEqualTo("http://ai-service:8000/analyze");
        assertThat(sent.get().headers().getFirst(AiClientConfig.SECRET_HEADER)).isEqualTo("s3cret");
    }

    @Test
    void sendsNoSecretHeaderWhenNoneIsConfigured() {
        WebClient client = AiClientConfig.build(recordingBuilder(), "http://localhost:8000", "");

        client.post().uri("/analyze").retrieve().toBodilessEntity().block();

        assertThat(sent.get().headers().containsKey(AiClientConfig.SECRET_HEADER)).isFalse();
    }
}
