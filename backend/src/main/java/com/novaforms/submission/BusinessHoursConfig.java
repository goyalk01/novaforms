package com.novaforms.submission;

import java.time.LocalTime;
import java.util.List;

public class BusinessHoursConfig {
    private List<BusinessHourSlot> slots;

    public List<BusinessHourSlot> getSlots() {
        return slots;
    }

    public void setSlots(List<BusinessHourSlot> slots) {
        this.slots = slots;
    }

    public static void validate(List<BusinessHourSlot> slots) {
        if (slots == null) return;
        for (BusinessHourSlot slot : slots) {
            if (slot.getDay() == null || slot.getDay().isBlank()) {
                throw new IllegalArgumentException("Day name is required");
            }
            if (slot.isEnabled()) {
                if (slot.getStartTime() == null || slot.getStartTime().isBlank() ||
                    slot.getEndTime() == null || slot.getEndTime().isBlank()) {
                    throw new IllegalArgumentException("Start time and end time are required for enabled day: " + slot.getDay());
                }
                try {
                    LocalTime start = LocalTime.parse(slot.getStartTime());
                    LocalTime end = LocalTime.parse(slot.getEndTime());
                    if (!end.isAfter(start)) {
                        throw new IllegalArgumentException("End time must be after start time for day: " + slot.getDay());
                    }
                } catch (Exception e) {
                    throw new IllegalArgumentException("Invalid time format for day: " + slot.getDay() + ". Expected HH:mm.");
                }
            }
        }
    }
}
