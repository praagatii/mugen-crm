package com.mugencrm.settings;

import com.mugencrm.config.SettingsHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsHolder settings;

    public SettingsController(SettingsHolder settings) {
        this.settings = settings;
    }

    @GetMapping
    public Map<String, Object> getSettings() {
        java.util.HashMap<String, Object> result = new java.util.HashMap<>();
        result.put("apiKey", settings.getApiKey() != null ? "set" : null);
        return result;
    }

    @PostMapping
    public Map<String, String> saveSettings(@RequestBody Map<String, String> body) {
        if (body.containsKey("apiKey")) {
            settings.setApiKey(body.get("apiKey"));
        }
        return Map.of("status", "ok");
    }
}
