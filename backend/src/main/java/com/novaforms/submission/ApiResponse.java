package com.novaforms.submission;

import java.time.Instant;
import org.slf4j.MDC;

public class ApiResponse<T> {
    private String requestId;
    private String timestamp;
    private int status;
    private String message;
    private T data;

    public ApiResponse() {
        this.timestamp = Instant.now().toString();
        String id = MDC.get("requestId");
        this.requestId = id != null ? id : "N/A";
    }

    public ApiResponse(int status, String message, T data) {
        this();
        this.status = status;
        this.message = message;
        this.data = data;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
