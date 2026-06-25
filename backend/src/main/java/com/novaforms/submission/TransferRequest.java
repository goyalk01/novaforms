package com.novaforms.submission;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "transfer_requests")
public class TransferRequest {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long formId;
  private String fromEmail;
  private String toEmail;
  private String proposedNewRole; // EDITOR, VIEWER
  private String status; // PENDING, ACCEPTED, COMPLETED, CANCELLED

  public TransferRequest() {}

  public TransferRequest(Long formId, String fromEmail, String toEmail, String proposedNewRole, String status) {
    this.formId = formId;
    this.fromEmail = fromEmail;
    this.toEmail = toEmail;
    this.proposedNewRole = proposedNewRole;
    this.status = status;
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

  public String getFromEmail() {
    return fromEmail;
  }

  public void setFromEmail(String fromEmail) {
    this.fromEmail = fromEmail;
  }

  public String getToEmail() {
    return toEmail;
  }

  public void setToEmail(String toEmail) {
    this.toEmail = toEmail;
  }

  public String getProposedNewRole() {
    return proposedNewRole;
  }

  public void setProposedNewRole(String proposedNewRole) {
    this.proposedNewRole = proposedNewRole;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
