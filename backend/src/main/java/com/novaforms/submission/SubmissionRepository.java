package com.novaforms.submission;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
  List<Submission> findByFormId(Long formId);
  long countByFormId(Long formId);
}
