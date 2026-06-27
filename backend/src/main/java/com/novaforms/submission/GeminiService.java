package com.novaforms.submission;

public interface GeminiService {
  String generateForm(String prompt);
  String editQuestion(String action, String questionJson, String context);
  String generateResponseInsights(Long formId);
}
