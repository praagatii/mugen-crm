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
    private String nvidiaApiKey;

    @PostConstruct
    public void init() {
        if (SETTINGS_FILE.exists()) {
            try {
                Map<?, ?> data = mapper.readValue(SETTINGS_FILE, Map.class);
                if (data.containsKey("nvidiaApiKey")) {
                    this.nvidiaApiKey = (String) data.get("nvidiaApiKey");
                }
            } catch (IOException ignored) {}
        }
    }

    public String getNvidiaApiKey() { return nvidiaApiKey; }

    public void setNvidiaApiKey(String nvidiaApiKey) {
        this.nvidiaApiKey = nvidiaApiKey;
        try {
            SETTINGS_FILE.getParentFile().mkdirs();
            Map<String, Object> data = new HashMap<>();
            data.put("nvidiaApiKey", nvidiaApiKey);
            mapper.writerWithDefaultPrettyPrinter().writeValue(SETTINGS_FILE, data);
        } catch (IOException ignored) {}
    }
}
