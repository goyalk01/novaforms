package com.novaforms.submission;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/templates")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class TemplateController {
  private final TemplateRepository repository;
  private final FormConfigRepository formConfigRepository;
  private final CollaboratorRepository collaboratorRepository;

  public TemplateController(
      TemplateRepository repository,
      FormConfigRepository formConfigRepository,
      CollaboratorRepository collaboratorRepository) {
    this.repository = repository;
    this.formConfigRepository = formConfigRepository;
    this.collaboratorRepository = collaboratorRepository;
  }

  @GetMapping
  public ApiResponse<List<Template>> list(
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String search) {
    List<Template> data;
    if (category != null && !category.isBlank() && search != null && !search.isBlank()) {
      data = repository.findByCategoryAndTitleContainingIgnoreCase(category, search);
    } else if (category != null && !category.isBlank()) {
      data = repository.findByCategory(category);
    } else if (search != null && !search.isBlank()) {
      data = repository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(search, search);
    } else {
      data = repository.findAll();
    }
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", data);
  }

  public record UseTemplateRequest(String email, String name) {}

  @PostMapping("/{id}/use")
  public ApiResponse<FormConfig> useTemplate(
      @PathVariable Long id,
      @RequestBody UseTemplateRequest request) {
    if (request.email() == null || request.email().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
    }

    Template template = repository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));

    FormConfig config = new FormConfig();
    config.setName(request.name() != null && !request.name().isBlank() ? request.name() : template.getTitle());
    config.setTitle(template.getTitle());
    config.setDescription(template.getDescription());
    config.setQuestionsJson(template.getQuestionsJson());
    config.setSettingsJson(template.getSettingsJson());
    config.setLogicJson(template.getLogicJson());
    config.setThemeJson(template.getThemeJson());
    config.setThemeMode("silver");
    config.setLayoutDensity("comfortable");
    config.setSubmissionMode("standard");
    config.setTotalPages(1);
    config.setStatus("DRAFT");
    config.setPublished(false);
    config.setTimezone("UTC");
    config.setAccessMode(AccessMode.PUBLIC);
    config.setMaxResponses(0);
    config.setVisibility(Visibility.PUBLIC);
    config.setLastUpdated(Instant.now());

    FormConfig saved = formConfigRepository.save(config);

    Collaborator collab = new Collaborator(saved.getId(), request.email(), "OWNER");
    collaboratorRepository.save(collab);

    return new ApiResponse<>(HttpStatus.OK.value(), "Form created from template successfully", saved);
  }
}
