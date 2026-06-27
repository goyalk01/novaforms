package com.novaforms.submission;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordUtils {
    private static final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public static String hashPassword(String password) {
        if (password == null || password.isBlank()) {
            return null;
        }
        return encoder.encode(password);
    }

    public static boolean verifyPassword(String password, String hash) {
        if (password == null || hash == null || hash.isBlank()) {
            return false;
        }
        try {
            return encoder.matches(password, hash);
        } catch (Exception ex) {
            return false;
        }
    }
}
