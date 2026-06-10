package com.mugencrm.lead;

import com.mugencrm.ai.AiService;
import com.opencsv.CSVReader;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class LeadService {

    private final LeadRepository repository;
    private final AiService aiService;

    public LeadService(LeadRepository repository, AiService aiService) {
        this.repository = repository;
        this.aiService = aiService;
    }

    public List<Lead> getAllLeads(String search, Boolean filterReached) {
        if (filterReached != null) {
            return repository.findByReachedOut(filterReached);
        }
        if (search != null && !search.isBlank()) {
            return repository.search(search);
        }
        return repository.findAll();
    }

    public Lead toggleReachedOut(Long id) {
        Lead lead = repository.findById(id).orElseThrow();
        lead.setReachedOut(!lead.isReachedOut());
        return repository.save(lead);
    }

    public Lead updateNotes(Long id, String notes) {
        Lead lead = repository.findById(id).orElseThrow();
        lead.setNotes(notes);
        return repository.save(lead);
    }

    public int importCsv(MultipartFile file) throws Exception {
        List<Lead> leads = new ArrayList<>();
        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String[] header = reader.readNext();
            if (header == null) return 0;
            String[] line;
            while ((line = reader.readNext()) != null) {
                if (line.length < 2) continue;
                String name = line.length > 0 ? line[0].trim() : "";
                String phone = line.length > 1 ? line[1].trim() : "";
                String website = line.length > 2 ? line[2].trim() : "";
                String address = line.length > 3 ? line[3].trim() : "";
                Double rating = null;
                if (line.length > 4 && !line[4].trim().isEmpty()) {
                    try { rating = Double.parseDouble(line[4].trim()); } catch (NumberFormatException ignored) {}
                }
                Integer reviewCount = null;
                if (line.length > 5 && !line[5].trim().isEmpty()) {
                    try { reviewCount = Integer.parseInt(line[5].trim()); } catch (NumberFormatException ignored) {}
                }
                if (!name.isEmpty() || !phone.isEmpty()) {
                    leads.add(new Lead(name, phone, website, address, rating, reviewCount));
                }
            }
        }
        return repository.saveAll(leads).size();
    }

    public Map<String, Object> tidyAllLeads() {
        List<Lead> leads = repository.findAll();
        List<Map<String, Object>> details = new ArrayList<>();

        List<String> namesToClean = new ArrayList<>();
        for (Lead lead : leads) {
            String rawName = lead.getName();
            if (rawName != null && !rawName.isBlank() && rawName.trim().split("\\s+").length > 6) {
                namesToClean.add(rawName);
            }
        }

        Map<String, String> cleanedNames = new java.util.HashMap<>();
        if (!namesToClean.isEmpty()) {
            cleanedNames = aiService.batchTidyNames(namesToClean);
        }

        for (Lead lead : leads) {
            String rawName = lead.getName();
            if (rawName == null || rawName.isBlank()) continue;

            String oldPhone = lead.getPhone();
            String oldWebsite = lead.getWebsite();
            String phone = oldPhone;
            String website = oldWebsite;

            Map<String, Object> change = new java.util.LinkedHashMap<>();
            change.put("id", lead.getId());
            change.put("originalName", rawName);

            if (phone == null || phone.isBlank() || website == null || website.isBlank()) {
                Map<String, String> info = searchBusinessInfo(rawName);
                if ((phone == null || phone.isBlank()) && info.containsKey("phone")) {
                    phone = info.get("phone");
                }
                if ((website == null || website.isBlank()) && info.containsKey("website")) {
                    website = info.get("website");
                }
            }

            String cleaned = cleanedNames.getOrDefault(rawName, rawName);
            lead.setName(cleaned);
            if (phone != null && !phone.isBlank()) lead.setPhone(phone);
            if (website != null && !website.isBlank()) lead.setWebsite(website);

            boolean phoneFound = phone != null && !phone.isBlank() && (oldPhone == null || oldPhone.isBlank() || !phone.equals(oldPhone));
            boolean websiteFound = website != null && !website.isBlank() && (oldWebsite == null || oldWebsite.isBlank() || !website.equals(oldWebsite));

            change.put("cleanedName", cleaned);
            change.put("phoneFound", phoneFound);
            change.put("websiteFound", websiteFound);
            change.put("newPhone", phone);
            change.put("newWebsite", website);
            details.add(change);
        }
        List<Lead> saved = repository.saveAll(leads);
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("cleaned", saved.size());
        result.put("details", details);
        return result;
    }

    private Map<String, String> searchBusinessInfo(String query) {
        Map<String, String> result = new java.util.HashMap<>();
        try {
            String url = "https://www.google.com/search?q=" + URLEncoder.encode(query + " phone website", "UTF-8");
            Document doc = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(10000)
                .get();

            String html = doc.html();

            Pattern phonePattern = Pattern.compile("[\\(\\+]?\\d{1,4}[\\)\\-\\s]?\\d{3,4}[\\)\\-\\s]?\\d{3,4}[\\)\\-\\s]?\\d{3,4}");
            Matcher phoneMatcher = phonePattern.matcher(html);
            if (phoneMatcher.find()) {
                String p = phoneMatcher.group().trim();
                if (p.length() >= 10) result.put("phone", p);
            }

            for (Element link : doc.select("a[href]")) {
                String href = link.attr("href");
                if (href.startsWith("/url?q=") && !href.contains("google.com") && !href.contains("facebook.com") && !href.contains("instagram.com")) {
                    String site = href.replace("/url?q=", "").split("&")[0];
                    if (site.startsWith("http") && !site.contains("webcache")) {
                        result.put("website", site);
                        break;
                    }
                }
            }
        } catch (Exception ignored) {}
        return result;
    }

    public List<Lead> scoreAllLeads() {
        List<Lead> leads = repository.findAll();

        List<Map<String, Object>> batchData = new ArrayList<>();
        for (Lead lead : leads) {
            Map<String, Object> entry = new java.util.LinkedHashMap<>();
            entry.put("name", lead.getName());
            entry.put("website", lead.getWebsite());
            entry.put("rating", lead.getRating());
            entry.put("reviewCount", lead.getReviewCount());
            batchData.add(entry);
        }

        Map<String, String> priorities = new java.util.HashMap<>();
        if (!batchData.isEmpty()) {
            priorities = aiService.batchScorePriority(batchData);
        }

        for (Lead lead : leads) {
            String name = lead.getName();
            String priority = priorities.getOrDefault(name, "MEDIUM");
            lead.setPriority(priority);
        }

        return repository.saveAll(leads);
    }

    public Map<Long, String> generateOutreachMessages(List<Long> ids) {
        Map<Long, String> messages = new java.util.HashMap<>();
        for (Long id : ids) {
            Lead lead = repository.findById(id).orElse(null);
            if (lead == null) continue;
            boolean hasWebsite = lead.getWebsite() != null && !lead.getWebsite().isBlank();
            String msg = aiService.generateOutreachMessage(lead.getName(), hasWebsite);
            messages.put(id, msg);
        }
        return messages;
    }

    public Lead deleteLead(Long id) {
        Lead lead = repository.findById(id).orElseThrow();
        repository.delete(lead);
        return lead;
    }

    public int deleteAllLeads() {
        long count = repository.count();
        repository.deleteAll();
        return (int) count;
    }

    public int importLeads(List<Map<String, Object>> leadsData) {
        List<Lead> leads = new ArrayList<>();
        for (Map<String, Object> data : leadsData) {
            String name = (String) data.getOrDefault("name", "");
            String phone = (String) data.getOrDefault("phone", "");
            String website = (String) data.getOrDefault("website", "");
            String address = (String) data.getOrDefault("address", "");
            Double rating = null;
            if (data.containsKey("rating") && data.get("rating") != null) {
                try { rating = Double.valueOf(data.get("rating").toString()); } catch (NumberFormatException ignored) {}
            }
            Integer reviewCount = null;
            if (data.containsKey("reviewCount") && data.get("reviewCount") != null) {
                try { reviewCount = Integer.valueOf(data.get("reviewCount").toString()); } catch (NumberFormatException ignored) {}
            }
            if (!name.isEmpty() || !phone.isEmpty()) {
                leads.add(new Lead(name, phone, website, address, rating, reviewCount));
            }
        }
        return repository.saveAll(leads).size();
    }
}
