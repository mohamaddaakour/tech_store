package com.techstore.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    
    // Create a record for the health response
    public record HealthResponse(String status) {}

    @GetMapping("/api/health")
    public HealthResponse health() {
        // return an instance of HealthResponse class
        return new HealthResponse("UP");
    }
}
