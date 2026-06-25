package com.novaforms.submission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "form_configs")
public class FormConfig {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  private String bannerUrl;
  private String videoUrl;

  @Column(columnDefinition = "TEXT")
  private String questionsJson;

  @Column(columnDefinition = "TEXT")
  private String settingsJson;

  private String themeMode;
  private String layoutDensity;
  private String submissionMode;
  private Integer totalPages;

  // New Lifecycle Columns
  private String status;
  private Boolean published;
  private Instant publishedAt;
  private Instant openAt;
  private Instant closeAt;
  private String timezone;
  private String accessMode;
  private String passwordHash;
  private Integer maxResponses;
  private String closedReason;

  public FormConfig() {
    this.status = "DRAFT";
    this.published = false;
    this.timezone = "UTC";
    this.accessMode = "PUBLIC";
    this.maxResponses = 0;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getBannerUrl() {
    return bannerUrl;
  }

  public void setBannerUrl(String bannerUrl) {
    this.bannerUrl = bannerUrl;
  }

  public String getVideoUrl() {
    return videoUrl;
  }

  public void setVideoUrl(String videoUrl) {
    this.videoUrl = videoUrl;
  }

  public String getQuestionsJson() {
    return questionsJson;
  }

  public void setQuestionsJson(String questionsJson) {
    this.questionsJson = questionsJson;
  }

  public String getThemeMode() {
    return themeMode;
  }

  public void setThemeMode(String themeMode) {
    this.themeMode = themeMode;
  }

  public String getLayoutDensity() {
    return layoutDensity;
  }

  public void setLayoutDensity(String layoutDensity) {
    this.layoutDensity = layoutDensity;
  }

  public String getSubmissionMode() {
    return submissionMode;
  }

  public void setSubmissionMode(String submissionMode) {
    this.submissionMode = submissionMode;
  }

  public Integer getTotalPages() {
    return totalPages;
  }

  public void setTotalPages(Integer totalPages) {
    this.totalPages = totalPages;
  }

  public String getSettingsJson() {
    return settingsJson;
  }

  public void setSettingsJson(String settingsJson) {
    this.settingsJson = settingsJson;
  }

  // Getters and setters for Lifecycle variables
  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Boolean getPublished() {
    return published;
  }

  public void setPublished(Boolean published) {
    this.published = published;
  }

  public Instant getPublishedAt() {
    return publishedAt;
  }

  public void setPublishedAt(Instant publishedAt) {
    this.publishedAt = publishedAt;
  }

  public Instant getOpenAt() {
    return openAt;
  }

  public void setOpenAt(Instant openAt) {
    this.openAt = openAt;
  }

  public Instant getCloseAt() {
    return closeAt;
  }

  public void setCloseAt(Instant closeAt) {
    this.closeAt = closeAt;
  }

  public String getTimezone() {
    return timezone;
  }

  public void setTimezone(String timezone) {
    this.timezone = timezone;
  }

  public String getAccessMode() {
    return accessMode;
  }

  public void setAccessMode(String accessMode) {
    this.accessMode = accessMode;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public Integer getMaxResponses() {
    return maxResponses;
  }

  public void setMaxResponses(Integer maxResponses) {
    this.maxResponses = maxResponses;
  }

  public String getClosedReason() {
    return closedReason;
  }

  public void setClosedReason(String closedReason) {
    this.closedReason = closedReason;
  }
}
