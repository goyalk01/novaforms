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

  public SubmissionController(SubmissionRepository repository) {
    this.repository = repository;
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
    Submission submission = new Submission();
    submission.setFormId(request.formId() == null ? 1L : request.formId());
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
