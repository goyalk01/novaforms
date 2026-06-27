package com.novaforms.submission;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class LiveEmitterRegistry {
  private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

  public SseEmitter createEmitter(Long formId) {
    // 30 minute timeout (1800000 ms)
    SseEmitter emitter = new SseEmitter(1800000L);
    
    emitters.computeIfAbsent(formId, k -> new ArrayList<>());
    List<SseEmitter> list = emitters.get(formId);
    synchronized (list) {
      list.add(emitter);
    }

    emitter.onCompletion(() -> removeEmitter(formId, emitter));
    emitter.onTimeout(() -> removeEmitter(formId, emitter));
    emitter.onError((e) -> removeEmitter(formId, emitter));

    // Send initial handshake connect event
    try {
      emitter.send(SseEmitter.event()
          .name("CONNECT")
          .data("Connected to NovaForms Live Stream for Form #" + formId));
    } catch (IOException e) {
      removeEmitter(formId, emitter);
    }

    return emitter;
  }

  public void broadcast(Long formId, String eventName, Object data) {
    List<SseEmitter> list = emitters.get(formId);
    if (list == null || list.isEmpty()) return;

    List<SseEmitter> deadEmitters = new ArrayList<>();
    synchronized (list) {
      for (SseEmitter emitter : list) {
        try {
          emitter.send(SseEmitter.event()
              .name(eventName)
              .data(data));
        } catch (Exception e) {
          deadEmitters.add(emitter);
        }
      }
      list.removeAll(deadEmitters);
    }
  }

  private void removeEmitter(Long formId, SseEmitter emitter) {
    List<SseEmitter> list = emitters.get(formId);
    if (list != null) {
      synchronized (list) {
        list.remove(emitter);
      }
    }
  }
}
