package com.novaforms.submission;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
  List<TransferRequest> findByFormIdAndStatus(Long formId, String status);
  Optional<TransferRequest> findFirstByFormIdAndStatusOrderByIdDesc(Long formId, String status);
  Optional<TransferRequest> findFirstByFormIdAndStatusInOrderByIdDesc(Long formId, List<String> statuses);
}
