package com.novaforms.submission;

import java.time.Instant;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.LocalTime;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

@Service
public class LifecycleServiceImpl implements LifecycleService {

    private final SubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;

    public LifecycleServiceImpl(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public DynamicStatus calculateDynamicStatus(FormConfig config) {
        if (config.getPublishState() == PublishState.ARCHIVED) {
            return DynamicStatus.ARCHIVED;
        }
        if (config.getManualState() == ManualState.MAINTENANCE) {
            return DynamicStatus.MAINTENANCE;
        }
        if (config.getPublishState() == PublishState.DRAFT) {
            return DynamicStatus.DRAFT;
        }
        if (config.getManualState() == ManualState.PAUSED) {
            return DynamicStatus.PAUSED;
        }

        // Check Scheduled opening
        if (config.getOpenAt() != null) {
            if (Instant.now().isBefore(config.getOpenAt())) {
                return DynamicStatus.SCHEDULED;
            }
        }

        // Check Scheduled closing
        if (config.getCloseAt() != null) {
            if (Instant.now().isAfter(config.getCloseAt())) {
                return DynamicStatus.CLOSED;
            }
        }

        // Check Auto Close Duration (ISO-8601 or legacy fallback)
        if (config.getAutoCloseDuration() != null && !config.getAutoCloseDuration().isBlank() && config.getPublishedAt() != null) {
            long durationMillis = parseAutoCloseDuration(config.getAutoCloseDuration());
            if (durationMillis > 0) {
                Instant autoCloseTime = config.getPublishedAt().plusMillis(durationMillis);
                if (Instant.now().isAfter(autoCloseTime)) {
                    return DynamicStatus.CLOSED;
                }
            }
        }

        // Check Max Responses
        if (config.getMaxResponses() != null && config.getMaxResponses() > 0) {
            long count = submissionRepository.countByFormId(config.getId());
            if (count >= config.getMaxResponses()) {
                return DynamicStatus.LIMIT_REACHED;
            }
        }

        // Check Business Hours recurring schedule
        if (config.getBusinessHoursJson() != null && !config.getBusinessHoursJson().isBlank() && !config.getBusinessHoursJson().equals("[]")) {
            if (!isWithinBusinessHours(config)) {
                return DynamicStatus.CLOSED;
            }
        }

        // Check legacy status value in case it is CLOSED manually
        if ("CLOSED".equalsIgnoreCase(config.getStatus())) {
            return DynamicStatus.CLOSED;
        }

        return DynamicStatus.OPEN;
    }

    @Override
    public boolean isWithinBusinessHours(FormConfig config) {
        try {
            String json = config.getBusinessHoursJson();
            if (json == null || json.isBlank() || json.equals("[]")) {
                return true;
            }
            JsonNode rootNode = objectMapper.readTree(json);
            if (!rootNode.isArray()) {
                return true;
            }

            ZoneId zoneId;
            try {
                zoneId = ZoneId.of(config.getTimezone() != null ? config.getTimezone() : "UTC");
            } catch (Exception e) {
                zoneId = ZoneId.of("UTC");
            }

            ZonedDateTime nowZdt = ZonedDateTime.now(zoneId);
            String currentDay = nowZdt.getDayOfWeek().name();
            LocalTime currentTime = nowZdt.toLocalTime();

            for (JsonNode node : rootNode) {
                String day = node.path("day").asText();
                if (day != null && day.equalsIgnoreCase(currentDay)) {
                    boolean enabled = node.path("enabled").asBoolean(false);
                    if (!enabled) {
                        return false;
                    }
                    String startTimeStr = node.path("startTime").asText();
                    String endTimeStr = node.path("endTime").asText();
                    if (startTimeStr == null || startTimeStr.isBlank() || endTimeStr == null || endTimeStr.isBlank()) {
                        return true;
                    }
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    LocalTime endTime = LocalTime.parse(endTimeStr);
                    return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
                }
            }
            return false;
        } catch (Exception e) {
            return true;
        }
    }

    private long parseAutoCloseDuration(String duration) {
        if (duration == null || duration.isBlank()) return 0;
        try {
            if (duration.startsWith("P") || duration.startsWith("-P")) {
                return Duration.parse(duration).toMillis();
            }
        } catch (Exception e) {
            // fallback
        }
        String clean = duration.toLowerCase().trim();
        if (clean.equals("1 hour") || clean.equals("1h")) return 3600000L;
        if (clean.equals("6 hours") || clean.equals("6h")) return 6 * 3600000L;
        if (clean.equals("12 hours") || clean.equals("12h")) return 12 * 3600000L;
        if (clean.equals("24 hours") || clean.equals("24h") || clean.equals("1 day") || clean.equals("1d")) return 24 * 3600000L;
        if (clean.equals("3 days") || clean.equals("3d")) return 3 * 24 * 3600000L;
        if (clean.equals("7 days") || clean.equals("7d")) return 7 * 24 * 3600000L;
        if (clean.equals("14 days") || clean.equals("14d")) return 14 * 24 * 3600000L;
        if (clean.equals("30 days") || clean.equals("30d")) return 30 * 24 * 3600000L;
        return 0;
    }
}
