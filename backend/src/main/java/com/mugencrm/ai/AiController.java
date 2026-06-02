package com.mugencrm.ai;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/tidy")
    public String tidyName(@RequestBody String name) {
        return aiService.tidyBusinessName(name);
    }
}
