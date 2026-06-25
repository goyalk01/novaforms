package com.novaforms.submission;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CloudinaryStorageService implements StorageService {

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        if (cloudName != null && !cloudName.trim().isEmpty() 
            && apiKey != null && !apiKey.trim().isEmpty() 
            && apiSecret != null && !apiSecret.trim().isEmpty()) {
            
            Map<String, String> config = new HashMap<>();
            config.put("cloud_name", cloudName.trim());
            config.put("api_key", apiKey.trim());
            config.put("api_secret", apiSecret.trim());
            this.cloudinary = new Cloudinary(config);
            System.out.println("Initialized Cloudinary Storage Service successfully.");
        } else {
            System.out.println("Cloudinary credentials are missing. Running in simulated fallback mode.");
        }
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        if (cloudinary == null) {
            // Simulated Fallback: return a beautiful high-res unsplash/picsum landscape placeholder
            String randomSeed = UUID.randomUUID().toString().substring(0, 8);
            String mockUrl = "https://picsum.photos/seed/" + randomSeed + "/1200/600";
            System.out.println("Simulated upload: received file '" + file.getOriginalFilename() 
                + "' (" + file.getSize() + " bytes), returning mock placeholder URL: " + mockUrl);
            return mockUrl;
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(), 
                ObjectUtils.asMap("resource_type", "auto")
            );
            return (String) uploadResult.get("secure_url");
        } catch (Exception e) {
            System.err.println("Failed to upload image to Cloudinary: " + e.getMessage());
            throw new IOException("Cloudinary upload failed: " + e.getMessage(), e);
        }
    }
}
