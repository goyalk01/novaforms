package com.novaforms.submission;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/form-config")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class FormConfigController {

  private final FormConfigRepository formConfigRepository;
  private final CollaboratorRepository collaboratorRepository;
  private final TransferRequestRepository transferRequestRepository;
  private final SubmissionRepository submissionRepository;

  public FormConfigController(
      FormConfigRepository formConfigRepository,
      CollaboratorRepository collaboratorRepository,
      TransferRequestRepository transferRequestRepository,
      SubmissionRepository submissionRepository) {
    this.formConfigRepository = formConfigRepository;
    this.collaboratorRepository = collaboratorRepository;
    this.transferRequestRepository = transferRequestRepository;
    this.submissionRepository = submissionRepository;
  }

  // Helper to calculate dynamic lifecycle status
  private String calculateDynamicStatus(FormConfig config) {
    if ("ARCHIVED".equalsIgnoreCase(config.getStatus())) {
      return "ARCHIVED";
    }
    if (!Boolean.TRUE.equals(config.getPublished())) {
      return "DRAFT";
    }
    if ("PAUSED".equalsIgnoreCase(config.getStatus())) {
      return "PAUSED";
    }
    if ("CLOSED".equalsIgnoreCase(config.getStatus())) {
      return "CLOSED";
    }
    
    // Check Scheduled opening
    if (config.getOpenAt() != null) {
      if (Instant.now().isBefore(config.getOpenAt())) {
        return "SCHEDULED";
      }
    }
    
    // Check Scheduled closing
    if (config.getCloseAt() != null) {
      if (Instant.now().isAfter(config.getCloseAt())) {
        return "CLOSED";
      }
    }
    
    // Check Max Responses
    if (config.getMaxResponses() != null && config.getMaxResponses() > 0) {
      long count = submissionRepository.countByFormId(config.getId());
      if (count >= config.getMaxResponses()) {
        return "LIMIT_REACHED";
      }
    }
    
    return "OPEN";
  }

  // Clone and sanitize FormConfig to hide sensitive values when password-protected
  private FormConfig sanitizeFormConfig(FormConfig original, boolean hideSensitive) {
    FormConfig copy = new FormConfig();
    copy.setId(original.getId());
    copy.setName(original.getName());
    copy.setTitle(original.getTitle());
    copy.setDescription(original.getDescription());
    copy.setBannerUrl(original.getBannerUrl());
    copy.setVideoUrl(original.getVideoUrl());
    copy.setThemeMode(original.getThemeMode());
    copy.setLayoutDensity(original.getLayoutDensity());
    copy.setSubmissionMode(original.getSubmissionMode());
    copy.setTotalPages(original.getTotalPages());
    
    copy.setStatus(original.getStatus());
    copy.setPublished(original.getPublished());
    copy.setPublishedAt(original.getPublishedAt());
    copy.setOpenAt(original.getOpenAt());
    copy.setCloseAt(original.getCloseAt());
    copy.setTimezone(original.getTimezone());
    copy.setAccessMode(original.getAccessMode());
    // Never expose the password hash to the client
    copy.setPasswordHash(null);
    copy.setMaxResponses(original.getMaxResponses());
    copy.setClosedReason(original.getClosedReason());
    
    if (hideSensitive) {
      copy.setQuestionsJson("[]");
      copy.setSettingsJson("{}");
    } else {
      copy.setQuestionsJson(original.getQuestionsJson());
      copy.setSettingsJson(original.getSettingsJson());
    }
    return copy;
  }

  private FormConfigResponse getFormConfigResponse(FormConfig config, String email) {
    boolean hideSensitive = false;
    if ("PASSWORD_PROTECTED".equalsIgnoreCase(config.getAccessMode())) {
      hideSensitive = true;
      if (email != null && !email.isBlank()) {
        List<Collaborator> collabs = collaboratorRepository.findByFormId(config.getId());
        boolean isCollab = collabs.stream().anyMatch(c -> c.getEmail().equalsIgnoreCase(email));
        if (isCollab) {
          hideSensitive = false;
        }
      }
    }
    return getFormConfigResponseInternal(config, hideSensitive);
  }

  private FormConfigResponse getFormConfigResponseInternal(FormConfig config, boolean hideSensitive) {
    List<Collaborator> collaborators = collaboratorRepository.findByFormId(config.getId());
    if (config.getId() == 1L && collaborators.isEmpty()) {
      collaborators = List.of(new Collaborator(1L, "owner@novaforms.com", "OWNER"));
    }

    Optional<TransferRequest> activeTransfer = transferRequestRepository
        .findFirstByFormIdAndStatusInOrderByIdDesc(config.getId(), List.of("PENDING", "ACCEPTED"));

    FormConfig sanitized = sanitizeFormConfig(config, hideSensitive);
    String dynamicStatus = calculateDynamicStatus(config);
    long submissionCount = submissionRepository.countByFormId(config.getId());

    return new FormConfigResponse(sanitized, collaborators, activeTransfer.orElse(null), dynamicStatus, submissionCount);
  }

  // Gets or initializes the singleton form configuration (id=1) - for backwards compatibility
  @GetMapping
  public FormConfigResponse getConfig(@RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(1L).orElseGet(() -> {
      FormConfig defaultConf = new FormConfig();
      defaultConf.setId(1L);
      defaultConf.setName("Nova Studio");
      defaultConf.setTitle("Orbit Intake");
      defaultConf.setDescription("Dark enterprise form builder with live preview.");
      defaultConf.setQuestionsJson("[]");
      defaultConf.setSettingsJson("{}");
      defaultConf.setThemeMode("silver");
      defaultConf.setLayoutDensity("comfortable");
      defaultConf.setSubmissionMode("standard");
      defaultConf.setTotalPages(1);
      defaultConf.setBannerUrl("");
      defaultConf.setVideoUrl("");
      defaultConf.setStatus("DRAFT");
      defaultConf.setPublished(false);
      defaultConf.setTimezone("UTC");
      defaultConf.setAccessMode("PUBLIC");
      defaultConf.setMaxResponses(0);
      return defaultConf;
    });

    // Save default config if not found initially so that it exists in the database
    if (config.getPublished() == null) {
      config = formConfigRepository.save(config);
    }

    return getFormConfigResponse(config, email);
  }

  // Lists all forms a user is involved in
  @GetMapping("/list")
  public List<FormSummaryResponse> listForms(@RequestParam String email) {
    List<Collaborator> collabs = collaboratorRepository.findByEmailIgnoreCase(email);
    return collabs.stream().map(collab -> {
      FormConfig config = formConfigRepository.findById(collab.getFormId()).orElse(null);
      if (config == null) return null;
      return new FormSummaryResponse(
          config.getId(),
          config.getName(),
          config.getTitle(),
          config.getDescription(),
          collab.getRole(),
          config.getBannerUrl()
      );
    }).filter(Objects::nonNull).toList();
  }

  // Creates a new form config
  @PostMapping("/create")
  public FormConfig createForm(@RequestBody CreateFormRequest request) {
    FormConfig config = new FormConfig();
    config.setName(request.getName());
    config.setTitle(request.getTitle());
    config.setDescription(request.getDescription());
    config.setQuestionsJson("[]");
    config.setSettingsJson("{}");
    config.setThemeMode("silver");
    config.setLayoutDensity("comfortable");
    config.setSubmissionMode("standard");
    config.setTotalPages(1);
    config.setBannerUrl("");
    config.setVideoUrl("");
    config.setStatus("DRAFT");
    config.setPublished(false);
    config.setTimezone("UTC");
    config.setAccessMode("PUBLIC");
    config.setMaxResponses(0);

    FormConfig saved = formConfigRepository.save(config);

    // Make request.getOwnerEmail() the OWNER of this form
    Collaborator collab = new Collaborator(saved.getId(), request.getOwnerEmail(), "OWNER");
    collaboratorRepository.save(collab);

    return saved;
  }

  // Gets form config by ID
  @GetMapping("/{id}")
  public FormConfigResponse getConfigById(@PathVariable Long id, @RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));

    return getFormConfigResponse(config, email);
  }

  // Updates form customization fields by ID
  @PostMapping("/{id}")
  public FormConfig updateConfig(@PathVariable Long id, @RequestBody FormConfigRequest request) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));

    config.setName(request.getName());
    config.setTitle(request.getTitle());
    config.setDescription(request.getDescription());
    config.setBannerUrl(request.getBannerUrl());
    config.setVideoUrl(request.getVideoUrl());
    config.setQuestionsJson(request.getQuestionsJson());
    config.setSettingsJson(request.getSettingsJson());
    config.setThemeMode(request.getThemeMode());
    config.setLayoutDensity(request.getLayoutDensity());
    config.setSubmissionMode(request.getSubmissionMode());
    config.setTotalPages(request.getTotalPages());

    // Update Lifecycle Fields
    if (request.getStatus() != null) {
      config.setStatus(request.getStatus());
    }
    if (request.getPublished() != null) {
      config.setPublished(request.getPublished());
      if (request.getPublished() && config.getPublishedAt() == null) {
        config.setPublishedAt(Instant.now());
      }
    }
    config.setOpenAt(request.getOpenAt());
    config.setCloseAt(request.getCloseAt());
    if (request.getTimezone() != null) {
      config.setTimezone(request.getTimezone());
    }
    if (request.getAccessMode() != null) {
      config.setAccessMode(request.getAccessMode());
      if ("PUBLIC".equalsIgnoreCase(request.getAccessMode())) {
        config.setPasswordHash(null);
      } else if ("PASSWORD_PROTECTED".equalsIgnoreCase(request.getAccessMode()) && request.getPassword() != null && !request.getPassword().isBlank()) {
        config.setPasswordHash(PasswordUtils.hashPassword(request.getPassword()));
      }
    }
    if (request.getMaxResponses() != null) {
      config.setMaxResponses(request.getMaxResponses());
    }
    config.setClosedReason(request.getClosedReason());

    return formConfigRepository.save(config);
  }

  // Form state lifecycle transitions
  @PostMapping("/{id}/publish")
  public FormConfigResponse publishForm(@PathVariable Long id) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setPublished(true);
    config.setPublishedAt(Instant.now());
    config.setStatus("OPEN");
    FormConfig saved = formConfigRepository.save(config);
    return getFormConfigResponse(saved, null);
  }

  @PostMapping("/{id}/unpublish")
  public FormConfigResponse unpublishForm(@PathVariable Long id) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setPublished(false);
    config.setStatus("DRAFT");
    FormConfig saved = formConfigRepository.save(config);
    return getFormConfigResponse(saved, null);
  }

  @PostMapping("/{id}/pause")
  public FormConfigResponse pauseForm(@PathVariable Long id) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setStatus("PAUSED");
    FormConfig saved = formConfigRepository.save(config);
    return getFormConfigResponse(saved, null);
  }

  @PostMapping("/{id}/resume")
  public FormConfigResponse resumeForm(@PathVariable Long id) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setStatus("OPEN");
    FormConfig saved = formConfigRepository.save(config);
    return getFormConfigResponse(saved, null);
  }

  @PostMapping("/{id}/archive")
  public FormConfigResponse archiveForm(@PathVariable Long id) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setStatus("ARCHIVED");
    FormConfig saved = formConfigRepository.save(config);
    return getFormConfigResponse(saved, null);
  }

  // Verify form password challenge and return full configuration response on success
  @PostMapping("/{id}/verify-password")
  public FormConfigResponse verifyPassword(@PathVariable Long id, @RequestBody PasswordVerificationRequest request) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));

    if ("PASSWORD_PROTECTED".equalsIgnoreCase(config.getAccessMode())) {
      if (config.getPasswordHash() != null) {
        if (request.getPassword() == null || !PasswordUtils.verifyPassword(request.getPassword(), config.getPasswordHash())) {
          throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }
      }
    }

    return getFormConfigResponseInternal(config, false);
  }

  // Adds or updates collaborator by form ID
  @PostMapping("/{id}/collaborators")
  public Collaborator saveCollaborator(@PathVariable Long id, @RequestBody CollaboratorRequest request) {
    Optional<Collaborator> existing = collaboratorRepository.findByFormIdAndEmail(id, request.getEmail());
    if (existing.isPresent()) {
      Collaborator c = existing.get();
      c.setRole(request.getRole());
      return collaboratorRepository.save(c);
    } else {
      Collaborator c = new Collaborator(id, request.getEmail(), request.getRole());
      return collaboratorRepository.save(c);
    }
  }

  // Removes collaborator (collaborator ID is globally unique)
  @DeleteMapping("/collaborators/{collabId}")
  public void deleteCollaborator(@PathVariable Long collabId) {
    collaboratorRepository.deleteById(collabId);
  }

  // State Machine 1: Initiate Transfer Request by form ID
  @PostMapping("/{id}/transfer/initiate")
  public TransferRequest initiateTransfer(@PathVariable Long id, @RequestBody InitiateTransferRequest request) {
    // Cancel any existing active requests first
    List<TransferRequest> active = transferRequestRepository.findByFormIdAndStatus(id, "PENDING");
    for (TransferRequest tr : active) {
      tr.setStatus("CANCELLED");
      transferRequestRepository.save(tr);
    }
    List<TransferRequest> accepted = transferRequestRepository.findByFormIdAndStatus(id, "ACCEPTED");
    for (TransferRequest tr : accepted) {
      tr.setStatus("CANCELLED");
      transferRequestRepository.save(tr);
    }

    TransferRequest tr = new TransferRequest(
        id,
        request.getFromEmail(),
        request.getToEmail(),
        request.getProposedNewRole(),
        "PENDING"
    );
    return transferRequestRepository.save(tr);
  }

  // State Machine 2: Recipient accepts transfer request by form ID
  @PostMapping("/{id}/transfer/accept")
  public TransferRequest acceptTransfer(@PathVariable Long id) {
    Optional<TransferRequest> active = transferRequestRepository.findFirstByFormIdAndStatusOrderByIdDesc(id, "PENDING");
    if (active.isPresent()) {
      TransferRequest tr = active.get();
      tr.setStatus("ACCEPTED");
      return transferRequestRepository.save(tr);
    }
    throw new IllegalArgumentException("No pending transfer request found");
  }

  // State Machine 3: Initiator finalizes (confirming acceptor is ready) by form ID
  @PostMapping("/{id}/transfer/confirm")
  public TransferRequest confirmTransfer(@PathVariable Long id) {
    Optional<TransferRequest> active = transferRequestRepository.findFirstByFormIdAndStatusOrderByIdDesc(id, "ACCEPTED");
    if (active.isPresent()) {
      TransferRequest tr = active.get();
      tr.setStatus("COMPLETED");

      // Execute roles swap
      // 1. Set the new owner
      Optional<Collaborator> newOwnerOpt = collaboratorRepository.findByFormIdAndEmail(id, tr.getToEmail());
      if (newOwnerOpt.isPresent()) {
        Collaborator newOwner = newOwnerOpt.get();
        newOwner.setRole("OWNER");
        collaboratorRepository.save(newOwner);
      } else {
        collaboratorRepository.save(new Collaborator(id, tr.getToEmail(), "OWNER"));
      }

      // 2. Set the old owner's new role
      Optional<Collaborator> oldOwnerOpt = collaboratorRepository.findByFormIdAndEmail(id, tr.getFromEmail());
      if (oldOwnerOpt.isPresent()) {
        Collaborator oldOwner = oldOwnerOpt.get();
        oldOwner.setRole(tr.getProposedNewRole());
        collaboratorRepository.save(oldOwner);
      } else {
        collaboratorRepository.save(new Collaborator(id, tr.getFromEmail(), tr.getProposedNewRole()));
      }

      return transferRequestRepository.save(tr);
    }
    throw new IllegalArgumentException("No accepted transfer request found to finalize");
  }

  // Cancel Transfer Request by form ID
  @PostMapping("/{id}/transfer/cancel")
  public TransferRequest cancelTransfer(@PathVariable Long id) {
    Optional<TransferRequest> active = transferRequestRepository
        .findFirstByFormIdAndStatusInOrderByIdDesc(id, List.of("PENDING", "ACCEPTED"));
    if (active.isPresent()) {
      TransferRequest tr = active.get();
      tr.setStatus("CANCELLED");
      return transferRequestRepository.save(tr);
    }
    throw new IllegalArgumentException("No active transfer request found to cancel");
  }

  // DTOs & Request Formats
  public static class PasswordVerificationRequest {
    private String password;
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
  }

  public static class FormSummaryResponse {
    private Long id;
    private String name;
    private String title;
    private String description;
    private String role;
    private String bannerUrl;

    public FormSummaryResponse(Long id, String name, String title, String description, String role, String bannerUrl) {
      this.id = id;
      this.name = name;
      this.title = title;
      this.description = description;
      this.role = role;
      this.bannerUrl = bannerUrl;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }
  }

  public static class CreateFormRequest {
    private String name;
    private String title;
    private String description;
    private String ownerEmail;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }
  }

  public static class FormConfigResponse {
    private FormConfig config;
    private List<Collaborator> collaborators;
    private TransferRequest activeTransfer;
    private String dynamicStatus;
    private long submissionCount;

    public FormConfigResponse(FormConfig config, List<Collaborator> collaborators, TransferRequest activeTransfer) {
      this.config = config;
      this.collaborators = collaborators;
      this.activeTransfer = activeTransfer;
    }

    public FormConfigResponse(FormConfig config, List<Collaborator> collaborators, TransferRequest activeTransfer, String dynamicStatus, long submissionCount) {
      this.config = config;
      this.collaborators = collaborators;
      this.activeTransfer = activeTransfer;
      this.dynamicStatus = dynamicStatus;
      this.submissionCount = submissionCount;
    }

    public FormConfig getConfig() { return config; }
    public List<Collaborator> getCollaborators() { return collaborators; }
    public TransferRequest getActiveTransfer() { return activeTransfer; }
    public String getDynamicStatus() { return dynamicStatus; }
    public void setDynamicStatus(String dynamicStatus) { this.dynamicStatus = dynamicStatus; }
    public long getSubmissionCount() { return submissionCount; }
    public void setSubmissionCount(long submissionCount) { this.submissionCount = submissionCount; }
  }

  public static class FormConfigRequest {
    private String name;
    private String title;
    private String description;
    private String bannerUrl;
    private String videoUrl;
    private String questionsJson;
    private String settingsJson;
    private String themeMode;
    private String layoutDensity;
    private String submissionMode;
    private Integer totalPages;

    private String status;
    private Boolean published;
    private Instant openAt;
    private Instant closeAt;
    private String timezone;
    private String accessMode;
    private String password;
    private Integer maxResponses;
    private String closedReason;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public String getQuestionsJson() { return questionsJson; }
    public void setQuestionsJson(String questionsJson) { this.questionsJson = questionsJson; }
    public String getSettingsJson() { return settingsJson; }
    public void setSettingsJson(String settingsJson) { this.settingsJson = settingsJson; }
    public String getThemeMode() { return themeMode; }
    public void setThemeMode(String themeMode) { this.themeMode = themeMode; }
    public String getLayoutDensity() { return layoutDensity; }
    public void setLayoutDensity(String layoutDensity) { this.layoutDensity = layoutDensity; }
    public String getSubmissionMode() { return submissionMode; }
    public void setSubmissionMode(String submissionMode) { this.submissionMode = submissionMode; }
    public Integer getTotalPages() { return totalPages; }
    public void setTotalPages(Integer totalPages) { this.totalPages = totalPages; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getPublished() { return published; }
    public void setPublished(Boolean published) { this.published = published; }
    public Instant getOpenAt() { return openAt; }
    public void setOpenAt(Instant openAt) { this.openAt = openAt; }
    public Instant getCloseAt() { return closeAt; }
    public void setCloseAt(Instant closeAt) { this.closeAt = closeAt; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getAccessMode() { return accessMode; }
    public void setAccessMode(String accessMode) { this.accessMode = accessMode; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Integer getMaxResponses() { return maxResponses; }
    public void setMaxResponses(Integer maxResponses) { this.maxResponses = maxResponses; }
    public String getClosedReason() { return closedReason; }
    public void setClosedReason(String closedReason) { this.closedReason = closedReason; }
  }

  public static class CollaboratorRequest {
    private String email;
    private String role;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
  }

  public static class InitiateTransferRequest {
    private String fromEmail;
    private String toEmail;
    private String proposedNewRole;

    public String getFromEmail() { return fromEmail; }
    public void setFromEmail(String fromEmail) { this.fromEmail = fromEmail; }
    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }
    public String getProposedNewRole() { return proposedNewRole; }
    public void setProposedNewRole(String proposedNewRole) { this.proposedNewRole = proposedNewRole; }
  }
}
