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

    private static final String NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
    private static final String MODEL = "meta/llama-3.1-8b-instruct";

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
        if (words.length <= 6) return rawName.trim();

        String apiKey = settings.getNvidiaApiKey();
        if (apiKey == null || apiKey.isBlank()) return rawName.trim();

        String prompt = "Extract ONLY the core business brand name from this listing. Remove ALL of the following: location suffixes, SEO keywords, descriptions, promotional text, practice descriptors (Clinic, Hospital, Polyclinic, Diagnostics, Centre, Center, Preschool, Daycare, Play School, Academy, Institute, Services, Solutions, Care, Pharmacy, Laboratory, Nursing Home, Medical Centre, Speciality, Super Speciality, Orthopaedics, Neurology, Cardiology, Dental, Skin, ENT, Eye, Maternity, Child, Cancer, Diabetes, Heart, Sports Medicine, Nephrology, Liver, Gastro, Gen Medicine, Physician, Surgeon, Gynecologist, Paediatric, Dermatologist, Orthopaedic, etc.). Return ONLY the distinctive establishment brand name, nothing else. Do NOT use quotes.\n\nExamples:\n\"Veturi Polyclinic & Diagnostic Centre\" → Veturi\n\"SPARSH Hospital, RR Nagar\" → SPARSH\n\"RxDx Clinics, Rajarajeshwari (RR) Nagar\" → RxDx\n\"Shree Tibbadevi Clinic\" → Shree Tibbadevi\n\"WHITE PETALS PRE-SCHOOL - RR Nagar\" → WHITE PETALS\n\"The Child's Kingdom Preschool & Daycare, Rajarajeshwari Nagar, Bengaluru | Best Preschool In Rajarajeshwari Nagar\" → The Child's Kingdom\n\nInput: \"" + rawName + "\"\nOutput:";

        String result = callNvidia(prompt);
        return result.replace("\"", "").replace("'", "").trim();
    }

    public String generateOutreachMessage(String businessName, boolean hasWebsite) {
        String apiKey = settings.getNvidiaApiKey();
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

        return callNvidia(prompt);
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

        String result = callNvidia(prompt).trim().toUpperCase();
        if (result.contains("HIGH")) return "HIGH";
        if (result.contains("LOW")) return "LOW";
        return "MEDIUM";
    }

    private String callNvidia(String prompt) {
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
                .uri(URI.create(NVIDIA_API_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
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
