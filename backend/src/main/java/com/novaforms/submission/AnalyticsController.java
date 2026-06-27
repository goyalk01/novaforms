package com.novaforms.submission;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/form-config")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class AnalyticsController {
  private final AnalyticsService analyticsService;
  private final FormConfigRepository formConfigRepository;

  public AnalyticsController(
      AnalyticsService analyticsService,
      FormConfigRepository formConfigRepository) {
    this.analyticsService = analyticsService;
    this.formConfigRepository = formConfigRepository;
  }

  @GetMapping("/{id}/analytics")
  public ApiResponse<AnalyticsService.FormAnalytics> getAnalytics(@PathVariable Long id) {
    if (!formConfigRepository.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found");
    }
    AnalyticsService.FormAnalytics data = analyticsService.getFormAnalytics(id);
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", data);
  }
}
