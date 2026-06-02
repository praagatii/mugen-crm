package com.mugencrm.lead;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.WaitUntilState;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ScraperService {

    private Playwright playwright;
    private Browser browser;

    private synchronized Browser getBrowser() {
        if (browser == null) {
            playwright = Playwright.create();
            browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(true)
                .setArgs(List.of("--disable-blink-features=AutomationControlled")));
        }
        return browser;
    }

    public List<Map<String, Object>> scrapeGmaps(String query) {
        List<Map<String, Object>> results = new ArrayList<>();
        BrowserContext context = null;
        Page page = null;
        try {
            context = getBrowser().newContext(new Browser.NewContextOptions()
                .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .setViewportSize(1920, 1080));
            page = context.newPage();

            String url = "https://www.google.com/maps/search/" + java.net.URLEncoder.encode(query, "UTF-8");
            page.navigate(url, new Page.NavigateOptions().setTimeout(30000).setWaitUntil(WaitUntilState.DOMCONTENTLOADED));

            try {
                page.waitForSelector("div[role='feed']", new Page.WaitForSelectorOptions().setTimeout(10000));
            } catch (Exception ignored) {}

            for (int scroll = 0; scroll < 6; scroll++) {
                page.evaluate("document.querySelector('div[role=\\'feed\\']')?.scrollBy(0, 2000)");
                page.waitForTimeout(1500);
            }

            List<ElementHandle> cards = page.querySelectorAll("a[href*='/maps/place/']");
            int limit = Math.min(cards.size(), 20);
            for (int i = 0; i < limit; i++) {
                try {
                    Map<String, Object> item = extractListing(context, cards.get(i));
                    if (item != null && !item.get("phone").toString().isBlank()) {
                        results.add(item);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {
        } finally {
            if (context != null) context.close();
        }
        return results;
    }

    private Map<String, Object> extractListing(BrowserContext context, ElementHandle card) {
        Page page = context.newPage();
        try {
            String href = card.getAttribute("href");
            if (href == null) return null;
            page.navigate(href, new Page.NavigateOptions().setTimeout(20000).setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
            page.waitForTimeout(1500);

            String name = page.textContent("h1");

            String phone = "";
            ElementHandle phoneBtn = page.querySelector("button[data-item-id*='phone']");
            if (phoneBtn != null) {
                String dataId = phoneBtn.getAttribute("data-item-id");
                if (dataId != null && dataId.startsWith("phone:tel:")) {
                    phone = dataId.replace("phone:tel:", "").trim();
                }
            }

            String website = "";
            ElementHandle websiteEl = page.querySelector("a[data-item-id*='website']");
            if (websiteEl != null) {
                String w = websiteEl.getAttribute("href");
                if (w != null) website = w;
            }

            String address = "";
            ElementHandle addressBtn = page.querySelector("button[data-item-id*='address']");
            if (addressBtn != null) {
                String dataId = addressBtn.getAttribute("data-item-id");
                if (dataId != null && dataId.startsWith("address:")) {
                    address = dataId.replace("address:", "").trim();
                }
            }

            Double rating = null;
            ElementHandle ratingEl = page.querySelector("div[role='feed'] ~ div span[aria-hidden='true']");
            if (ratingEl != null) {
                String rt = ratingEl.textContent();
                Matcher m = Pattern.compile("([\\d.]+)").matcher(rt);
                if (m.find()) {
                    try { rating = Double.parseDouble(m.group(1)); } catch (NumberFormatException ignored) {}
                }
            }

            if (phone.isBlank() && website.isBlank()) return null;

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("name", name != null ? name : "");
            map.put("phone", phone);
            map.put("website", website);
            map.put("address", address);
            map.put("rating", rating);
            map.put("reviewCount", null);
            return map;
        } catch (Exception e) {
            return null;
        } finally {
            page.close();
        }
    }
}
