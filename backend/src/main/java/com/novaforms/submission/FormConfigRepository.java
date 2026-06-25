package com.novaforms.submission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FormConfigRepository extends JpaRepository<FormConfig, Long> {
}
