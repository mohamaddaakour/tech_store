package com.techstore.common;

import java.text.Normalizer;
import java.util.Locale;

public final class Slugs {

    private Slugs() {
    }

    // Turn a display name into a URL-safe slug: "Gaming Laptops" -> "gaming-laptops"
    public static String from(String value) {
        // Normalizer splits accented letters into letter + accent, so the accent can be dropped
        String withoutAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return withoutAccents.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }
}
