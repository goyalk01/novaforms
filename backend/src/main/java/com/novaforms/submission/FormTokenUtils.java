package com.novaforms.submission;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class FormTokenUtils {
    private static final byte[] SECRET_KEY;

    static {
        String envSecret = System.getenv("FORM_TOKEN_SECRET");
        if (envSecret != null && !envSecret.isBlank()) {
            SECRET_KEY = envSecret.getBytes(StandardCharsets.UTF_8);
        } else {
            byte[] key = new byte[32];
            new java.security.SecureRandom().nextBytes(key);
            SECRET_KEY = key;
        }
    }

    public static String generateToken(Long formId, long durationMillis) {
        long expiry = System.currentTimeMillis() + durationMillis;
        String payload = formId + "." + expiry;
        String signature = sign(payload);
        String tokenStr = payload + "." + signature;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenStr.getBytes(StandardCharsets.UTF_8));
    }

    public static boolean verifyToken(String tokenStr, Long formId) {
        if (tokenStr == null || tokenStr.isBlank()) {
            return false;
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(tokenStr);
            String decStr = new String(decoded, StandardCharsets.UTF_8);
            String[] parts = decStr.split("\\.");
            if (parts.length != 3) {
                return false;
            }
            long tokenFormId = Long.parseLong(parts[0]);
            long expiry = Long.parseLong(parts[1]);
            String signature = parts[2];

            if (tokenFormId != formId.longValue()) {
                return false;
            }
            if (System.currentTimeMillis() > expiry) {
                return false;
            }
            String payload = parts[0] + "." + parts[1];
            String expectedSignature = sign(payload);
            return MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }

    private static String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(SECRET_KEY, "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("HMAC signing failed", e);
        }
    }
}
