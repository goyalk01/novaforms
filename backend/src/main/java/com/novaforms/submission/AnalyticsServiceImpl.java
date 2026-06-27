package com.novaforms.submission;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {
  private final SubmissionRepository submissionRepository;
  private final FormViewRepository formViewRepository;
  private final ObjectMapper mapper = new ObjectMapper();

  private static final DateTimeFormatter DAILY_FORMATTER = 
      DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.systemDefault());
  private static final DateTimeFormatter WEEKLY_FORMATTER = 
      DateTimeFormatter.ofPattern("yyyy-'W'ww").withZone(ZoneId.systemDefault());
  private static final DateTimeFormatter MONTHLY_FORMATTER = 
      DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneId.systemDefault());

  public AnalyticsServiceImpl(
      SubmissionRepository submissionRepository,
      FormViewRepository formViewRepository) {
    this.submissionRepository = submissionRepository;
    this.formViewRepository = formViewRepository;
  }

  @Override
  public FormAnalytics getFormAnalytics(Long formId) {
    List<Submission> submissions = submissionRepository.findByFormId(formId);
    List<FormView> views = formViewRepository.findByFormId(formId);

    long totalViews = views.size();
    long totalResponses = submissions.size();

    double conversionRate = totalViews > 0 ? ((double) totalResponses / totalViews) * 100 : 0.0;
    conversionRate = Math.round(conversionRate * 10.0) / 10.0;

    double averageCompletionTime = submissions.stream()
        .mapToDouble(s -> s.getCompletionTimeSeconds() != null ? s.getCompletionTimeSeconds() : 0.0)
        .average()
        .orElse(0.0);
    averageCompletionTime = Math.round(averageCompletionTime * 10.0) / 10.0;

    double completionPercentage = totalResponses > 0 ? 100.0 : 0.0; // Simplification: view-to-submission rate

    // Submissions Time Series
    List<DataPoint> dailyResponses = aggregateTimeSeries(submissions, DAILY_FORMATTER);
    List<DataPoint> weeklyResponses = aggregateTimeSeries(submissions, WEEKLY_FORMATTER);
    List<DataPoint> monthlyResponses = aggregateTimeSeries(submissions, MONTHLY_FORMATTER);

    // Heatmap (Day of Week [0-6] vs Hour of Day [0-23])
    List<HeatmapPoint> heatmap = aggregateHeatmap(submissions);

    // Metadata breakdowns
    List<MetricCount> browsers = aggregateField(submissions, Submission::getBrowser, views, FormView::getBrowser);
    List<MetricCount> operatingSystems = aggregateField(submissions, Submission::getOs, views, FormView::getOs);
    List<MetricCount> deviceTypes = aggregateField(submissions, Submission::getDeviceType, views, FormView::getDeviceType);
    List<MetricCount> countries = aggregateField(submissions, Submission::getCountry, views, FormView::getCountry);
    List<MetricCount> cities = aggregateField(submissions, Submission::getCity, views, FormView::getCity);
    List<MetricCount> referers = aggregateField(submissions, Submission::getReferer, views, FormView::getReferer);

    // Question analytics
    List<QuestionAnalytic> questionAnalytics = analyzeQuestions(submissions);

    return new FormAnalytics(
        totalViews,
        totalResponses,
        conversionRate,
        averageCompletionTime,
        completionPercentage,
        dailyResponses,
        weeklyResponses,
        monthlyResponses,
        heatmap,
        browsers,
        operatingSystems,
        deviceTypes,
        countries,
        cities,
        referers,
        questionAnalytics
    );
  }

  private List<DataPoint> aggregateTimeSeries(List<Submission> submissions, DateTimeFormatter formatter) {
    Map<String, Long> counts = submissions.stream()
        .filter(s -> s.getCreatedAt() != null)
        .collect(Collectors.groupingBy(
            s -> formatter.format(s.getCreatedAt()),
            TreeMap::new,
            Collectors.counting()
        ));

    return counts.entrySet().stream()
        .map(e -> new DataPoint(e.getKey(), e.getValue()))
        .toList();
  }

  private List<HeatmapPoint> aggregateHeatmap(List<Submission> submissions) {
    Map<String, Long> counts = submissions.stream()
        .filter(s -> s.getCreatedAt() != null)
        .collect(Collectors.groupingBy(s -> {
          java.time.LocalDateTime ldt = java.time.LocalDateTime.ofInstant(s.getCreatedAt(), ZoneId.systemDefault());
          int dow = ldt.getDayOfWeek().getValue() % 7; // Sunday = 0
          int hod = ldt.getHour();
          return dow + "," + hod;
        }, Collectors.counting()));

    List<HeatmapPoint> points = new ArrayList<>();
    for (int d = 0; d < 7; d++) {
      for (int h = 0; h < 24; h++) {
        long count = counts.getOrDefault(d + "," + h, 0L);
        points.add(new HeatmapPoint(d, h, count));
      }
    }
    return points;
  }

  private List<MetricCount> aggregateField(
      List<Submission> submissions,
      java.util.function.Function<Submission, String> subGetter,
      List<FormView> views,
      java.util.function.Function<FormView, String> viewGetter) {

    Map<String, Long> counts = new HashMap<>();
    
    // Aggregate from submissions
    submissions.stream()
        .map(subGetter)
        .filter(Objects::nonNull)
        .forEach(val -> counts.put(val, counts.getOrDefault(val, 0L) + 1));

    // Aggregate from views (for items that only viewed)
    views.stream()
        .map(viewGetter)
        .filter(Objects::nonNull)
        .forEach(val -> {
          if (!counts.containsKey(val)) {
            counts.put(val, 0L); // Ensure it's in list, but submission counts are primary
          }
        });

    if (counts.isEmpty()) {
      return List.of();
    }

    return counts.entrySet().stream()
        .map(e -> new MetricCount(e.getKey(), e.getValue()))
        .sorted((a, b) -> Long.compare(b.count(), a.count()))
        .toList();
  }

  private List<QuestionAnalytic> analyzeQuestions(List<Submission> submissions) {
    if (submissions.isEmpty()) {
      return List.of();
    }

    // Identify all unique questions from submissions
    Map<String, String> questionTitles = new HashMap<>();
    Map<String, String> questionTypes = new HashMap<>();

    for (Submission sub : submissions) {
      if (sub.getQuestionsJson() != null && !sub.getQuestionsJson().isBlank()) {
        try {
          List<Map<String, Object>> questions = mapper.readValue(
              sub.getQuestionsJson(),
              new TypeReference<List<Map<String, Object>>>() {}
          );
          for (Map<String, Object> q : questions) {
            String id = (String) q.get("id");
            String title = (String) q.get("title");
            String type = (String) q.get("type");
            if (id != null) {
              if (title != null) questionTitles.put(id, title);
              if (type != null) questionTypes.put(id, type);
            }
          }
        } catch (Exception ignored) {}
      }
    }

    List<QuestionAnalytic> analyticsList = new ArrayList<>();

    for (String qId : questionTitles.keySet()) {
      String title = questionTitles.get(qId);
      String type = questionTypes.get(qId);

      List<Object> rawAnswers = new ArrayList<>();
      for (Submission sub : submissions) {
        if (sub.getAnswersJson() != null && !sub.getAnswersJson().isBlank()) {
          try {
            Map<String, Object> answersMap = mapper.readValue(
                sub.getAnswersJson(),
                new TypeReference<Map<String, Object>>() {}
            );
            Object ans = answersMap.get(qId);
            if (ans != null) {
              rawAnswers.add(ans);
            }
          } catch (Exception ignored) {}
        }
      }

      Double average = null;
      Double median = null;
      Integer npsScore = null;
      List<MetricCount> optionsFrequency = null;
      List<String> topAnswers = new ArrayList<>();
      List<MetricCount> wordCloud = null;

      // Numeric / scale analysis
      if ("scale".equals(type) || "star-rating".equals(type) || "emoji-rating".equals(type) || "nps".equals(type) || "rating".equals(type)) {
        List<Double> numVals = rawAnswers.stream()
            .map(this::parseDouble)
            .filter(Objects::nonNull)
            .toList();

        if (!numVals.isEmpty()) {
          average = numVals.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
          average = Math.round(average * 10.0) / 10.0;

          List<Double> sorted = new ArrayList<>(numVals);
          Collections.sort(sorted);
          if (sorted.size() % 2 == 1) {
            median = sorted.get(sorted.size() / 2);
          } else {
            median = (sorted.get(sorted.size() / 2 - 1) + sorted.get(sorted.size() / 2)) / 2.0;
          }
          median = Math.round(median * 10.0) / 10.0;

          // NPS calculations: score 0 to 10
          if ("nps".equals(type)) {
            long promoters = numVals.stream().filter(v -> v >= 9.0).count();
            long detractors = numVals.stream().filter(v -> v <= 6.0).count();
            long totalNps = numVals.size();
            double pctP = ((double) promoters / totalNps) * 100.0;
            double pctD = ((double) detractors / totalNps) * 100.0;
            npsScore = (int) Math.round(pctP - pctD);
          }
        }
      }

      // Categorical (multiple-choice, checkboxes, dropdown)
      if ("multiple-choice".equals(type) || "checkboxes".equals(type) || "dropdown".equals(type) || "ranking".equals(type)) {
        Map<String, Long> freqs = new HashMap<>();
        for (Object ans : rawAnswers) {
          if (ans instanceof List<?> list) {
            list.stream().map(Object::toString).forEach(item -> freqs.put(item, freqs.getOrDefault(item, 0L) + 1));
          } else if (ans instanceof String[] arr) {
            Arrays.stream(arr).forEach(item -> freqs.put(item, freqs.getOrDefault(item, 0L) + 1));
          } else {
            String str = ans.toString();
            freqs.put(str, freqs.getOrDefault(str, 0L) + 1);
          }
        }
        optionsFrequency = freqs.entrySet().stream()
            .map(e -> new MetricCount(e.getKey(), e.getValue()))
            .sorted((a, b) -> Long.compare(b.count(), a.count()))
            .toList();
      }

      // Open Text Word Cloud (short-answer, paragraph)
      if ("short-answer".equals(type) || "paragraph".equals(type)) {
        Map<String, Long> words = new HashMap<>();
        List<String> stopWords = Arrays.asList("the", "a", "an", "and", "or", "but", "if", "then", "of", "to", "in", "is", "it", "this", "that", "you", "for", "with", "on", "was", "as", "at", "by", "an", "be");
        
        for (Object ans : rawAnswers) {
          String text = ans.toString().toLowerCase().replaceAll("[^a-zA-Z0-9\\s]", "");
          topAnswers.add(ans.toString());
          Arrays.stream(text.split("\\s+"))
              .filter(w -> w.length() > 2)
              .filter(w -> !stopWords.contains(w))
              .forEach(w -> words.put(w, words.getOrDefault(w, 0L) + 1));
        }

        wordCloud = words.entrySet().stream()
            .map(e -> new MetricCount(e.getKey(), e.getValue()))
            .sorted((a, b) -> Long.compare(b.count(), a.count()))
            .limit(30)
            .toList();

        // Limit top raw answers to last 5 items
        if (topAnswers.size() > 5) {
          topAnswers = topAnswers.subList(topAnswers.size() - 5, topAnswers.size());
        }
      }

      analyticsList.add(new QuestionAnalytic(
          qId,
          title,
          type,
          average,
          median,
          npsScore,
          optionsFrequency != null ? optionsFrequency : List.of(),
          topAnswers,
          wordCloud != null ? wordCloud : List.of()
      ));
    }

    return analyticsList;
  }

  private Double parseDouble(Object val) {
    if (val == null) return null;
    try {
      if (val instanceof Number num) return num.doubleValue();
      return Double.parseDouble(val.toString());
    } catch (Exception e) {
      return null;
    }
  }
}
