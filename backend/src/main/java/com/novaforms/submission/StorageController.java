package com.novaforms.submission;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/storage")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
public class StorageController {

    private final StorageService storageService;
    private final FileMetadataRepository fileMetadataRepository;

    @Autowired
    public StorageController(StorageService storageService, FileMetadataRepository fileMetadataRepository) {
        this.storageService = storageService;
        this.fileMetadataRepository = fileMetadataRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "formId", required = false) Long formId,
            @RequestParam(value = "questionId", required = false) String questionId) {
            
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please select a file to upload"));
        }
        try {
            String url = storageService.uploadFile(file);
            
            // Generate unique filename reference
            String uniqueFilename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            
            // Save Metadata to DB
            FileMetadata metadata = new FileMetadata(
                formId,
                questionId,
                uniqueFilename,
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                file.getContentType(),
                file.getSize(),
                url
            );
            fileMetadataRepository.save(metadata);
            
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }
}
