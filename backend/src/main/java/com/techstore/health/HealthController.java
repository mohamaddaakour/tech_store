package com.techstore.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// Health controller to check the health of the server
@RestController
public class HealthController {
    public record HealthResponse(String status) {
    }

    @GetMapping("/api/health")
    public HealthResponse health() {
        return new HealthResponse("UP");
    }
}
