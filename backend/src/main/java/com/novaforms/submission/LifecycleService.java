package com.novaforms.submission;

public interface LifecycleService {
    DynamicStatus calculateDynamicStatus(FormConfig config);
    boolean isWithinBusinessHours(FormConfig config);
}
