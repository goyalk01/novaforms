package com.novaforms.submission;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByFormId(Long formId);
    List<FileMetadata> findByFormIdAndQuestionId(Long formId, String questionId);
}
