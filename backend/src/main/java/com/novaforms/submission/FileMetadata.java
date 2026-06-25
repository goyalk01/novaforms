package com.novaforms.submission;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "file_metadata")
public class FileMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long formId;
    private String questionId;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String originalFilename;

    private String mimeType;
    private Long size;

    @Column(nullable = false, length = 2048)
    private String cloudinaryUrl;

    @Column(nullable = false)
    private Instant createdAt;

    public FileMetadata() {
        this.createdAt = Instant.now();
    }

    public FileMetadata(Long formId, String questionId, String filename, String originalFilename, String mimeType, Long size, String cloudinaryUrl) {
        this.formId = formId;
        this.questionId = questionId;
        this.filename = filename;
        this.originalFilename = originalFilename;
        this.mimeType = mimeType;
        this.size = size;
        this.cloudinaryUrl = cloudinaryUrl;
        this.createdAt = Instant.now();
    }

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

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public String getCloudinaryUrl() {
        return cloudinaryUrl;
    }

    public void setCloudinaryUrl(String cloudinaryUrl) {
        this.cloudinaryUrl = cloudinaryUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
