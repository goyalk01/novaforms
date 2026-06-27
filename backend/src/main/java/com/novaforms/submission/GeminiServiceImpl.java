package com.novaforms.submission;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class GeminiServiceImpl implements GeminiService {
  private final SubmissionRepository submissionRepository;
  private final FormConfigRepository formConfigRepository;
  private final RestTemplate restTemplate = new RestTemplate();
  private final ObjectMapper mapper = new ObjectMapper();

  @Value("${gemini.api-key:}")
  private String apiKey;

  public GeminiServiceImpl(
      SubmissionRepository submissionRepository,
      FormConfigRepository formConfigRepository) {
    this.submissionRepository = submissionRepository;
    this.formConfigRepository = formConfigRepository;
  }

  private boolean isAIAvailable() {
    return apiKey != null && !apiKey.isBlank();
  }

  private static final String AI_UNAVAILABLE_RESPONSE =
      "{\"error\":\"AI features are currently unavailable. Please configure GEMINI_API_KEY to enable AI capabilities.\",\"available\":false}";

  @Override
  public String generateForm(String prompt) {
    if (!isAIAvailable()) {
      return AI_UNAVAILABLE_RESPONSE;
    }

    String apiTarget = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + apiKey;

    String systemPrompt = "You are an AI Form Builder. Generate a complete form configuration in JSON format. Do not return any Markdown styling or explanation text, return raw JSON only. " +
        "Ensure the JSON matches this schema structure:\n" +
        "{\n" +
        "  \"title\": \"Form Title\",\n" +
        "  \"description\": \"Description\",\n" +
        "  \"theme\": \"cyberpunk | silver | graphite | onyx\",\n" +
        "  \"layoutDensity\": \"compact | comfortable | spacious\",\n" +
        "  \"questions\": [\n" +
        "    {\n" +
        "      \"id\": \"unique_id_string\",\n" +
        "      \"title\": \"Question Label\",\n" +
        "      \"type\": \"short-answer | paragraph | multiple-choice | checkboxes | dropdown | star-rating | scale | date | file\",\n" +
        "      \"required\": true,\n" +
        "      \"helpText\": \"Optional instruction text\",\n" +
        "      \"placeholder\": \"Optional placeholder\",\n" +
        "      \"options\": [\"Option 1\", \"Option 2\"] (only if type is multiple-choice, checkboxes, dropdown),\n" +
        "      \"scaleMax\": 5 (only if rating or scale)\n" +
        "    }\n" +
        "  ],\n" +
        "  \"settings\": {\n" +
        "    \"allowMultiple\": true,\n" +
        "    \"showThankYou\": true,\n" +
        "    \"successMessage\": \"Response submitted!\"\n" +
        "  }\n" +
        "}";

    try {
      Map<String, Object> payload = new HashMap<>();
      Map<String, Object> contentMap = new HashMap<>();
      Map<String, Object> partMap = new HashMap<>();
      partMap.put("text", systemPrompt + "\n\nUser request: Create a form for: " + prompt);
      contentMap.put("parts", Collections.singletonList(partMap));
      payload.put("contents", Collections.singletonList(contentMap));
      
      Map<String, Object> genConfig = new HashMap<>();
      genConfig.put("responseMimeType", "application/json");
      payload.put("generationConfig", genConfig);

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

      ResponseEntity<String> res = restTemplate.postForEntity(apiTarget, request, String.class);
      if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
        return extractJsonFromResponse(res.getBody());
      }
    } catch (Exception e) {
      System.err.println("Gemini generateForm API call failed: " + e.getMessage());
    }

    return "{\"error\":\"AI form generation failed. The Gemini API returned an error. Please try again later.\",\"available\":false}";
  }

  @Override
  public String editQuestion(String action, String questionJson, String context) {
    if (!isAIAvailable()) {
      return AI_UNAVAILABLE_RESPONSE;
    }

    String apiTarget = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + apiKey;

    String systemPrompt = "You are a Question Optimizer. Apply the requested action: '" + action + "' (context: " + context + ") to the provided question JSON. " +
        "Modify the question fields accordingly (e.g. translate, rewrite, summarize, generate choices, expand, shorten, add placeholder or validation regex) and return the updated question in raw JSON format. " +
        "Do not explain, do not add markdown backticks. Return the JSON object directly.";

    try {
      Map<String, Object> payload = new HashMap<>();
      Map<String, Object> contentMap = new HashMap<>();
      Map<String, Object> partMap = new HashMap<>();
      partMap.put("text", systemPrompt + "\n\nQuestion JSON:\n" + questionJson);
      contentMap.put("parts", Collections.singletonList(partMap));
      payload.put("contents", Collections.singletonList(contentMap));

      Map<String, Object> genConfig = new HashMap<>();
      genConfig.put("responseMimeType", "application/json");
      payload.put("generationConfig", genConfig);

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

      ResponseEntity<String> res = restTemplate.postForEntity(apiTarget, request, String.class);
      if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
        return extractJsonFromResponse(res.getBody());
      }
    } catch (Exception e) {
      System.err.println("Gemini editQuestion API call failed: " + e.getMessage());
    }

    return "{\"error\":\"AI question editing failed. The Gemini API returned an error. Please try again later.\",\"available\":false}";
  }

  @Override
  public String generateResponseInsights(Long formId) {
    List<Submission> submissions = submissionRepository.findByFormId(formId);
    FormConfig formConfig = formConfigRepository.findById(formId).orElse(null);
    String formTitle = formConfig != null ? formConfig.getTitle() : "Form #" + formId;

    if (submissions.isEmpty()) {
      return "{\"insights\":\"No submissions available yet to generate AI insights.\"}";
    }

    if (!isAIAvailable()) {
      return AI_UNAVAILABLE_RESPONSE;
    }

    // Compile text answers summary for analysis
    StringBuilder responsesSummary = new StringBuilder();
    responsesSummary.append("Form Title: ").append(formTitle).append("\n\n");
    int limit = Math.min(submissions.size(), 200);
    for (int i = 0; i < limit; i++) {
      Submission s = submissions.get(i);
      responsesSummary.append("Response #").append(s.getId())
          .append(" - Rating: ").append(s.getRating()).append("\n")
          .append("Answers: ").append(s.getAnswersJson()).append("\n\n");
    }

    String apiTarget = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + apiKey;

    String systemPrompt = "You are a Data Analyst. Analyze the following form submissions and compile insights in JSON format. Do not return markdown, do not explain. Return raw JSON matching this structure:\n" +
        "{\n" +
        "  \"sentimentScore\": 85 (0-100 score),\n" +
        "  \"sentimentSummary\": \"Short description of general mood\",\n" +
        "  \"topInsights\": [\"Insight 1\", \"Insight 2\"],\n" +
        "  \"positiveTrends\": [\"Trend 1\", \"Trend 2\"],\n" +
        "  \"negativeTrends\": [\"Trend 1\", \"Trend 2\"],\n" +
        "  \"commonIssues\": [\"Issue 1\", \"Issue 2\"],\n" +
        "  \"suggestedImprovements\": [\"Improvement 1\", \"Improvement 2\"]\n" +
        "}";

    try {
      Map<String, Object> payload = new HashMap<>();
      Map<String, Object> contentMap = new HashMap<>();
      Map<String, Object> partMap = new HashMap<>();
      partMap.put("text", systemPrompt + "\n\nSubmissions Data:\n" + responsesSummary.toString());
      contentMap.put("parts", Collections.singletonList(partMap));
      payload.put("contents", Collections.singletonList(contentMap));

      Map<String, Object> genConfig = new HashMap<>();
      genConfig.put("responseMimeType", "application/json");
      payload.put("generationConfig", genConfig);

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

      ResponseEntity<String> res = restTemplate.postForEntity(apiTarget, request, String.class);
      if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
        return extractJsonFromResponse(res.getBody());
      }
    } catch (Exception e) {
      System.err.println("Gemini generateResponseInsights API call failed: " + e.getMessage());
    }

    return "{\"error\":\"AI analysis failed. The Gemini API returned an error. Please try again later.\",\"available\":false}";
  }

  private String extractJsonFromResponse(String rawBody) {
    try {
      Map<String, Object> responseMap = mapper.readValue(rawBody, new TypeReference<Map<String, Object>>() {});
      List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
      if (candidates != null && !candidates.isEmpty()) {
        Map<String, Object> candidate = candidates.get(0);
        Map<String, Object> content = (Map<String, Object>) candidate.get("content");
        if (content != null) {
          List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
          if (parts != null && !parts.isEmpty()) {
            String text = (String) parts.get(0).get("text");
            if (text != null) {
              return text.trim();
            }
          }
        }
      }
    } catch (Exception e) {
      System.err.println("Failed to parse Gemini raw response: " + e.getMessage());
    }
    return rawBody;
  }
}
