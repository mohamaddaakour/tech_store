package com.techstore.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Type-safe view of {@code app.cors.*}.
 *
 * <p>Replaces the {@code @CrossOrigin("http://localhost:5173")} annotations that used to sit on
 * each controller. Those were a problem for two reasons: the allowed origin was hardcoded in
 * compiled Java (so staging and production could not differ), and every new controller had to
 * remember to repeat it. Now there is one list, set from configuration, applied to the whole app
 * by {@code SecurityConfig}.
 *
 * @param allowedOrigins browser origins permitted to call this API, e.g. {@code http://localhost:5173}.
 *                       Must be exact origins, not {@code *}: we send credentials (the refresh
 *                       cookie), and the CORS spec forbids combining a wildcard origin with
 *                       credentials.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
