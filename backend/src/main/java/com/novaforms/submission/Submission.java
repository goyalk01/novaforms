package com.novaforms.submission;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "submissions")
public class Submission {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long formId;
  private String formTitle;

  @Column(columnDefinition = "TEXT")
  private String formDescription;

  private String fullName;
  private String email;
  private String company;
  private Integer rating;
  private String submissionMode;
  private String themeMode;
  private String layoutDensity;

  @Column(columnDefinition = "TEXT")
  private String interestsJson;

  @Column(columnDefinition = "TEXT")
  private String questionsJson;

  @Column(columnDefinition = "TEXT")
  private String answersJson;

  @Column(columnDefinition = "TEXT")
  private String message;

  private String browser;
  private String os;
  private String deviceType;
  private String country;
  private String city;
  private String referer;
  private Integer completionTimeSeconds;

  private Instant createdAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getFormId() {
    return formId;
  }

  public void setFormId(Long formId) {
    this.formId = formId;
  }

  public String getFormTitle() {
    return formTitle;
  }

  public void setFormTitle(String formTitle) {
    this.formTitle = formTitle;
  }

  public String getFormDescription() {
    return formDescription;
  }

  public void setFormDescription(String formDescription) {
    this.formDescription = formDescription;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getCompany() {
    return company;
  }

  public void setCompany(String company) {
    this.company = company;
  }

  public Integer getRating() {
    return rating;
  }

  public void setRating(Integer rating) {
    this.rating = rating;
  }

  public String getSubmissionMode() {
    return submissionMode;
  }

  public void setSubmissionMode(String submissionMode) {
    this.submissionMode = submissionMode;
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

  public String getInterestsJson() {
    return interestsJson;
  }

  public void setInterestsJson(String interestsJson) {
    this.interestsJson = interestsJson;
  }

  public String getQuestionsJson() {
    return questionsJson;
  }

  public void setQuestionsJson(String questionsJson) {
    this.questionsJson = questionsJson;
  }

  public String getAnswersJson() {
    return answersJson;
  }

  public void setAnswersJson(String answersJson) {
    this.answersJson = answersJson;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public String getBrowser() {
    return browser;
  }

  public void setBrowser(String browser) {
    this.browser = browser;
  }

  public String getOs() {
    return os;
  }

  public void setOs(String os) {
    this.os = os;
  }

  public String getDeviceType() {
    return deviceType;
  }

  public void setDeviceType(String deviceType) {
    this.deviceType = deviceType;
  }

  public String getCountry() {
    return country;
  }

  public void setCountry(String country) {
    this.country = country;
  }

  public String getCity() {
    return city;
  }

  public void setCity(String city) {
    this.city = city;
  }

  public String getReferer() {
    return referer;
  }

  public void setReferer(String referer) {
    this.referer = referer;
  }

  public Integer getCompletionTimeSeconds() {
    return completionTimeSeconds;
  }

  public void setCompletionTimeSeconds(Integer completionTimeSeconds) {
    this.completionTimeSeconds = completionTimeSeconds;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public List<String> getInterests() {
    if (interestsJson == null || interestsJson.isBlank()) {
      return List.of();
    }

    return Arrays.stream(interestsJson.split("\\|", -1)).toList();
  }

  public void setInterests(List<String> interests) {
    this.interestsJson = String.join("|", interests);
  }
}
