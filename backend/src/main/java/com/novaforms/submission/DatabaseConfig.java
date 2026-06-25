package com.novaforms.submission;

import java.net.URI;
import java.net.URISyntaxException;
import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class DatabaseConfig {

    @Value("${spring.datasource.url}")
    private String databaseUrl;

    @Value("${spring.datasource.username:sa}")
    private String databaseUsername;

    @Value("${spring.datasource.password:}")
    private String databasePassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        String url = databaseUrl;
        String username = databaseUsername;
        String password = databasePassword;

        // Check if DATABASE_URL is in postgres:// or postgresql:// format (URI structure)
        if (url != null && (url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
            try {
                URI dbUri = new URI(url);
                String host = dbUri.getHost();
                int port = dbUri.getPort();
                if (port == -1) {
                    port = 5432;
                }
                String dbName = dbUri.getPath();
                
                String userInfo = dbUri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] creds = userInfo.split(":");
                    username = creds[0];
                    password = creds[1];
                }

                // Construct valid JDBC connection URL and enforce SSL for secure cloud databases (like Neon)
                url = "jdbc:postgresql://" + host + ":" + port + dbName;
                if (!url.contains("?")) {
                    url += "?sslmode=require";
                } else if (!url.contains("sslmode")) {
                    url += "&sslmode=require";
                }
            } catch (URISyntaxException e) {
                System.err.println("Failed to parse cloud database URI, falling back: " + e.getMessage());
            }
        }

        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .build();
    }
}
