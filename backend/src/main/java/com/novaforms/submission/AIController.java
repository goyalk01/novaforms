package com.novaforms.submission;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class AIController {
  private final GeminiService geminiService;

  public AIController(GeminiService geminiService) {
    this.geminiService = geminiService;
  }

  public record GenerateFormRequest(String prompt) {}

  @PostMapping("/generate-form")
  public ApiResponse<String> generateForm(@RequestBody GenerateFormRequest request) {
    if (request.prompt() == null || request.prompt().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prompt is required");
    }
    String formJson = geminiService.generateForm(request.prompt());
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", formJson);
  }

  public record EditQuestionRequest(String action, String questionJson, String context) {}

  @PostMapping("/edit-question")
  public ApiResponse<String> editQuestion(@RequestBody EditQuestionRequest request) {
    if (request.action() == null || request.action().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Action is required");
    }
    if (request.questionJson() == null || request.questionJson().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question JSON is required");
    }
    String updatedJson = geminiService.editQuestion(request.action(), request.questionJson(), request.context());
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", updatedJson);
  }

  @GetMapping("/insights")
  public ApiResponse<String> getInsights(@RequestParam Long formId) {
    String insightsJson = geminiService.generateResponseInsights(formId);
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", insightsJson);
  }
}
