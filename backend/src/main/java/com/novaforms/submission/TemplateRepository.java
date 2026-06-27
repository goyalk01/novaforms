package com.novaforms.submission;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TemplateRepository extends JpaRepository<Template, Long> {
  List<Template> findByCategory(String category);
  List<Template> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String title, String description);
  List<Template> findByCategoryAndTitleContainingIgnoreCase(String category, String title);
}
