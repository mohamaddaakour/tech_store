package com.techstore.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

// the origins are inside application.yml
// CORS is used because the browser can send the request. It restricts what JavaScript
// is allowed to do with the response. for that reason we specify which devices are able
// to handle the response returned by the server
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
