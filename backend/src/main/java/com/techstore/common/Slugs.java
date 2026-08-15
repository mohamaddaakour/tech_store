package com.techstore.common;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Turns a display name into a URL-safe slug: {@code "Gaming Laptops & PCs"} → {@code "gaming-laptops-pcs"}.
 *
 * <p>A {@code final} class with a private constructor: this is a pure function with no state, so
 * there is nothing to instantiate and nothing to subclass.
 */
public final class Slugs {

    private Slugs() {
    }

    public static String from(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }

        /*
         * NFD normalisation splits an accented character into its base letter plus a separate
         * combining accent mark ("é" becomes "e" + U+0301). Stripping the marks afterwards then
         * leaves plain ASCII, so "Cámara" slugs to "camara" rather than losing the letter
         * entirely. Doing this before the character filter is what makes accented brand names
         * work instead of collapsing to empty strings.
         */
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        return normalized
                .toLowerCase(Locale.ROOT)
                // Anything that is not a letter, digit or space becomes a space, so "&" does not
                // silently weld two words together.
                .replaceAll("[^a-z0-9\\s-]", " ")
                .trim()
                // Collapse whitespace and stray hyphens into a single separator.
                .replaceAll("[\\s-]+", "-");
    }
}
