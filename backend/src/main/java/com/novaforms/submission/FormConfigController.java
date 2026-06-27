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
  private final LifecycleService lifecycleService;
  private final FormViewRepository formViewRepository;
  private final LiveEmitterRegistry liveEmitterRegistry;

  public FormConfigController(
      FormConfigRepository formConfigRepository,
      CollaboratorRepository collaboratorRepository,
      TransferRequestRepository transferRequestRepository,
      SubmissionRepository submissionRepository,
      LifecycleService lifecycleService,
      FormViewRepository formViewRepository,
      LiveEmitterRegistry liveEmitterRegistry) {
    this.formConfigRepository = formConfigRepository;
    this.collaboratorRepository = collaboratorRepository;
    this.transferRequestRepository = transferRequestRepository;
    this.submissionRepository = submissionRepository;
    this.lifecycleService = lifecycleService;
    this.formViewRepository = formViewRepository;
    this.liveEmitterRegistry = liveEmitterRegistry;
  }

  // DTO for verify-password token response
  public record PasswordVerificationResponse(String token) {}

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

    // Copy new attributes
    copy.setVisibility(original.getVisibility());
    copy.setAutoCloseDuration(original.getAutoCloseDuration());
    copy.setBusinessHoursJson(original.getBusinessHoursJson());
    copy.setStatusPagesJson(original.getStatusPagesJson());
    
    copy.setPublishState(original.getPublishState());
    copy.setManualState(original.getManualState());
    copy.setPublishedBy(original.getPublishedBy());
    copy.setArchivedAt(original.getArchivedAt());
    copy.setArchivedBy(original.getArchivedBy());
    copy.setLastUpdated(original.getLastUpdated());
    copy.setLastLifecycleChange(original.getLastLifecycleChange());
    copy.setLastLifecycleUser(original.getLastLifecycleUser());
    copy.setLogicJson(original.getLogicJson());
    copy.setThemeJson(original.getThemeJson());
    copy.setSharingJson(original.getSharingJson());
    
    if (hideSensitive) {
      copy.setQuestionsJson("[]");
      copy.setSettingsJson("{}");
    } else {
      copy.setQuestionsJson(original.getQuestionsJson());
      copy.setSettingsJson(original.getSettingsJson());
    }
    return copy;
  }

  private FormConfigResponse getFormConfigResponse(FormConfig config, String email, String token) {
    boolean hideSensitive = false;
    if (AccessMode.PASSWORD_PROTECTED == config.getAccessMode()) {
      hideSensitive = true;
      if (email != null && !email.isBlank()) {
        List<Collaborator> collabs = collaboratorRepository.findByFormId(config.getId());
        boolean isCollab = collabs.stream().anyMatch(c -> c.getEmail().equalsIgnoreCase(email));
        if (isCollab) {
          hideSensitive = false;
        }
      }
      if (hideSensitive && token != null && !token.isBlank()) {
        if (FormTokenUtils.verifyToken(token, config.getId())) {
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
    String dynamicStatus = lifecycleService.calculateDynamicStatus(config).name();
    long submissionCount = submissionRepository.countByFormId(config.getId());

    return new FormConfigResponse(sanitized, collaborators, activeTransfer.orElse(null), dynamicStatus, submissionCount);
  }

  private void validateVisibility(FormConfig config, String email) {
    if (Visibility.PRIVATE == config.getVisibility()) {
      boolean isCollab = false;
      if (email != null && !email.isBlank()) {
        List<Collaborator> collabs = collaboratorRepository.findByFormId(config.getId());
        isCollab = collabs.stream().anyMatch(c -> c.getEmail().equalsIgnoreCase(email));
      }
      if (!isCollab) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This form is private and only accessible by collaborators.");
      }
    }
  }

  // Gets or initializes the singleton form configuration (id=1)
  @GetMapping
  public ApiResponse<FormConfigResponse> getConfig(
      @RequestParam(required = false) String email,
      @RequestHeader(value = "X-Form-Token", required = false) String token) {
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
      defaultConf.setAccessMode(AccessMode.PUBLIC);
      defaultConf.setMaxResponses(0);
      defaultConf.setVisibility(Visibility.PUBLIC);
      defaultConf.setLogicJson("[]");
      defaultConf.setThemeJson("{}");
      defaultConf.setSharingJson("{}");
      return defaultConf;
    });

    if (config.getPublished() == null) {
      config = formConfigRepository.save(config);
    }

    validateVisibility(config, email);
    FormConfigResponse response = getFormConfigResponse(config, email, token);
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", response);
  }

  // Lists all forms a user is involved in
  @GetMapping("/list")
  public ApiResponse<List<FormSummaryResponse>> listForms(@RequestParam String email) {
    List<Collaborator> collabs = collaboratorRepository.findByEmailIgnoreCase(email);
    List<FormSummaryResponse> data = collabs.stream().map(collab -> {
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
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", data);
  }

  // Creates a new form config
  @PostMapping("/create")
  public ApiResponse<FormConfig> createForm(@RequestBody CreateFormRequest request) {
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
    config.setAccessMode(AccessMode.PUBLIC);
    config.setMaxResponses(0);
    config.setVisibility(Visibility.PUBLIC);
    config.setLogicJson("[]");
    config.setThemeJson("{}");
    config.setSharingJson("{}");

    FormConfig saved = formConfigRepository.save(config);

    Collaborator collab = new Collaborator(saved.getId(), request.getOwnerEmail(), "OWNER");
    collaboratorRepository.save(collab);

    return new ApiResponse<>(HttpStatus.OK.value(), "Form created successfully", saved);
  }

  // Gets form config by ID
  @GetMapping("/{id}")
  public ApiResponse<FormConfigResponse> getConfigById(
      @PathVariable Long id,
      @RequestParam(required = false) String email,
      @RequestHeader(value = "X-Form-Token", required = false) String token) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));

    validateVisibility(config, email);
    FormConfigResponse response = getFormConfigResponse(config, email, token);
    return new ApiResponse<>(HttpStatus.OK.value(), "Success", response);
  }

  public record RecordViewRequest(
      String userAgent,
      String browser,
      String os,
      String deviceType,
      String country,
      String city,
      String referer
  ) {}

  @PostMapping("/{id}/view")
  public ApiResponse<Void> recordView(
      @PathVariable Long id,
      @RequestBody RecordViewRequest request) {
    if (!formConfigRepository.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found");
    }

    FormView view = new FormView();
    view.setFormId(id);
    view.setUserAgent(request.userAgent());
    view.setBrowser(request.browser());
    view.setOs(request.os());
    view.setDeviceType(request.deviceType());
    view.setCountry(request.country());
    view.setCity(request.city());
    view.setReferer(request.referer());
    view.setCreatedAt(Instant.now());

    formViewRepository.save(view);

    liveEmitterRegistry.broadcast(id, "VIEW_CREATED", view);

    return new ApiResponse<>(HttpStatus.OK.value(), "View recorded successfully", null);
  }

  // Updates form customization fields by ID
  @PostMapping("/{id}")
  public ApiResponse<FormConfig> updateConfig(
      @PathVariable Long id, 
      @RequestBody FormConfigRequest request,
      @RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));

    boolean lifecycleChanged = false;

    // Detect lifecycle changes
    if (request.getStatus() != null && !Objects.equals(request.getStatus(), config.getStatus())) {
      lifecycleChanged = true;
    }
    if (request.getPublished() != null && !Objects.equals(request.getPublished(), config.getPublished())) {
      lifecycleChanged = true;
    }
    if (!Objects.equals(request.getOpenAt(), config.getOpenAt())) {
      lifecycleChanged = true;
    }
    if (!Objects.equals(request.getCloseAt(), config.getCloseAt())) {
      lifecycleChanged = true;
    }
    if (request.getAccessMode() != null) {
      String requestAccessStr = request.getAccessMode().toUpperCase();
      String currentAccessStr = config.getAccessMode() != null ? config.getAccessMode().name() : null;
      if (!Objects.equals(requestAccessStr, currentAccessStr)) {
        lifecycleChanged = true;
      }
    }
    if (request.getPassword() != null && !request.getPassword().isBlank()) {
      lifecycleChanged = true;
    }
    if (request.getMaxResponses() != null && !Objects.equals(request.getMaxResponses(), config.getMaxResponses())) {
      lifecycleChanged = true;
    }
    if (request.getVisibility() != null) {
      String requestVisStr = request.getVisibility().toUpperCase();
      String currentVisStr = config.getVisibility() != null ? config.getVisibility().name() : null;
      if (!Objects.equals(requestVisStr, currentVisStr)) {
        lifecycleChanged = true;
      }
    }
    if (!Objects.equals(request.getAutoCloseDuration(), config.getAutoCloseDuration())) {
      lifecycleChanged = true;
    }
    if (!Objects.equals(request.getBusinessHoursJson(), config.getBusinessHoursJson())) {
      lifecycleChanged = true;
    }
    if (!Objects.equals(request.getStatusPagesJson(), config.getStatusPagesJson())) {
      lifecycleChanged = true;
    }
    if (request.getLogicJson() != null && !Objects.equals(request.getLogicJson(), config.getLogicJson())) {
      lifecycleChanged = true;
    }
    if (request.getThemeJson() != null && !Objects.equals(request.getThemeJson(), config.getThemeJson())) {
      lifecycleChanged = true;
    }
    if (request.getSharingJson() != null && !Objects.equals(request.getSharingJson(), config.getSharingJson())) {
      lifecycleChanged = true;
    }

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
    if (request.getLogicJson() != null) {
      config.setLogicJson(request.getLogicJson());
    }
    if (request.getThemeJson() != null) {
      config.setThemeJson(request.getThemeJson());
    }
    if (request.getSharingJson() != null) {
      config.setSharingJson(request.getSharingJson());
    }

    // Update Lifecycle Fields
    if (request.getStatus() != null) {
      String status = request.getStatus().toUpperCase();
      if (status.equals("OPEN")) {
        config.setStatus("PUBLISHED");
      } else {
        config.setStatus(status);
      }
    }
    if (request.getPublished() != null) {
      config.setPublished(request.getPublished());
      if (request.getPublished()) {
        config.setPublishState(PublishState.PUBLISHED);
        if (config.getPublishedAt() == null) {
          config.setPublishedAt(Instant.now());
        }
      } else {
        config.setPublishState(PublishState.DRAFT);
      }
    }
    config.setOpenAt(request.getOpenAt());
    config.setCloseAt(request.getCloseAt());
    if (request.getTimezone() != null) {
      config.setTimezone(request.getTimezone());
    }
    if (request.getAccessMode() != null) {
      config.setAccessMode(AccessMode.valueOf(request.getAccessMode().toUpperCase()));
      if (AccessMode.PUBLIC == config.getAccessMode()) {
        config.setPasswordHash(null);
      } else if (AccessMode.PASSWORD_PROTECTED == config.getAccessMode() && request.getPassword() != null && !request.getPassword().isBlank()) {
        config.setPasswordHash(PasswordUtils.hashPassword(request.getPassword()));
      }
    }
    if (request.getMaxResponses() != null) {
      config.setMaxResponses(request.getMaxResponses());
    }
    config.setClosedReason(request.getClosedReason());

    // Update new Phase 2 columns
    if (request.getVisibility() != null) {
      config.setVisibility(Visibility.valueOf(request.getVisibility().toUpperCase()));
    }
    config.setAutoCloseDuration(request.getAutoCloseDuration());
    config.setBusinessHoursJson(request.getBusinessHoursJson());
    config.setStatusPagesJson(request.getStatusPagesJson());

    // Log last metadata edits
    config.setLastUpdated(Instant.now());
    if (lifecycleChanged) {
      config.setLastLifecycleChange(Instant.now());
      config.setLastLifecycleUser(email != null ? email : "anonymous");
    }

    FormConfig saved = formConfigRepository.save(config);
    return new ApiResponse<>(HttpStatus.OK.value(), "Configuration updated successfully", saved);
  }

  // Form state lifecycle transitions
  @PostMapping("/{id}/publish")
  public ApiResponse<FormConfigResponse> publishForm(@PathVariable Long id, @RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setPublished(true);
    config.setPublishedAt(Instant.now());
    config.setPublishedBy(email != null ? email : "anonymous");
    config.setStatus("PUBLISHED");
    config.setPublishState(PublishState.PUBLISHED);
    config.setLastLifecycleChange(Instant.now());
    config.setLastLifecycleUser(email != null ? email : "anonymous");
    config.setLastUpdated(Instant.now());
    FormConfig saved = formConfigRepository.save(config);
    FormConfigResponse response = getFormConfigResponse(saved, email, null);
    return new ApiResponse<>(HttpStatus.OK.value(), "Form published successfully", response);
  }

  @PostMapping("/{id}/unpublish")
  public ApiResponse<FormConfigResponse> unpublishForm(@PathVariable Long id, @RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setPublished(false);
    config.setStatus("DRAFT");
    config.setPublishState(PublishState.DRAFT);
    config.setLastLifecycleChange(Instant.now());
    config.setLastLifecycleUser(email != null ? email : "anonymous");
    config.setLastUpdated(Instant.now());
    FormConfig saved = formConfigRepository.save(config);
    FormConfigResponse response = getFormConfigResponse(saved, email, null);
    return new ApiResponse<>(HttpStatus.OK.value(), "Form unpublished successfully", response);
  }

  @PostMapping("/{id}/pause")
  public ApiResponse<FormConfigResponse> pauseForm(@PathVariable Long id, @RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setStatus("PAUSED");
    config.setManualState(ManualState.PAUSED);
    config.setLastLifecycleChange(Instant.now());
    config.setLastLifecycleUser(email != null ? email : "anonymous");
    config.setLastUpdated(Instant.now());
    FormConfig saved = formConfigRepository.save(config);
    FormConfigResponse response = getFormConfigResponse(saved, email, null);
    return new ApiResponse<>(HttpStatus.OK.value(), "Form paused successfully", response);
  }

  @PostMapping("/{id}/resume")
  public ApiResponse<FormConfigResponse> resumeForm(@PathVariable Long id, @RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setStatus("PUBLISHED");
    config.setManualState(ManualState.NORMAL);
    config.setLastLifecycleChange(Instant.now());
    config.setLastLifecycleUser(email != null ? email : "anonymous");
    config.setLastUpdated(Instant.now());
    FormConfig saved = formConfigRepository.save(config);
    FormConfigResponse response = getFormConfigResponse(saved, email, null);
    return new ApiResponse<>(HttpStatus.OK.value(), "Form resumed successfully", response);
  }

  @PostMapping("/{id}/archive")
  public ApiResponse<FormConfigResponse> archiveForm(@PathVariable Long id, @RequestParam(required = false) String email) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));
    config.setStatus("ARCHIVED");
    config.setPublishState(PublishState.ARCHIVED);
    config.setArchivedAt(Instant.now());
    config.setArchivedBy(email != null ? email : "anonymous");
    config.setLastLifecycleChange(Instant.now());
    config.setLastLifecycleUser(email != null ? email : "anonymous");
    config.setLastUpdated(Instant.now());
    FormConfig saved = formConfigRepository.save(config);
    FormConfigResponse response = getFormConfigResponse(saved, email, null);
    return new ApiResponse<>(HttpStatus.OK.value(), "Form archived successfully", response);
  }

  // Verify form password challenge and return token only on success
  @PostMapping("/{id}/verify-password")
  public ApiResponse<PasswordVerificationResponse> verifyPassword(@PathVariable Long id, @RequestBody PasswordVerificationRequest request) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));

    if (AccessMode.PASSWORD_PROTECTED == config.getAccessMode()) {
      if (config.getPasswordHash() != null) {
        if (request.getPassword() == null || !PasswordUtils.verifyPassword(request.getPassword(), config.getPasswordHash())) {
          throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }
      }
    }

    String token = FormTokenUtils.generateToken(id, 7200000L); // 2 hours
    return new ApiResponse<>(HttpStatus.OK.value(), "Password verified successfully", new PasswordVerificationResponse(token));
  }

  // Adds or updates collaborator by form ID
  @PostMapping("/{id}/collaborators")
  public ApiResponse<Collaborator> saveCollaborator(@PathVariable Long id, @RequestBody CollaboratorRequest request) {
    Optional<Collaborator> existing = collaboratorRepository.findByFormIdAndEmail(id, request.getEmail());
    Collaborator saved;
    if (existing.isPresent()) {
      Collaborator c = existing.get();
      c.setRole(request.getRole());
      saved = collaboratorRepository.save(c);
    } else {
      Collaborator c = new Collaborator(id, request.getEmail(), request.getRole());
      saved = collaboratorRepository.save(c);
    }
    return new ApiResponse<>(HttpStatus.OK.value(), "Collaborator saved successfully", saved);
  }

  // Removes collaborator
  @DeleteMapping("/collaborators/{collabId}")
  public ApiResponse<Void> deleteCollaborator(@PathVariable Long collabId) {
    collaboratorRepository.deleteById(collabId);
    return new ApiResponse<>(HttpStatus.OK.value(), "Collaborator removed successfully", null);
  }

  // State Machine 1: Initiate Transfer Request by form ID
  @PostMapping("/{id}/transfer/initiate")
  public ApiResponse<TransferRequest> initiateTransfer(@PathVariable Long id, @RequestBody InitiateTransferRequest request) {
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
    TransferRequest saved = transferRequestRepository.save(tr);
    return new ApiResponse<>(HttpStatus.OK.value(), "Transfer request initiated", saved);
  }

  // State Machine 2: Recipient accepts transfer request by form ID
  @PostMapping("/{id}/transfer/accept")
  public ApiResponse<TransferRequest> acceptTransfer(@PathVariable Long id) {
    Optional<TransferRequest> active = transferRequestRepository.findFirstByFormIdAndStatusOrderByIdDesc(id, "PENDING");
    if (active.isPresent()) {
      TransferRequest tr = active.get();
      tr.setStatus("ACCEPTED");
      TransferRequest saved = transferRequestRepository.save(tr);
      return new ApiResponse<>(HttpStatus.OK.value(), "Transfer accepted", saved);
    }
    throw new IllegalArgumentException("No pending transfer request found");
  }

  // State Machine 3: Initiator finalizes by form ID
  @PostMapping("/{id}/transfer/confirm")
  public ApiResponse<TransferRequest> confirmTransfer(@PathVariable Long id) {
    Optional<TransferRequest> active = transferRequestRepository.findFirstByFormIdAndStatusOrderByIdDesc(id, "ACCEPTED");
    if (active.isPresent()) {
      TransferRequest tr = active.get();
      tr.setStatus("COMPLETED");

      // Execute roles swap
      Optional<Collaborator> newOwnerOpt = collaboratorRepository.findByFormIdAndEmail(id, tr.getToEmail());
      if (newOwnerOpt.isPresent()) {
        Collaborator newOwner = newOwnerOpt.get();
        newOwner.setRole("OWNER");
        collaboratorRepository.save(newOwner);
      } else {
        collaboratorRepository.save(new Collaborator(id, tr.getToEmail(), "OWNER"));
      }

      Optional<Collaborator> oldOwnerOpt = collaboratorRepository.findByFormIdAndEmail(id, tr.getFromEmail());
      if (oldOwnerOpt.isPresent()) {
        Collaborator oldOwner = oldOwnerOpt.get();
        oldOwner.setRole(tr.getProposedNewRole());
        collaboratorRepository.save(oldOwner);
      } else {
        collaboratorRepository.save(new Collaborator(id, tr.getFromEmail(), tr.getProposedNewRole()));
      }

      TransferRequest saved = transferRequestRepository.save(tr);
      return new ApiResponse<>(HttpStatus.OK.value(), "Transfer completed successfully", saved);
    }
    throw new IllegalArgumentException("No accepted transfer request found to finalize");
  }

  // Cancel Transfer Request by form ID
  @PostMapping("/{id}/transfer/cancel")
  public ApiResponse<TransferRequest> cancelTransfer(@PathVariable Long id) {
    Optional<TransferRequest> active = transferRequestRepository
        .findFirstByFormIdAndStatusInOrderByIdDesc(id, List.of("PENDING", "ACCEPTED"));
    if (active.isPresent()) {
      TransferRequest tr = active.get();
      tr.setStatus("CANCELLED");
      TransferRequest saved = transferRequestRepository.save(tr);
      return new ApiResponse<>(HttpStatus.OK.value(), "Transfer cancelled successfully", saved);
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
    private String sessionToken;

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
    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }
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

    private String visibility;
    private String autoCloseDuration;
    private String businessHoursJson;
    private String statusPagesJson;
    private String logicJson;
    private String themeJson;
    private String sharingJson;

    public String getLogicJson() { return logicJson; }
    public void setLogicJson(String logicJson) { this.logicJson = logicJson; }
    public String getThemeJson() { return themeJson; }
    public void setThemeJson(String themeJson) { this.themeJson = themeJson; }
    public String getSharingJson() { return sharingJson; }
    public void setSharingJson(String sharingJson) { this.sharingJson = sharingJson; }

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

    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    public String getAutoCloseDuration() { return autoCloseDuration; }
    public void setAutoCloseDuration(String autoCloseDuration) { this.autoCloseDuration = autoCloseDuration; }
    public String getBusinessHoursJson() { return businessHoursJson; }
    public void setBusinessHoursJson(String businessHoursJson) { this.businessHoursJson = businessHoursJson; }
    public String getStatusPagesJson() { return statusPagesJson; }
    public void setStatusPagesJson(String statusPagesJson) { this.statusPagesJson = statusPagesJson; }
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
