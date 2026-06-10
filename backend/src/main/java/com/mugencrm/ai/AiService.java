package com.mugencrm.ai;

import com.mugencrm.config.SettingsHolder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private static final String API_URL = "https://openrouter.ai/api/v1/chat/completions";
    private static final String MODEL = "openai/gpt-4o-mini";

    private final SettingsHolder settings;
    private final HttpClient client;
    private final ObjectMapper mapper;

    public AiService(SettingsHolder settings) {
        this.settings = settings;
        this.client = HttpClient.newHttpClient();
        this.mapper = new ObjectMapper();
    }

    public Map<String, String> batchTidyNames(List<String> names) {
        Map<String, String> results = new java.util.LinkedHashMap<>();
        if (names.isEmpty()) return results;

        StringBuilder sb = new StringBuilder();
        sb.append("Extract ONLY the core business brand name from each listing. Remove location suffixes, SEO keywords, promotional text, and practice descriptors (Clinic, Hospital, Centre, Academy, etc.).\n\n");
        sb.append("Return ONLY a valid JSON array of objects with fields \"original\" and \"cleaned\". No markdown, no code fences, no explanation.\n\n");
        for (int i = 0; i < names.size(); i++) {
            sb.append("{\"original\": \"").append(escapeJson(names.get(i))).append("\"");
            sb.append(", \"cleaned\": \"<cleaned name>\"").append("}");
            if (i < names.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("\n\nExamples:\nSPARSH Hospital, RR Nagar → SPARSH\nVeturi Polyclinic & Diagnostic Centre → Veturi\nRxDx Clinics, Rajarajeshwari Nagar → RxDx\nWHITE PETALS PRE-SCHOOL - RR Nagar → WHITE PETALS");

        try {
            String raw = callAi(sb.toString(), 4000);
            if (raw.isEmpty()) return results;

            raw = raw.trim();
            if (raw.startsWith("```")) {
                raw = raw.replaceAll("(?s)```(?:json)?\\s*", "").trim();
            }
            int start = raw.indexOf('[');
            int end = raw.lastIndexOf(']');
            if (start != -1 && end > start) {
                raw = raw.substring(start, end + 1);
            }

            JsonNode arr = mapper.readTree(raw);
            if (arr.isArray()) {
                for (JsonNode node : arr) {
                    String orig = node.path("original").asText("");
                    String cleaned = node.path("cleaned").asText("");
                    if (!orig.isEmpty()) results.put(orig, cleaned);
                }
            }
        } catch (Exception ignored) {}

        for (String name : names) {
            results.putIfAbsent(name, name);
        }
        return results;
    }

    public Map<String, String> batchScorePriority(List<Map<String, Object>> leadsData) {
        Map<String, String> results = new java.util.LinkedHashMap<>();
        if (leadsData.isEmpty()) return results;

        StringBuilder sb = new StringBuilder();
        sb.append("Analyze each business and determine how likely they need professional web design services.\n\n");
        sb.append("For each business, reply with HIGH, MEDIUM, or LOW based on:\n");
        sb.append("- No website or basic URL (facebook, blogspot) → HIGH\n");
        sb.append("- Local independent business with basic website → MEDIUM\n");
        sb.append("- Well-established brand with professional custom website → LOW\n");
        sb.append("- Large franchise/chain with strong online presence → LOW\n\n");
        sb.append("Return ONLY a valid JSON array of objects with fields \"index\" (number), \"name\", and \"priority\" (one of HIGH, MEDIUM, LOW). No markdown, no code fences, no explanation.\n\n");

        for (int i = 0; i < leadsData.size(); i++) {
            Map<String, Object> lead = leadsData.get(i);
            String name = (String) lead.getOrDefault("name", "");
            String website = (String) lead.getOrDefault("website", "");
            Object ratingObj = lead.get("rating");
            Object reviewsObj = lead.get("reviewCount");
            String ratingStr = ratingObj != null ? String.format("%.1f", ratingObj) : "N/A";
            String reviewsStr = reviewsObj != null ? reviewsObj.toString() : "N/A";
            String siteInfo = (website == null || website.isBlank()) ? "No website" : website;

            sb.append("--- Business ").append(i).append(" ---\n");
            sb.append("Name: ").append(name).append("\n");
            sb.append("Website: ").append(siteInfo).append("\n");
            sb.append("Rating: ").append(ratingStr).append("/5\n");
            sb.append("Reviews: ").append(reviewsStr).append("\n\n");
        }

        sb.append("JSON output:\n");

        try {
            String raw = callAi(sb.toString(), 4000);
            if (raw.isEmpty()) return results;

            raw = raw.trim();
            if (raw.startsWith("```")) {
                raw = raw.replaceAll("(?s)```(?:json)?\\s*", "").trim();
            }
            int start = raw.indexOf('[');
            int end = raw.lastIndexOf(']');
            if (start != -1 && end > start) {
                raw = raw.substring(start, end + 1);
            }

            JsonNode arr = mapper.readTree(raw);
            if (arr.isArray()) {
                for (JsonNode node : arr) {
                    String name = node.path("name").asText("");
                    String priority = node.path("priority").asText("").toUpperCase();
                    if (!name.isEmpty()) {
                        if (priority.contains("HIGH")) priority = "HIGH";
                        else if (priority.contains("LOW")) priority = "LOW";
                        else priority = "MEDIUM";
                        results.put(name, priority);
                    }
                }
            }
        } catch (Exception ignored) {}

        for (Map<String, Object> lead : leadsData) {
            String name = (String) lead.getOrDefault("name", "");
            if (!name.isEmpty()) results.putIfAbsent(name, "MEDIUM");
        }
        return results;
    }

    public String generateOutreachMessage(String businessName, boolean hasWebsite) {
        String apiKey = settings.getApiKey();
        if (apiKey == null || apiKey.isBlank()) return "";

        String angle = hasWebsite
            ? "your online presence doesn't quite reflect the quality of the business itself. In a world where most first impressions happen online, that feels like a missed opportunity."
            : "you don't have an online presence yet. In a world where most first impressions happen online, having no web presence means you're invisible to potential customers.";

        String prompt = "Write a short, friendly business outreach message to " + businessName + ". The message should:\n"
            + "- Start with: 'Hi, We came across " + businessName + " recently and genuinely loved what you're building.'\n"
            + "- Mention: " + angle + "\n"
            + "- Say: At Mugen, we design and build websites for brands we believe have something worth sharing, and yours was one of the few that caught our attention.\n"
            + "- End with: No hard sell. We simply wanted to reach out because we see a lot of potential there. If you'd ever like to explore a few ideas together, we'd love to chat.\n"
            + "- Sign off with: — Mugen\n\n"
            + "Keep it natural and conversational. Output only the message, no preamble.";

        return callAi(prompt, 500);
    }

    public String tidyBusinessName(String rawName) {
        Map<String, String> result = batchTidyNames(List.of(rawName));
        return result.getOrDefault(rawName, rawName);
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private String callAi(String prompt, int maxTokens) {
        try {
            String apiKey = settings.getApiKey();
            if (apiKey == null || apiKey.isBlank()) return "";

            ObjectNode body = mapper.createObjectNode();
            body.put("model", MODEL);
            body.put("temperature", 0.3);
            body.put("max_tokens", maxTokens);

            ArrayNode messages = body.putArray("messages");
            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            userMsg.put("content", prompt);

            String json = mapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "https://mugencrm.com")
                .header("X-Title", "MugenCRM")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = mapper.readTree(response.body());
                String text = root.path("choices").get(0).path("message").path("content").asText("");
                return text.trim();
            }
            return "";
        } catch (Exception e) {
            return "";
        }
    }
}
