package com.novaforms.submission;

import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SubmissionRequest(
    Long formId,
    @NotBlank String formTitle,
    String formDescription,
    @NotBlank String fullName,
    @Email @NotBlank String email,
    String company,
    Integer rating,
    String submissionMode,
    String themeMode,
    String layoutDensity,
    List<String> interests,
    String questionsJson,
    String answersJson,
    String message) {
  public SubmissionRequest {
    rating = rating == null ? 0 : rating;
    submissionMode = submissionMode == null || submissionMode.isBlank() ? "standard" : submissionMode;
    themeMode = themeMode == null || themeMode.isBlank() ? "silver" : themeMode;
    layoutDensity = layoutDensity == null || layoutDensity.isBlank() ? "comfortable" : layoutDensity;
    interests = interests == null ? List.of() : interests;
  }
}
