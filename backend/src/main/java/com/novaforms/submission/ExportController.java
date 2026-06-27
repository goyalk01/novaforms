package com.novaforms.submission;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/submissions/export")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class ExportController {
  private final ExportService exportService;

  public ExportController(ExportService exportService) {
    this.exportService = exportService;
  }

  @GetMapping
  public ResponseEntity<byte[]> exportSubmissions(
      @RequestParam Long formId,
      @RequestParam String format,
      @RequestParam(required = false) String startDate,
      @RequestParam(required = false) String endDate,
      @RequestParam(required = false) List<Long> ids) {

    Instant start = null;
    Instant end = null;
    try {
      if (startDate != null && !startDate.isBlank()) {
        start = Instant.parse(startDate);
      }
      if (endDate != null && !endDate.isBlank()) {
        end = Instant.parse(endDate);
      }
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use ISO-8601 (e.g. 2026-06-25T12:00:00Z)");
    }

    byte[] fileData;
    String mediaType;
    String filename;

    String cleanFormat = format.toLowerCase().trim();
    switch (cleanFormat) {
      case "csv" -> {
        fileData = exportService.exportCsv(formId, start, end, ids);
        mediaType = "text/csv";
        filename = "submissions_export_" + formId + ".csv";
      }
      case "excel" -> {
        fileData = exportService.exportExcel(formId, start, end, ids);
        mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = "submissions_export_" + formId + ".xlsx";
      }
      case "pdf" -> {
        fileData = exportService.exportPdf(formId, start, end, ids);
        mediaType = "application/pdf";
        filename = "submissions_report_" + formId + ".pdf";
      }
      case "zip" -> {
        fileData = exportService.exportZip(formId, start, end, ids);
        mediaType = "application/zip";
        filename = "submissions_archive_" + formId + ".zip";
      }
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported format: " + format);
    }

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.parseMediaType(mediaType));
    headers.setContentDispositionFormData("attachment", filename);
    headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

    return new ResponseEntity<>(fileData, headers, HttpStatus.OK);
  }
}
