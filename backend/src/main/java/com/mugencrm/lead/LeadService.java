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

    public List<Lead> tidyAllLeads() {
        List<Lead> leads = repository.findAll();
        for (Lead lead : leads) {
            String rawName = lead.getName();
            if (rawName == null || rawName.isBlank()) continue;

            String phone = lead.getPhone();
            String website = lead.getWebsite();

            if (phone == null || phone.isBlank() || website == null || website.isBlank()) {
                Map<String, String> info = searchBusinessInfo(rawName);
                if ((phone == null || phone.isBlank()) && info.containsKey("phone")) {
                    phone = info.get("phone");
                }
                if ((website == null || website.isBlank()) && info.containsKey("website")) {
                    website = info.get("website");
                }
            }

            String cleaned = aiService.tidyBusinessName(rawName);
            lead.setName(cleaned);
            if (phone != null && !phone.isBlank()) lead.setPhone(phone);
            if (website != null && !website.isBlank()) lead.setWebsite(website);
        }
        return repository.saveAll(leads);
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
        for (Lead lead : leads) {
            String priority = aiService.scorePriority(lead.getName(), lead.getWebsite(), lead.getRating(), lead.getReviewCount());
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
