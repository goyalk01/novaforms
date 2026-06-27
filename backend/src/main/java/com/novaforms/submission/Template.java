package com.novaforms.submission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "templates")
public class Template {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  private String category;

  @Column(columnDefinition = "TEXT")
  private String questionsJson;

  @Column(columnDefinition = "TEXT")
  private String settingsJson;

  @Column(columnDefinition = "TEXT")
  private String logicJson;

  @Column(columnDefinition = "TEXT")
  private String themeJson;

  private Instant createdAt;

  public Template() {
    this.createdAt = Instant.now();
    this.questionsJson = "[]";
    this.settingsJson = "{}";
    this.logicJson = "[]";
    this.themeJson = "{}";
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
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

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getQuestionsJson() {
    return questionsJson;
  }

  public void setQuestionsJson(String questionsJson) {
    this.questionsJson = questionsJson;
  }

  public String getSettingsJson() {
    return settingsJson;
  }

  public void setSettingsJson(String settingsJson) {
    this.settingsJson = settingsJson;
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

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
