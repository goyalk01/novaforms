package com.novaforms.submission;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class GlobalSearchController {
  private final FormConfigRepository formConfigRepository;
  private final SubmissionRepository submissionRepository;
  private final CollaboratorRepository collaboratorRepository;
  private final TemplateRepository templateRepository;

  public GlobalSearchController(
      FormConfigRepository formConfigRepository,
      SubmissionRepository submissionRepository,
      CollaboratorRepository collaboratorRepository,
      TemplateRepository templateRepository) {
    this.formConfigRepository = formConfigRepository;
    this.submissionRepository = submissionRepository;
    this.collaboratorRepository = collaboratorRepository;
    this.templateRepository = templateRepository;
  }

  public record GlobalSearchResult(
      List<FormConfig> forms,
      List<Submission> responses,
      List<Collaborator> collaborators,
      List<Template> templates
  ) {}

  @GetMapping
  public ApiResponse<GlobalSearchResult> search(
      @RequestParam String q,
      @RequestParam String email) {
    
    String query = q.toLowerCase().trim();

    // 1. Fetch authorized form IDs for this user
    List<Collaborator> userCollabs = collaboratorRepository.findByEmailIgnoreCase(email);
    List<Long> authorizedFormIds = userCollabs.stream()
        .map(Collaborator::getFormId)
        .toList();

    // 2. Search forms (authorized only)
    List<FormConfig> forms = formConfigRepository.findAll().stream()
        .filter(c -> authorizedFormIds.contains(c.getId()))
        .filter(c -> (c.getName() != null && c.getName().toLowerCase().contains(query)) ||
                     (c.getTitle() != null && c.getTitle().toLowerCase().contains(query)) ||
                     (c.getDescription() != null && c.getDescription().toLowerCase().contains(query)) ||
                     (c.getQuestionsJson() != null && c.getQuestionsJson().toLowerCase().contains(query)))
        .toList();

    // 3. Search submissions (authorized only)
    List<Submission> responses = submissionRepository.findAll().stream()
        .filter(s -> authorizedFormIds.contains(s.getFormId()))
        .filter(s -> (s.getFullName() != null && s.getFullName().toLowerCase().contains(query)) ||
                     (s.getEmail() != null && s.getEmail().toLowerCase().contains(query)) ||
                     (s.getCompany() != null && s.getCompany().toLowerCase().contains(query)) ||
                     (s.getAnswersJson() != null && s.getAnswersJson().toLowerCase().contains(query)) ||
                     (s.getMessage() != null && s.getMessage().toLowerCase().contains(query)))
        .toList();

    // 4. Search collaborators
    List<Collaborator> collaborators = collaboratorRepository.findAll().stream()
        .filter(c -> authorizedFormIds.contains(c.getFormId()))
        .filter(c -> c.getEmail().toLowerCase().contains(query) || c.getRole().toLowerCase().contains(query))
        .toList();

    // 5. Search templates
    List<Template> templates = templateRepository.findAll().stream()
        .filter(t -> t.getTitle().toLowerCase().contains(query) ||
                     (t.getDescription() != null && t.getDescription().toLowerCase().contains(query)) ||
                     t.getCategory().toLowerCase().contains(query))
        .toList();

    GlobalSearchResult result = new GlobalSearchResult(forms, responses, collaborators, templates);
    return new ApiResponse<>(HttpStatus.OK.value(), "Search completed successfully", result);
  }
}
