package com.novaforms.submission;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class ExportServiceImpl implements ExportService {
  private final SubmissionRepository repository;
  private final FormConfigRepository formConfigRepository;
  private final ObjectMapper mapper = new ObjectMapper();
  
  private static final DateTimeFormatter DATE_FORMATTER = 
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.systemDefault());

  public ExportServiceImpl(
      SubmissionRepository repository,
      FormConfigRepository formConfigRepository) {
    this.repository = repository;
    this.formConfigRepository = formConfigRepository;
  }

  private List<Submission> getFilteredSubmissions(Long formId, Instant start, Instant end, List<Long> ids) {
    List<Submission> all = repository.findByFormId(formId);
    return all.stream()
        .filter(s -> ids == null || ids.isEmpty() || ids.contains(s.getId()))
        .filter(s -> start == null || s.getCreatedAt().isAfter(start))
        .filter(s -> end == null || s.getCreatedAt().isBefore(end))
        .sorted(Comparator.comparing(Submission::getCreatedAt))
        .toList();
  }

  private Set<String> getAllQuestionIds(List<Submission> submissions) {
    Set<String> keys = new LinkedHashSet<>();
    for (Submission s : submissions) {
      if (s.getAnswersJson() != null) {
        try {
          Map<String, Object> map = mapper.readValue(
              s.getAnswersJson(), 
              new TypeReference<Map<String, Object>>() {}
          );
          keys.addAll(map.keySet());
        } catch (Exception ignored) {}
      }
    }
    return keys;
  }

  @Override
  public byte[] exportCsv(Long formId, Instant start, Instant end, List<Long> ids) {
    List<Submission> list = getFilteredSubmissions(formId, start, end, ids);
    Set<String> qIds = getAllQuestionIds(list);

    StringBuilder sb = new StringBuilder();
    
    // Headers
    sb.append("Response ID,Timestamp,Name,Email,Company,Rating,Message");
    for (String qId : qIds) {
      sb.append(",").append(escapeCsvField(qId));
    }
    sb.append("\n");

    // Rows
    for (Submission s : list) {
      sb.append(s.getId()).append(",")
        .append(escapeCsvField(DATE_FORMATTER.format(s.getCreatedAt()))).append(",")
        .append(escapeCsvField(s.getFullName())).append(",")
        .append(escapeCsvField(s.getEmail())).append(",")
        .append(escapeCsvField(s.getCompany())).append(",")
        .append(s.getRating()).append(",")
        .append(escapeCsvField(s.getMessage() != null ? s.getMessage() : ""));

      Map<String, Object> answers = getAnswersMap(s.getAnswersJson());
      for (String qId : qIds) {
        Object val = answers.get(qId);
        sb.append(",").append(escapeCsvField(val != null ? val.toString() : ""));
      }
      sb.append("\n");
    }

    return sb.toString().getBytes(StandardCharsets.UTF_8);
  }

  @Override
  public byte[] exportExcel(Long formId, Instant start, Instant end, List<Long> ids) {
    List<Submission> list = getFilteredSubmissions(formId, start, end, ids);
    Set<String> qIds = getAllQuestionIds(list);

    try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet("Submissions");

      // Styles
      org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerFont.setColor(IndexedColors.WHITE.getIndex());

      CellStyle headerStyle = workbook.createCellStyle();
      headerStyle.setFont(headerFont);
      headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      headerStyle.setBorderBottom(BorderStyle.MEDIUM);

      // Header row
      Row headerRow = sheet.createRow(0);
      String[] staticHeaders = {"Response ID", "Timestamp", "Name", "Email", "Company", "Rating", "Message"};
      int colIdx = 0;
      for (String sh : staticHeaders) {
        Cell cell = headerRow.createCell(colIdx++);
        cell.setCellValue(sh);
        cell.setCellStyle(headerStyle);
      }
      for (String qId : qIds) {
        Cell cell = headerRow.createCell(colIdx++);
        cell.setCellValue(qId);
        cell.setCellStyle(headerStyle);
      }

      // Data rows
      int rowIdx = 1;
      for (Submission s : list) {
        Row row = sheet.createRow(rowIdx++);
        colIdx = 0;
        row.createCell(colIdx++).setCellValue(s.getId());
        row.createCell(colIdx++).setCellValue(DATE_FORMATTER.format(s.getCreatedAt()));
        row.createCell(colIdx++).setCellValue(s.getFullName() != null ? s.getFullName() : "");
        row.createCell(colIdx++).setCellValue(s.getEmail() != null ? s.getEmail() : "");
        row.createCell(colIdx++).setCellValue(s.getCompany() != null ? s.getCompany() : "");
        row.createCell(colIdx++).setCellValue(s.getRating() != null ? s.getRating() : 0);
        row.createCell(colIdx++).setCellValue(s.getMessage() != null ? s.getMessage() : "");

        Map<String, Object> answers = getAnswersMap(s.getAnswersJson());
        for (String qId : qIds) {
          Object val = answers.get(qId);
          row.createCell(colIdx++).setCellValue(val != null ? val.toString() : "");
        }
      }

      // Resize columns
      for (int i = 0; i < colIdx; i++) {
        sheet.autoSizeColumn(i);
      }

      workbook.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException("Failed to generate Excel file: " + e.getMessage(), e);
    }
  }

  @Override
  public byte[] exportPdf(Long formId, Instant start, Instant end, List<Long> ids) {
    List<Submission> list = getFilteredSubmissions(formId, start, end, ids);
    FormConfig formConfig = formConfigRepository.findById(formId).orElse(null);
    String formTitle = formConfig != null ? formConfig.getTitle() : "NovaForms Form ID: #" + formId;

    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document document = new Document();
      PdfWriter.getInstance(document, out);
      document.open();

      // Styling Fonts
      Font titleFont = new Font(Font.HELVETICA, 20, Font.BOLD);
      Font metaFont = new Font(Font.HELVETICA, 10, Font.ITALIC);
      Font headerFont = new Font(Font.HELVETICA, 12, Font.BOLD);
      Font bodyFont = new Font(Font.HELVETICA, 10, Font.NORMAL);

      document.add(new Paragraph("NovaForms Submission Report", metaFont));
      document.add(new Paragraph(formTitle, titleFont));
      document.add(new Paragraph("Generated at: " + DATE_FORMATTER.format(Instant.now()), metaFont));
      document.add(new Paragraph("Total Filtered Submissions: " + list.size(), bodyFont));
      document.add(new Paragraph(" ")); // Spacer

      // Submissions table
      PdfPTable table = new PdfPTable(5); // ID, Date, Name, Email, Rating
      table.setWidthPercentage(100);
      table.setWidths(new float[]{10f, 25f, 25f, 25f, 15f});

      // Headers
      String[] headers = {"ID", "Timestamp", "Name", "Email", "Rating"};
      for (String header : headers) {
        PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
        cell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        cell.setPadding(6);
        table.addCell(cell);
      }

      // Add Submissions
      for (Submission s : list) {
        table.addCell(new Phrase(s.getId().toString(), bodyFont));
        table.addCell(new Phrase(DATE_FORMATTER.format(s.getCreatedAt()), bodyFont));
        table.addCell(new Phrase(s.getFullName() != null ? s.getFullName() : "", bodyFont));
        table.addCell(new Phrase(s.getEmail() != null ? s.getEmail() : "", bodyFont));
        table.addCell(new Phrase(String.valueOf(s.getRating() != null ? s.getRating() : 0), bodyFont));
      }

      document.add(table);

      // Spacer
      document.add(new Paragraph(" "));
      document.add(new Paragraph("Detailed Question Breakdown", headerFont));
      document.add(new Paragraph(" "));

      for (Submission s : list) {
        document.add(new Paragraph("Submission ID: #" + s.getId() + " by " + s.getFullName() + " (" + s.getEmail() + ")", headerFont));
        Map<String, Object> answers = getAnswersMap(s.getAnswersJson());
        if (answers.isEmpty()) {
          document.add(new Paragraph("  No answers submitted.", bodyFont));
        } else {
          for (Map.Entry<String, Object> entry : answers.entrySet()) {
            document.add(new Paragraph("  Q: " + entry.getKey() + " -> A: " + entry.getValue(), bodyFont));
          }
        }
        document.add(new Paragraph("------------------------------------------------------------------------------------------", metaFont));
      }

      document.close();
      return out.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException("Failed to generate PDF file: " + e.getMessage(), e);
    }
  }

  @Override
  public byte[] exportZip(Long formId, Instant start, Instant end, List<Long> ids) {
    byte[] csvBytes = exportCsv(formId, start, end, ids);
    byte[] xlsxBytes = exportExcel(formId, start, end, ids);
    byte[] pdfBytes = exportPdf(formId, start, end, ids);

    List<Submission> list = getFilteredSubmissions(formId, start, end, ids);

    // Extract file uploads information
    StringBuilder attachBuilder = new StringBuilder();
    attachBuilder.append("=== UPLOADED ATTACHMENTS MANIFEST ===\n\n");
    for (Submission s : list) {
      Map<String, Object> answers = getAnswersMap(s.getAnswersJson());
      boolean hasAttach = false;
      for (Map.Entry<String, Object> entry : answers.entrySet()) {
        String valStr = entry.getValue() != null ? entry.getValue().toString() : "";
        if (valStr.startsWith("http://") || valStr.startsWith("https://") || valStr.contains("cloudinary")) {
          if (!hasAttach) {
            attachBuilder.append("Submission ID: #").append(s.getId()).append(" by ").append(s.getFullName()).append("\n");
            hasAttach = true;
          }
          attachBuilder.append("  Question: ").append(entry.getKey()).append(" -> URL: ").append(valStr).append("\n");
        }
      }
      if (hasAttach) {
        attachBuilder.append("\n");
      }
    }

    try (ByteArrayOutputStream out = new ByteArrayOutputStream(); ZipOutputStream zip = new ZipOutputStream(out)) {
      // Add CSV
      ZipEntry csvEntry = new ZipEntry("submissions.csv");
      zip.putNextEntry(csvEntry);
      zip.write(csvBytes);
      zip.closeEntry();

      // Add Excel
      ZipEntry xlsxEntry = new ZipEntry("submissions.xlsx");
      zip.putNextEntry(xlsxEntry);
      zip.write(xlsxBytes);
      zip.closeEntry();

      // Add PDF
      ZipEntry pdfEntry = new ZipEntry("submissions_report.pdf");
      zip.putNextEntry(pdfEntry);
      zip.write(pdfBytes);
      zip.closeEntry();

      // Add Attachments manifest
      ZipEntry txtEntry = new ZipEntry("attachments_manifest.txt");
      zip.putNextEntry(txtEntry);
      zip.write(attachBuilder.toString().getBytes(StandardCharsets.UTF_8));
      zip.closeEntry();

      zip.finish();
      return out.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException("Failed to generate ZIP archive: " + e.getMessage(), e);
    }
  }

  private String escapeCsvField(String field) {
    if (field == null) return "";
    String value = field.replace("\"", "\"\"");
    if (value.contains(",") || value.contains("\n") || value.contains("\"")) {
      return "\"" + value + "\"";
    }
    return value;
  }

  private Map<String, Object> getAnswersMap(String json) {
    if (json == null || json.isBlank()) return Map.of();
    try {
      return mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
    } catch (Exception e) {
      return Map.of();
    }
  }
}
