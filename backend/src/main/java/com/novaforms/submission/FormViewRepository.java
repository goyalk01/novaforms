package com.novaforms.submission;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FormViewRepository extends JpaRepository<FormView, Long> {
  List<FormView> findByFormId(Long formId);
  long countByFormId(Long formId);
}
