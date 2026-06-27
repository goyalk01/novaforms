package com.novaforms.submission;

public class BusinessHourSlot {
    private String day;
    private boolean enabled;
    private String startTime;
    private String endTime;

    public BusinessHourSlot() {}

    public BusinessHourSlot(String day, boolean enabled, String startTime, String endTime) {
        this.day = day;
        this.enabled = enabled;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }
}
