package com.novaforms.submission;

import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {

  private final FormConfigRepository formConfigRepository;
  private final CollaboratorRepository collaboratorRepository;

  public DatabaseInitializer(
      FormConfigRepository formConfigRepository,
      CollaboratorRepository collaboratorRepository) {
    this.formConfigRepository = formConfigRepository;
    this.collaboratorRepository = collaboratorRepository;
  }

  @Override
  public void run(String... args) throws Exception {
    // If no form config exists, create the default one
    if (formConfigRepository.count() == 0) {
      FormConfig newConfig = new FormConfig();
      newConfig.setName("Nova Studio");
      newConfig.setTitle("Orbit Intake");
      newConfig.setDescription("Dark enterprise form builder with live preview.");
      newConfig.setQuestionsJson("[]");
      newConfig.setThemeMode("silver");
      newConfig.setLayoutDensity("comfortable");
      newConfig.setSubmissionMode("standard");
      newConfig.setTotalPages(1);
      newConfig.setBannerUrl("");
      newConfig.setVideoUrl("");
      
      try {
        FormConfig saved = formConfigRepository.save(newConfig);
        System.out.println("Initialized default FormConfig with ID: " + saved.getId());
      } catch (Exception e) {
        System.err.println("Failed to initialize default FormConfig: " + e.getMessage());
      }
    }

    // Ensure default owner collaborator exists
    List<Collaborator> collaborators = collaboratorRepository.findByFormId(1L);
    boolean hasOwner = collaborators.stream().anyMatch(c -> "OWNER".equals(c.getRole()));
    if (!hasOwner) {
      Collaborator defaultOwner = new Collaborator(1L, "owner@novaforms.com", "OWNER");
      try {
        collaboratorRepository.save(defaultOwner);
        System.out.println("Initialized default Owner collaborator: owner@novaforms.com");
      } catch (Exception e) {
        System.err.println("Failed to initialize default Owner collaborator: " + e.getMessage());
      }
    }
  }
}
