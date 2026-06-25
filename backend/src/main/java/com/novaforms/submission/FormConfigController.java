package com.novaforms.submission;

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

  public FormConfigController(
      FormConfigRepository formConfigRepository,
      CollaboratorRepository collaboratorRepository,
      TransferRequestRepository transferRequestRepository) {
    this.formConfigRepository = formConfigRepository;
    this.collaboratorRepository = collaboratorRepository;
    this.transferRequestRepository = transferRequestRepository;
  }

  // Gets or initializes the singleton form configuration (id=1) - for backwards compatibility
  @GetMapping
  public FormConfigResponse getConfig() {
    FormConfig config = formConfigRepository.findById(1L).orElseGet(() -> {
      FormConfig defaultConf = new FormConfig();
      defaultConf.setId(1L);
      defaultConf.setName("Nova Studio");
      defaultConf.setTitle("Orbit Intake");
      defaultConf.setDescription("Dark enterprise form builder with live preview.");
      defaultConf.setQuestionsJson("[]");
      defaultConf.setThemeMode("silver");
      defaultConf.setLayoutDensity("comfortable");
      defaultConf.setSubmissionMode("standard");
      defaultConf.setTotalPages(1);
      defaultConf.setBannerUrl("");
      defaultConf.setVideoUrl("");
      return defaultConf;
    });

    List<Collaborator> collaborators = collaboratorRepository.findByFormId(1L);
    if (collaborators.isEmpty()) {
      collaborators = List.of(new Collaborator(1L, "owner@novaforms.com", "OWNER"));
    }

    Optional<TransferRequest> activeTransfer = transferRequestRepository
        .findFirstByFormIdAndStatusInOrderByIdDesc(1L, List.of("PENDING", "ACCEPTED"));

    return new FormConfigResponse(config, collaborators, activeTransfer.orElse(null));
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
    config.setThemeMode("silver");
    config.setLayoutDensity("comfortable");
    config.setSubmissionMode("standard");
    config.setTotalPages(1);
    config.setBannerUrl("");
    config.setVideoUrl("");

    FormConfig saved = formConfigRepository.save(config);

    // Make request.getOwnerEmail() the OWNER of this form
    Collaborator collab = new Collaborator(saved.getId(), request.getOwnerEmail(), "OWNER");
    collaboratorRepository.save(collab);

    return saved;
  }

  // Gets form config by ID
  @GetMapping("/{id}")
  public FormConfigResponse getConfigById(@PathVariable Long id) {
    FormConfig config = formConfigRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form config not found"));

    List<Collaborator> collaborators = collaboratorRepository.findByFormId(id);

    Optional<TransferRequest> activeTransfer = transferRequestRepository
        .findFirstByFormIdAndStatusInOrderByIdDesc(id, List.of("PENDING", "ACCEPTED"));

    return new FormConfigResponse(config, collaborators, activeTransfer.orElse(null));
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
    config.setThemeMode(request.getThemeMode());
    config.setLayoutDensity(request.getLayoutDensity());
    config.setSubmissionMode(request.getSubmissionMode());
    config.setTotalPages(request.getTotalPages());

    return formConfigRepository.save(config);
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

    public FormConfigResponse(FormConfig config, List<Collaborator> collaborators, TransferRequest activeTransfer) {
      this.config = config;
      this.collaborators = collaborators;
      this.activeTransfer = activeTransfer;
    }

    public FormConfig getConfig() { return config; }
    public List<Collaborator> getCollaborators() { return collaborators; }
    public TransferRequest getActiveTransfer() { return activeTransfer; }
  }

  public static class FormConfigRequest {
    private String name;
    private String title;
    private String description;
    private String bannerUrl;
    private String videoUrl;
    private String questionsJson;
    private String themeMode;
    private String layoutDensity;
    private String submissionMode;
    private Integer totalPages;

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
    public String getThemeMode() { return themeMode; }
    public void setThemeMode(String themeMode) { this.themeMode = themeMode; }
    public String getLayoutDensity() { return layoutDensity; }
    public void setLayoutDensity(String layoutDensity) { this.layoutDensity = layoutDensity; }
    public String getSubmissionMode() { return submissionMode; }
    public void setSubmissionMode(String submissionMode) { this.submissionMode = submissionMode; }
    public Integer getTotalPages() { return totalPages; }
    public void setTotalPages(Integer totalPages) { this.totalPages = totalPages; }
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
