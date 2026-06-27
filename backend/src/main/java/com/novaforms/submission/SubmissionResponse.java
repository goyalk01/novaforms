package com.novaforms.submission;

import java.time.Instant;
import java.util.List;

public record SubmissionResponse(
    Long id,
    Long formId,
    String formTitle,
    String formDescription,
    String fullName,
    String email,
    String company,
    Integer rating,
    String submissionMode,
    String themeMode,
    String layoutDensity,
    List<String> interests,
    String questionsJson,
    String answersJson,
    String message,
    Instant createdAt,
    
    // Analytics fields
    String browser,
    String os,
    String deviceType,
    String country,
    String city,
    String referer,
    Integer completionTimeSeconds) {
  static SubmissionResponse fromEntity(Submission submission) {
    return new SubmissionResponse(
        submission.getId(),
        submission.getFormId(),
        submission.getFormTitle(),
        submission.getFormDescription(),
        submission.getFullName(),
        submission.getEmail(),
        submission.getCompany(),
        submission.getRating(),
        submission.getSubmissionMode(),
        submission.getThemeMode(),
        submission.getLayoutDensity(),
        submission.getInterests(),
        submission.getQuestionsJson(),
        submission.getAnswersJson(),
        submission.getMessage(),
        submission.getCreatedAt(),
        submission.getBrowser(),
        submission.getOs(),
        submission.getDeviceType(),
        submission.getCountry(),
        submission.getCity(),
        submission.getReferer(),
        submission.getCompletionTimeSeconds());
  }
}
