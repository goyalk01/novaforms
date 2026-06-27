package com.novaforms.submission;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/submissions")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class SubmissionController {
  private final SubmissionRepository repository;
  private final FormConfigRepository formConfigRepository;
  private final CollaboratorRepository collaboratorRepository;
  private final LifecycleService lifecycleService;
  private final LiveEmitterRegistry liveEmitterRegistry;

  public SubmissionController(
      SubmissionRepository repository, 
      FormConfigRepository formConfigRepository, 
      CollaboratorRepository collaboratorRepository,
      LifecycleService lifecycleService,
      LiveEmitterRegistry liveEmitterRegistry) {
    this.repository = repository;
    this.formConfigRepository = formConfigRepository;
    this.collaboratorRepository = collaboratorRepository;
    this.lifecycleService = lifecycleService;
    this.liveEmitterRegistry = liveEmitterRegistry;
  }

  @GetMapping
  public ApiResponse<List<SubmissionResponse>> list(@RequestParam(required = false) Long formId) {
    List<SubmissionResponse> data;
    if (formId != null) {
      data = repository.findByFormId(formId).stream().map(SubmissionResponse::fromEntity).toList();
    } else {
      data = repository.findAll().stream().map(SubmissionResponse::fromEntity).toList();
    }
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", data);
  }

  @PostMapping
  public ApiResponse<SubmissionResponse> create(
      @Valid @RequestBody SubmissionRequest request,
      @RequestHeader(value = "X-Form-Token", required = false) String headerToken) {
    Long formId = request.formId() == null ? 1L : request.formId();
    FormConfig config = formConfigRepository.findById(formId)
        .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Form config not found"));

    // 1. Calculate and validate Dynamic Status
    DynamicStatus dynamicStatus = lifecycleService.calculateDynamicStatus(config);
    if (DynamicStatus.OPEN != dynamicStatus) {
      if (DynamicStatus.DRAFT == dynamicStatus) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Form is in draft mode and not accepting responses.");
      }
      if (DynamicStatus.ARCHIVED == dynamicStatus) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Form is archived and not accepting responses.");
      }
      if (DynamicStatus.PAUSED == dynamicStatus) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Form is temporarily paused.");
      }
      if (DynamicStatus.MAINTENANCE == dynamicStatus) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Form is currently down for maintenance.");
      }
      if (DynamicStatus.LIMIT_REACHED == dynamicStatus) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Form has reached its response limit.");
      }
      if (DynamicStatus.SCHEDULED == dynamicStatus) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Form is not accepting responses yet.");
      }
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Form is closed and not accepting responses.");
    }

    // 2. Validate Visibility Mode (PRIVATE)
    if (Visibility.PRIVATE == config.getVisibility()) {
      String email = request.email();
      boolean isCollab = false;
      if (email != null && !email.isBlank()) {
        List<Collaborator> collabs = collaboratorRepository.findByFormId(formId);
        isCollab = collabs.stream().anyMatch(c -> c.getEmail().equalsIgnoreCase(email));
      }
      if (!isCollab) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "This form is private and only accessible by collaborators.");
      }
    }

    // 3. Validate Password Verification
    if (AccessMode.PASSWORD_PROTECTED == config.getAccessMode()) {
      boolean passwordOk = false;
      if (headerToken != null && !headerToken.isBlank()) {
        if (FormTokenUtils.verifyToken(headerToken, formId)) {
          passwordOk = true;
        }
      }
      if (!passwordOk && request.email() != null && !request.email().isBlank()) {
        List<Collaborator> collabs = collaboratorRepository.findByFormId(formId);
        if (collabs.stream().anyMatch(c -> c.getEmail().equalsIgnoreCase(request.email()))) {
          passwordOk = true;
        }
      }
      if (!passwordOk && config.getPasswordHash() != null) {
        if (request.password() != null && PasswordUtils.verifyPassword(request.password(), config.getPasswordHash())) {
          passwordOk = true;
        }
      }
      if (!passwordOk) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid form password.");
      }
    }

    Submission submission = new Submission();
    submission.setFormId(formId);
    submission.setFormTitle(request.formTitle());
    submission.setFormDescription(request.formDescription());
    submission.setFullName(request.fullName());
    submission.setEmail(request.email());
    submission.setCompany(request.company());
    submission.setRating(request.rating());
    submission.setSubmissionMode(request.submissionMode());
    submission.setThemeMode(request.themeMode());
    submission.setLayoutDensity(request.layoutDensity());
    submission.setInterests(request.interests());
    submission.setQuestionsJson(request.questionsJson());
    submission.setAnswersJson(request.answersJson());
    submission.setMessage(request.message());
    submission.setBrowser(request.browser());
    submission.setOs(request.os());
    submission.setDeviceType(request.deviceType());
    submission.setCountry(request.country());
    submission.setCity(request.city());
    submission.setReferer(request.referer());
    submission.setCompletionTimeSeconds(request.completionTimeSeconds());
    submission.setCreatedAt(Instant.now());

    SubmissionResponse data = SubmissionResponse.fromEntity(repository.save(submission));
    liveEmitterRegistry.broadcast(formId, "SUBMISSION_CREATED", data);
    return new ApiResponse<>(HttpStatus.OK.value(), "Submission created successfully", data);
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Void> delete(@PathVariable Long id) {
    repository.deleteById(id);
    return new ApiResponse<>(HttpStatus.OK.value(), "Submission deleted successfully", null);
  }

  @GetMapping("/{id}")
  public ApiResponse<SubmissionResponse> getById(@PathVariable Long id) {
    SubmissionResponse data = repository.findById(id)
        .map(SubmissionResponse::fromEntity)
        .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Submission not found"));
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", data);
  }

  @PutMapping("/{id}")
  public ApiResponse<SubmissionResponse> update(@PathVariable Long id, @Valid @RequestBody SubmissionRequest request) {
    Submission submission = repository.findById(id)
        .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Submission not found"));

    submission.setFullName(request.fullName());
    submission.setEmail(request.email());
    submission.setCompany(request.company());
    submission.setRating(request.rating());
    submission.setInterests(request.interests());
    submission.setAnswersJson(request.answersJson());
    submission.setMessage(request.message());

    SubmissionResponse data = SubmissionResponse.fromEntity(repository.save(submission));
    return new ApiResponse<>(HttpStatus.OK.value(), "Submission updated successfully", data);
  }
}
