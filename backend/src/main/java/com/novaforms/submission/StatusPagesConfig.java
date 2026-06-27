package com.novaforms.submission;

import com.fasterxml.jackson.annotation.JsonProperty;

public class StatusPagesConfig {
    private StatusPageDetails closed;
    private StatusPageDetails scheduled;
    private StatusPageDetails paused;
    private StatusPageDetails maintenance;
    
    @JsonProperty("limit_reached")
    private StatusPageDetails limitReached;
    
    @JsonProperty("password_required")
    private StatusPageDetails passwordRequired;

    public StatusPagesConfig() {}

    public StatusPageDetails getClosed() {
        return closed;
    }

    public void setClosed(StatusPageDetails closed) {
        this.closed = closed;
    }

    public StatusPageDetails getScheduled() {
        return scheduled;
    }

    public void setScheduled(StatusPageDetails scheduled) {
        this.scheduled = scheduled;
    }

    public StatusPageDetails getPaused() {
        return paused;
    }

    public void setPaused(StatusPageDetails paused) {
        this.paused = paused;
    }

    public StatusPageDetails getMaintenance() {
        return maintenance;
    }

    public void setMaintenance(StatusPageDetails maintenance) {
        this.maintenance = maintenance;
    }

    public StatusPageDetails getLimitReached() {
        return limitReached;
    }

    public void setLimitReached(StatusPageDetails limitReached) {
        this.limitReached = limitReached;
    }

    public StatusPageDetails getPasswordRequired() {
        return passwordRequired;
    }

    public void setPasswordRequired(StatusPageDetails passwordRequired) {
        this.passwordRequired = passwordRequired;
    }
}
