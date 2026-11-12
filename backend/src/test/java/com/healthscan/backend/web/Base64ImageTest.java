package com.healthscan.backend.web;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class Base64ImageTest {

    private static final byte[] IMAGE = {1, 2, 3};
    private static final long LIMIT = 1024;

    @Test
    void decodesPlainBase64() {
        assertThat(Base64Image.decode("AQID", LIMIT)).isEqualTo(IMAGE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"data:image/jpeg;base64,AQID", "data:image/png;base64,AQID"})
    void stripsTheDataUrlPrefix(String value) {
        assertThat(Base64Image.decode(value, LIMIT)).isEqualTo(IMAGE);
    }

    @Test
    void ignoresLineBreaks() {
        assertThat(Base64Image.decode("AQ\r\nID\n", LIMIT)).isEqualTo(IMAGE);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "data:image/jpeg;base64,"})
    void rejectsMissingImages(String value) {
        assertThatThrownBy(() -> Base64Image.decode(value, LIMIT)).isInstanceOf(InvalidImageException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"@@@@", "A", "AQID!", "not-base64"})
    void rejectsTextThatIsNotBase64(String value) {
        assertThatThrownBy(() -> Base64Image.decode(value, LIMIT))
                .isInstanceOf(InvalidImageException.class)
                .hasMessage("Image is not valid base64");
    }

    @ParameterizedTest
    @ValueSource(strings = {"data:image/jpeg,AQID", "data:image/jpeg;base64"})
    void rejectsDataUrlsThatAreNotBase64(String value) {
        assertThatThrownBy(() -> Base64Image.decode(value, LIMIT)).isInstanceOf(InvalidImageException.class);
    }

    @Test
    void rejectsImagesOverTheLimit() {
        assertThatThrownBy(() -> Base64Image.decode("A".repeat(1025), LIMIT))
                .isInstanceOf(ImageTooLargeException.class);
    }

    @Test
    void limitAppliesToTheTextAfterThePrefix() {
        String exactlyAtLimit = "data:image/jpeg;base64," + "A".repeat(1024);

        assertThat(Base64Image.decode(exactlyAtLimit, LIMIT)).hasSize(768);
    }
}
