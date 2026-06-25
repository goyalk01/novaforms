package com.novaforms.submission;

import java.time.Instant;
import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/submissions")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class SubmissionController {
  private final SubmissionRepository repository;
  private final FormConfigRepository formConfigRepository;

  public SubmissionController(SubmissionRepository repository, FormConfigRepository formConfigRepository) {
    this.repository = repository;
    this.formConfigRepository = formConfigRepository;
  }

  @GetMapping
  public List<SubmissionResponse> list(@RequestParam(required = false) Long formId) {
    if (formId != null) {
      return repository.findByFormId(formId).stream().map(SubmissionResponse::fromEntity).toList();
    }
    return repository.findAll().stream().map(SubmissionResponse::fromEntity).toList();
  }

  @PostMapping
  public SubmissionResponse create(@Valid @RequestBody SubmissionRequest request) {
    Long formId = request.formId() == null ? 1L : request.formId();
    FormConfig config = formConfigRepository.findById(formId)
        .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Form config not found"));

    // 1. Validate Published
    if (!Boolean.TRUE.equals(config.getPublished())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Form is in draft mode and not accepting responses.");
    }

    // 2. Validate Status Transitions (Archived, Paused, Closed)
    if ("ARCHIVED".equalsIgnoreCase(config.getStatus())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Form is archived and not accepting responses.");
    }
    if ("PAUSED".equalsIgnoreCase(config.getStatus())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Form is temporarily paused.");
    }
    if ("CLOSED".equalsIgnoreCase(config.getStatus())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Form is manually closed.");
    }

    // 3. Validate Opening Time
    if (config.getOpenAt() != null && Instant.now().isBefore(config.getOpenAt())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Form is not accepting responses yet.");
    }

    // 4. Validate Closing Time
    if (config.getCloseAt() != null && Instant.now().isAfter(config.getCloseAt())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Form has closed (scheduled time expired).");
    }

    // 5. Validate Max Responses
    if (config.getMaxResponses() != null && config.getMaxResponses() > 0) {
      long currentCount = repository.countByFormId(formId);
      if (currentCount >= config.getMaxResponses()) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Form has reached its response limit.");
      }
    }

    // 6. Validate Password Verification
    if ("PASSWORD_PROTECTED".equalsIgnoreCase(config.getAccessMode())) {
      if (config.getPasswordHash() != null) {
        if (request.password() == null || !PasswordUtils.verifyPassword(request.password(), config.getPasswordHash())) {
          throw new org.springframework.web.server.ResponseStatusException(
              org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid form password.");
        }
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
    submission.setCreatedAt(Instant.now());

    return SubmissionResponse.fromEntity(repository.save(submission));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable Long id) {
    repository.deleteById(id);
  }

  @GetMapping("/{id}")
  public SubmissionResponse getById(@PathVariable Long id) {
    return repository.findById(id)
        .map(SubmissionResponse::fromEntity)
        .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Submission not found"));
  }

  @PutMapping("/{id}")
  public SubmissionResponse update(@PathVariable Long id, @Valid @RequestBody SubmissionRequest request) {
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

    return SubmissionResponse.fromEntity(repository.save(submission));
  }
}
