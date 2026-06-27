package com.novaforms.submission;

import java.time.Instant;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/s")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class ShortUrlController {
  private final FormConfigRepository formConfigRepository;
  private final FormViewRepository formViewRepository;
  private final LiveEmitterRegistry liveEmitterRegistry;

  public ShortUrlController(
      FormConfigRepository formConfigRepository,
      FormViewRepository formViewRepository,
      LiveEmitterRegistry liveEmitterRegistry) {
    this.formConfigRepository = formConfigRepository;
    this.formViewRepository = formViewRepository;
    this.liveEmitterRegistry = liveEmitterRegistry;
  }

  @GetMapping("/{code}")
  public ResponseEntity<Void> redirectShortUrl(
      @PathVariable String code,
      @RequestHeader(value = "User-Agent", required = false) String userAgent,
      @RequestHeader(value = "Referer", required = false) String referer) {
    
    // Look up form config containing this shortCode in sharingJson
    FormConfig config = formConfigRepository.findAll().stream()
        .filter(c -> c.getSharingJson() != null && c.getSharingJson().contains("\"shortCode\":\"" + code + "\""))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Short link not found or expired"));

    // Record view in DB
    FormView view = new FormView();
    view.setFormId(config.getId());
    view.setUserAgent(userAgent);
    view.setReferer(referer);
    view.setBrowser(parseBrowser(userAgent));
    view.setOs(parseOs(userAgent));
    view.setDeviceType(parseDeviceType(userAgent));
    view.setCountry("Unknown");
    view.setCity("Unknown");
    view.setCreatedAt(Instant.now());

    formViewRepository.save(view);

    // Notify active Live Emmitters registry
    liveEmitterRegistry.broadcast(config.getId(), "VIEW_CREATED", view);

    // Redirect to client participant intake page
    String targetUrl = "http://localhost:3000/form?id=" + config.getId();
    
    HttpHeaders headers = new HttpHeaders();
    headers.set("Location", targetUrl);
    
    return new ResponseEntity<>(headers, HttpStatus.FOUND);
  }

  private String parseBrowser(String ua) {
    if (ua == null) return "Unknown";
    String lower = ua.toLowerCase();
    if (lower.contains("edg")) return "Edge";
    if (lower.contains("chrome") && !lower.contains("chromium")) return "Chrome";
    if (lower.contains("safari") && !lower.contains("chrome")) return "Safari";
    if (lower.contains("firefox")) return "Firefox";
    if (lower.contains("opera") || lower.contains("opr")) return "Opera";
    return "Unknown Browser";
  }

  private String parseOs(String ua) {
    if (ua == null) return "Unknown";
    String lower = ua.toLowerCase();
    if (lower.contains("windows")) return "Windows";
    if (lower.contains("macintosh") || lower.contains("mac os")) return "macOS";
    if (lower.contains("android")) return "Android";
    if (lower.contains("iphone") || lower.contains("ipad")) return "iOS";
    if (lower.contains("linux")) return "Linux";
    return "Unknown OS";
  }

  private String parseDeviceType(String ua) {
    if (ua == null) return "Desktop";
    String lower = ua.toLowerCase();
    if (lower.contains("ipad") || (lower.contains("android") && !lower.contains("mobile"))) return "Tablet";
    if (lower.contains("mobile") || lower.contains("iphone") || lower.contains("android")) return "Mobile";
    return "Desktop";
  }
}
