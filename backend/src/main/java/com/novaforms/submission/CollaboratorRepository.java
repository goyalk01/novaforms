package com.novaforms.submission;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollaboratorRepository extends JpaRepository<Collaborator, Long> {
  List<Collaborator> findByFormId(Long formId);
  Optional<Collaborator> findByFormIdAndEmail(Long formId, String email);
  List<Collaborator> findByEmailIgnoreCase(String email);
}
