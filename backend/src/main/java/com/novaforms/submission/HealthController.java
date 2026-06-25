package com.novaforms.submission;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class HealthController {

    private final FormConfigRepository formConfigRepository;

    public HealthController(FormConfigRepository formConfigRepository) {
        this.formConfigRepository = formConfigRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        
        try {
            // Check DB connection
            formConfigRepository.count();
            body.put("status", "UP");
            body.put("database", "CONNECTED");
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("status", "DOWN");
            body.put("database", "DISCONNECTED");
            body.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
        }
    }
}
