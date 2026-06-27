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

  private String status;
  private Boolean published;
  private Instant publishedAt;
  private Instant openAt;
  private Instant closeAt;
  private String timezone;

  @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
  private AccessMode accessMode;

  private String passwordHash;
  private Integer maxResponses;
  private String closedReason;

  @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
  private Visibility visibility;

  private String autoCloseDuration;

  @Column(columnDefinition = "TEXT")
  private String businessHoursJson;

  @Column(columnDefinition = "TEXT")
  private String statusPagesJson;

  @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
  private PublishState publishState;

  @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
  private ManualState manualState;

  private String publishedBy;
  private Instant archivedAt;
  private String archivedBy;
  private Instant lastUpdated;
  private Instant lastLifecycleChange;
  private String lastLifecycleUser;

  @Column(columnDefinition = "TEXT")
  private String logicJson;

  @Column(columnDefinition = "TEXT")
  private String themeJson;

  @Column(columnDefinition = "TEXT")
  private String sharingJson;

  private static final com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

  public FormConfig() {
    this.status = "DRAFT";
    this.published = false;
    this.timezone = "UTC";
    this.accessMode = AccessMode.PUBLIC;
    this.maxResponses = 0;
    this.visibility = Visibility.PUBLIC;
    this.publishState = PublishState.DRAFT;
    this.manualState = ManualState.NORMAL;
    this.logicJson = "[]";
    this.themeJson = "{}";
    this.sharingJson = "{}";
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

  public AccessMode getAccessMode() {
    return accessMode;
  }

  public void setAccessMode(AccessMode accessMode) {
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

  public Visibility getVisibility() {
    return visibility;
  }

  public void setVisibility(Visibility visibility) {
    this.visibility = visibility;
  }

  public String getAutoCloseDuration() {
    return autoCloseDuration;
  }

  public void setAutoCloseDuration(String autoCloseDuration) {
    this.autoCloseDuration = autoCloseDuration;
  }

  public String getBusinessHoursJson() {
    return businessHoursJson;
  }

  public void setBusinessHoursJson(String businessHoursJson) {
      if (businessHoursJson != null && !businessHoursJson.isBlank()) {
          try {
              java.util.List<BusinessHourSlot> slots = mapper.readValue(
                  businessHoursJson,
                  mapper.getTypeFactory().constructCollectionType(java.util.List.class, BusinessHourSlot.class)
              );
              BusinessHoursConfig.validate(slots);
          } catch (IllegalArgumentException e) {
              throw e;
          } catch (Exception e) {
              throw new IllegalArgumentException("Invalid Business Hours JSON schema: " + e.getMessage());
          }
      }
      this.businessHoursJson = businessHoursJson;
  }

  public String getStatusPagesJson() {
    return statusPagesJson;
  }

  public void setStatusPagesJson(String statusPagesJson) {
      if (statusPagesJson != null && !statusPagesJson.isBlank()) {
          try {
              mapper.readValue(statusPagesJson, StatusPagesConfig.class);
          } catch (Exception e) {
              throw new IllegalArgumentException("Invalid Status Page JSON schema: " + e.getMessage());
          }
      }
      this.statusPagesJson = statusPagesJson;
  }

  public PublishState getPublishState() {
    return publishState;
  }

  public void setPublishState(PublishState publishState) {
    this.publishState = publishState;
  }

  public ManualState getManualState() {
    return manualState;
  }

  public void setManualState(ManualState manualState) {
    this.manualState = manualState;
  }

  public String getPublishedBy() {
    return publishedBy;
  }

  public void setPublishedBy(String publishedBy) {
    this.publishedBy = publishedBy;
  }

  public Instant getArchivedAt() {
    return archivedAt;
  }

  public void setArchivedAt(Instant archivedAt) {
    this.archivedAt = archivedAt;
  }

  public String getArchivedBy() {
    return archivedBy;
  }

  public void setArchivedBy(String archivedBy) {
    this.archivedBy = archivedBy;
  }

  public Instant getLastUpdated() {
    return lastUpdated;
  }

  public void setLastUpdated(Instant lastUpdated) {
    this.lastUpdated = lastUpdated;
  }

  public Instant getLastLifecycleChange() {
    return lastLifecycleChange;
  }

  public void setLastLifecycleChange(Instant lastLifecycleChange) {
    this.lastLifecycleChange = lastLifecycleChange;
  }

  public String getLastLifecycleUser() {
    return lastLifecycleUser;
  }

  public String getLogicJson() {
    return logicJson;
  }

  public void setLogicJson(String logicJson) {
    this.logicJson = logicJson;
  }

  public String getThemeJson() {
    return themeJson;
  }

  public void setThemeJson(String themeJson) {
    this.themeJson = themeJson;
  }

  public String getSharingJson() {
    return sharingJson;
  }

  public void setSharingJson(String sharingJson) {
    this.sharingJson = sharingJson;
  }

  public void setLastLifecycleUser(String lastLifecycleUser) {
    this.lastLifecycleUser = lastLifecycleUser;
  }
}
