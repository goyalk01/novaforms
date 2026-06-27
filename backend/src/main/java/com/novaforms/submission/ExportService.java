package com.novaforms.submission;

import java.time.Instant;
import java.util.List;

public interface ExportService {
  byte[] exportCsv(Long formId, Instant start, Instant end, List<Long> ids);
  byte[] exportExcel(Long formId, Instant start, Instant end, List<Long> ids);
  byte[] exportPdf(Long formId, Instant start, Instant end, List<Long> ids);
  byte[] exportZip(Long formId, Instant start, Instant end, List<Long> ids);
}
