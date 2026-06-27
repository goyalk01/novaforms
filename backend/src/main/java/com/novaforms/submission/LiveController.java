package com.novaforms.submission;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/live")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class LiveController {
  private final LiveEmitterRegistry registry;

  public LiveController(LiveEmitterRegistry registry) {
    this.registry = registry;
  }

  @GetMapping(value = "/submissions", produces = "text/event-stream")
  public SseEmitter subscribeToLiveSubmissions(@RequestParam Long formId) {
    return registry.createEmitter(formId);
  }
}
