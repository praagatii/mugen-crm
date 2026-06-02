package com.mugencrm.lead;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leads")
public class LeadController {

    private final LeadService service;
    private final ScraperService scraperService;

    public LeadController(LeadService service, ScraperService scraperService) {
        this.service = service;
        this.scraperService = scraperService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadCsv(@RequestParam("file") MultipartFile file) {
        try {
            int count = service.importCsv(file);
            return ResponseEntity.ok(Map.of("imported", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public List<Lead> getLeads(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean filterReached) {
        return service.getAllLeads(search, filterReached);
    }

    @PatchMapping("/{id}/status")
    public Lead toggleStatus(@PathVariable Long id) {
        return service.toggleReachedOut(id);
    }

    @PatchMapping("/{id}/notes")
    public Lead updateNotes(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.updateNotes(id, body.get("notes"));
    }

    @PostMapping("/score")
    public ResponseEntity<Map<String, Object>> scoreLeads() {
        try {
            List<Lead> scored = service.scoreAllLeads();
            return ResponseEntity.ok(Map.of("scored", scored.size()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/tidy")
    public ResponseEntity<Map<String, Object>> tidyLeads() {
        try {
            List<Lead> cleaned = service.tidyAllLeads();
            return ResponseEntity.ok(Map.of("cleaned", cleaned.size()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/outreach/generate")
    public ResponseEntity<Map<String, Object>> generateMessages(@RequestBody Map<String, List<Long>> body) {
        try {
            List<Long> ids = body.get("ids");
            Map<Long, String> messages = service.generateOutreachMessages(ids);
            return ResponseEntity.ok(Map.of("messages", messages));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/scrape")
    public ResponseEntity<Map<String, Object>> scrape(@RequestBody Map<String, String> body) {
        try {
            String query = body.get("query");
            if (query == null || query.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "query is required"));
            }
            List<Map<String, Object>> results = scraperService.scrapeGmaps(query);
            return ResponseEntity.ok(Map.of("results", results));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteAll() {
        service.deleteAll();
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importLeads(@RequestBody Map<String, List<Map<String, Object>>> body) {
        try {
            List<Map<String, Object>> leads = body.get("leads");
            if (leads == null || leads.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "leads array is required"));
            }
            int count = service.importLeads(leads);
            return ResponseEntity.ok(Map.of("imported", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
