package com.mugencrm.lead;

import com.mugencrm.ai.AiService;
import com.opencsv.CSVReader;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class LeadService {

    private final LeadRepository repository;
    private final AiService aiService;
    private final ScraperService scraperService;

    public LeadService(LeadRepository repository, AiService aiService, ScraperService scraperService) {
        this.repository = repository;
        this.aiService = aiService;
        this.scraperService = scraperService;
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
                Map<String, String> info = scraperService.searchBusinessInfo(rawName);
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

    public List<Lead> scoreAllLeads() {
        List<Lead> leads = repository.findAll();
        for (Lead lead : leads) {
            Integer score = aiService.scoreOpportunity(lead.getName(), lead.getWebsite(), lead.getRating(), lead.getReviewCount());
            lead.setOpportunityScore(score);
            if (score >= 80) lead.setPriority("HOT");
            else if (score >= 50) lead.setPriority("POTENTIAL");
            else lead.setPriority("LOW");
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

    public void deleteAll() {
        repository.deleteAll();
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
