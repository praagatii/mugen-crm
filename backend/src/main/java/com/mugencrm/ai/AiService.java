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

@Service
public class AiService {

    private static final String API_URL = "https://openrouter.ai/api/v1/chat/completions";
    private static final String MODEL = "meta-llama/llama-3.1-8b-instruct";

    private final SettingsHolder settings;
    private final HttpClient client;
    private final ObjectMapper mapper;

    public AiService(SettingsHolder settings) {
        this.settings = settings;
        this.client = HttpClient.newHttpClient();
        this.mapper = new ObjectMapper();
    }

    public String tidyBusinessName(String rawName) {
        if (rawName == null || rawName.isBlank()) return rawName;
        String[] words = rawName.trim().split("\\s+");
        if (words.length <= 4) return rawName.trim();

        String apiKey = settings.getNvidiaApiKey();
        if (apiKey == null || apiKey.isBlank()) return rawName.trim();

        String prompt = "Extract ONLY the core business brand name from this listing. Remove ALL of the following: location suffixes, SEO keywords, descriptions, promotional text, practice descriptors (Clinic, Hospital, Polyclinic, Diagnostics, Centre, Center, Preschool, Daycare, Play School, Academy, Institute, Services, Solutions, Care, Pharmacy, Laboratory, Nursing Home, Medical Centre, Speciality, Super Speciality, Orthopaedics, Neurology, Cardiology, Dental, Skin, ENT, Eye, Maternity, Child, Cancer, Diabetes, Heart, Sports Medicine, Nephrology, Liver, Gastro, Gen Medicine, Physician, Surgeon, Gynecologist, Paediatric, Dermatologist, Orthopaedic, etc.). Return ONLY the distinctive establishment brand name, nothing else. Do NOT use quotes.\n\nExamples:\n\"Veturi Polyclinic & Diagnostic Centre\" → Veturi\n\"SPARSH Hospital, RR Nagar\" → SPARSH\n\"RxDx Clinics, Rajarajeshwari (RR) Nagar\" → RxDx\n\"Shree Tibbadevi Clinic\" → Shree Tibbadevi\n\"WHITE PETALS PRE-SCHOOL - RR Nagar\" → WHITE PETALS\n\"The Child's Kingdom Preschool & Daycare, Rajarajeshwari Nagar, Bengaluru | Best Preschool In Rajarajeshwari Nagar\" → The Child's Kingdom\n\nInput: \"" + rawName + "\"\nOutput:";

        String result = callAI(prompt);
        return result.replace("\"", "").replace("'", "").trim();
    }

    public String generateOutreachMessage(String businessName, boolean hasWebsite) {
        return "Hey, I came across " + businessName + " and genuinely loved what you\u2019re building.\n\n"
            + "I\u2019m Raghu from Mugen Studio \u2014 \u201cMugen\u201d means infinity , inspired by the idea of infinite possibilities and bringing unique stories to life.\n\n"
            + "I felt like " + businessName + " has its own personality and story, and we\u2019d love to create a website that captures that \u2014 something that feels like you, not just another page online.\n\n"
            + "Would love to share some ideas if you\u2019re open to it :)\n\n"
            + "\u2014 Mugen \n\nhttps://studio-mugen.com/";
    }

    public String scorePriority(String name, String website, Double rating, Integer reviewCount) {
        String apiKey = settings.getNvidiaApiKey();
        if (apiKey == null || apiKey.isBlank()) return "MEDIUM";

        String ratingStr = rating != null ? String.format("%.1f", rating) : "N/A";
        String reviewsStr = reviewCount != null ? reviewCount.toString() : "N/A";
        String siteInfo = (website == null || website.isBlank()) ? "No website" : website;

        String prompt = "Analyze this business and determine how likely they would need professional web design services.\n\n"
            + "Business: " + name + "\n"
            + "Website: " + siteInfo + "\n"
            + "Rating: " + ratingStr + "/5\n"
            + "Reviews: " + reviewsStr + "\n\n"
            + "Consider:\n"
            + "- No website or basic URL (facebook, blogspot) → HIGH priority\n"
            + "- Local independent business with basic website → MEDIUM priority\n"
            + "- Well-established brand with professional custom website → LOW priority\n"
            + "- Large franchise/chain with strong online presence → LOW priority\n\n"
            + "Reply with exactly one word: HIGH, MEDIUM, or LOW";

        String result = callAI(prompt).trim().toUpperCase();
        if (result.contains("HIGH")) return "HIGH";
        if (result.contains("LOW")) return "LOW";
        return "MEDIUM";
    }

    private String callAI(String prompt) {
        try {
            String apiKey = settings.getNvidiaApiKey();
            if (apiKey == null || apiKey.isBlank()) return "";

            ObjectNode body = mapper.createObjectNode();
            body.put("model", MODEL);
            body.put("temperature", 0.3);
            body.put("max_tokens", 500);

            ArrayNode messages = body.putArray("messages");
            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            userMsg.put("content", prompt);

            String json = mapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "http://localhost:3000")
                .header("X-Title", "Mugen CRM")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = mapper.readTree(response.body());
                String text = root.path("choices").get(0).path("message").path("content").asText("");
                return text.trim();
            }
            System.err.println("[AiService] AI API returned " + response.statusCode() + ": " + response.body());
            return "";
        } catch (Exception e) {
            System.err.println("[AiService] AI API call failed: " + e.getMessage());
            return "";
        }
    }
}
