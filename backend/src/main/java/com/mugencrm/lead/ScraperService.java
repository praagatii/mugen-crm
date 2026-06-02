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

            for (int scroll = 0; scroll < 15; scroll++) {
                page.evaluate("document.querySelector('div[role=\\'feed\\']')?.scrollBy(0, 3000)");
                page.waitForTimeout(2000);
            }

            page.waitForTimeout(2000);

            List<ElementHandle> cards = page.querySelectorAll("a[href*='/maps/place/']");
            int limit = Math.min(cards.size(), 60);
            for (int i = 0; i < limit; i++) {
                try {
                    Map<String, Object> item = extractListing(context, cards.get(i));
                    if (item != null) {
                        String ws = (String) item.get("website");
                        if (ws == null || ws.isBlank()) {
                            results.add(item);
                        }
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {
        } finally {
            if (context != null) context.close();
        }
        return results;
    }

    public Map<String, String> searchBusinessInfo(String query) {
        BrowserContext ctx = null;
        Page page = null;
        try {
            ctx = getBrowser().newContext(new Browser.NewContextOptions()
                .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .setViewportSize(1920, 1080));
            page = ctx.newPage();

            String url = "https://www.google.com/search?q=" + java.net.URLEncoder.encode(query + " phone website", "UTF-8");
            page.navigate(url, new Page.NavigateOptions().setTimeout(15000).setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
            page.waitForTimeout(2000);

            String html = page.content();

            Map<String, String> result = new java.util.LinkedHashMap<>();

            Pattern phonePattern = Pattern.compile("[\\(\\+]?\\d{1,4}[\\)\\-\\s]?\\d{3,4}[\\)\\-\\s]?\\d{3,4}[\\)\\-\\s]?\\d{3,4}");
            Matcher phoneMatcher = phonePattern.matcher(html);
            if (phoneMatcher.find()) {
                String p = phoneMatcher.group().trim();
                if (p.length() >= 10) result.put("phone", p);
            }

            List<ElementHandle> links = page.querySelectorAll("a[href]");
            for (ElementHandle link : links) {
                String href = link.getAttribute("href");
                if (href != null && href.startsWith("/url?q=") && !href.contains("google.com")
                    && !href.contains("facebook.com") && !href.contains("instagram.com")) {
                    String site = href.replace("/url?q=", "").split("&")[0];
                    if (site.startsWith("http") && !site.contains("webcache")) {
                        result.put("website", site);
                        break;
                    }
                }
            }

            return result;
        } catch (Exception e) {
            return new java.util.LinkedHashMap<>();
        } finally {
            if (page != null) page.close();
            if (ctx != null) ctx.close();
        }
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
