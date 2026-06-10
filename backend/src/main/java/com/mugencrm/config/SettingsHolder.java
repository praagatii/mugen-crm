package com.mugencrm.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class SettingsHolder {
    private static final File SETTINGS_FILE = new File("data/settings.json");
    private final ObjectMapper mapper = new ObjectMapper();
    private String apiKey;

    @PostConstruct
    public void init() {
        if (SETTINGS_FILE.exists()) {
            try {
                Map<?, ?> data = mapper.readValue(SETTINGS_FILE, Map.class);
                if (data.containsKey("apiKey")) {
                    this.apiKey = (String) data.get("apiKey");
                }
            } catch (IOException ignored) {}
        }
    }

    public String getApiKey() { return apiKey; }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
        try {
            SETTINGS_FILE.getParentFile().mkdirs();
            Map<String, Object> data = new HashMap<>();
            data.put("apiKey", apiKey);
            mapper.writerWithDefaultPrettyPrinter().writeValue(SETTINGS_FILE, data);
        } catch (IOException ignored) {}
    }
}
