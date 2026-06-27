package com.novaforms.submission;

import java.util.List;

public interface AnalyticsService {
  FormAnalytics getFormAnalytics(Long formId);

  record DataPoint(String label, long count) {}
  record HeatmapPoint(int dayOfWeek, int hourOfDay, long count) {}
  record MetricCount(String label, long count) {}

  record QuestionAnalytic(
      String questionId,
      String title,
      String type,
      Double average,
      Double median,
      Integer npsScore,
      List<MetricCount> optionsFrequency,
      List<String> topAnswers,
      List<MetricCount> wordCloud
  ) {}

  record FormAnalytics(
      long totalViews,
      long totalResponses,
      double conversionRate,
      double averageCompletionTimeSeconds,
      double completionPercentage,
      List<DataPoint> dailyResponses,
      List<DataPoint> weeklyResponses,
      List<DataPoint> monthlyResponses,
      List<HeatmapPoint> heatmap,
      List<MetricCount> browsers,
      List<MetricCount> operatingSystems,
      List<MetricCount> deviceTypes,
      List<MetricCount> countries,
      List<MetricCount> cities,
      List<MetricCount> referers,
      List<QuestionAnalytic> questionAnalytics
  ) {}
}
