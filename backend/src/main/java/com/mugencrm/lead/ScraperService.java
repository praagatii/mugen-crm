package com.mugencrm.lead;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import com.microsoft.playwright.options.WaitUntilState;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ScraperService {

    private static final File LAYOUT_CACHE = new File("data/scraper_layout.json");
    private final ObjectMapper jsonMapper = new ObjectMapper();
    private Map<String, String> layoutCache;
    private Playwright playwright;
    private Browser browser;

    private synchronized Map<String, String> getLayout() {
        if (layoutCache != null) return layoutCache;
        layoutCache = new HashMap<>();
        if (LAYOUT_CACHE.exists()) {
            try { layoutCache = jsonMapper.readValue(LAYOUT_CACHE, Map.class); } catch (IOException ignored) {}
        }
        return layoutCache;
    }

    private synchronized void saveLayout() {
        try {
            LAYOUT_CACHE.getParentFile().mkdirs();
            jsonMapper.writerWithDefaultPrettyPrinter().writeValue(LAYOUT_CACHE, layoutCache);
        } catch (IOException ignored) {}
    }

    private synchronized String tryCached(String key, Document doc) {
        Map<String, String> layout = getLayout();
        String sel = layout.get(key);
        if (sel == null) return null;
        try {
            if (!doc.select(sel).isEmpty()) return sel;
        } catch (Exception ignored) {}
        return null;
    }

    private synchronized void learnSelector(String key, String selector) {
        getLayout().put(key, selector);
        saveLayout();
    }

    private synchronized Browser getBrowser() {
        if (browser == null) {
            playwright = Playwright.create();
            browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(true)
                .setArgs(List.of("--disable-blink-features=AutomationControlled")));
        }
        return browser;
    }

    public List<Map<String, Object>> scrapeGmaps(String query, int maxResults) {
        BrowserContext context = null;
        Page page = null;
        try {
            context = getBrowser().newContext(new Browser.NewContextOptions()
                .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .setViewportSize(1920, 1080));
            page = context.newPage();
            dismissPopups(page);

            String url = "https://www.google.com/maps/search/" + java.net.URLEncoder.encode(query, "UTF-8");
            navigateWithRetry(page, url, 30000);

            try {
                page.waitForSelector("div[role='feed']", new Page.WaitForSelectorOptions().setTimeout(15000));
            } catch (Exception ignored) {}

            int scrolls = Math.min(maxResults / 3 + 2, 12);
            for (int scroll = 0; scroll < scrolls; scroll++) {
                page.evaluate("document.querySelector('div[role=\\'feed\\']')?.scrollBy(0, 5000)");
                page.waitForTimeout(600);
            }
            page.waitForTimeout(500);

            List<ElementHandle> cards = page.querySelectorAll("div[role='feed'] a[href*='/maps/place/']");
            System.out.println("[SCRAPER] Found " + cards.size() + " cards in feed panel");

            Set<String> seenHrefs = new HashSet<>();
            List<String> listingHrefs = new ArrayList<>();
            Map<String, String> cardNames = new HashMap<>();
            int limit = Math.min(cards.size(), Math.max(maxResults, 1));
            for (int i = 0; i < limit; i++) {
                try {
                    String href = cards.get(i).getAttribute("href");
                    if (href != null && !href.isBlank() && !seenHrefs.contains(href)) {
                        seenHrefs.add(href);
                        listingHrefs.add(href);
                        String cn = cards.get(i).textContent().trim();
                        if (!cn.isBlank()) cardNames.put(href, cn.lines().findFirst().orElse("").trim());
                    }
                } catch (Exception ignored) {}
            }

            System.out.println("[SCRAPER] Fetching " + listingHrefs.size() + " listing pages");

            BrowserContext finalContext = context;
            Map<String, String> finalCardNames = cardNames;
            ExecutorService executor = Executors.newFixedThreadPool(4);
            List<Future<Map<String, Object>>> futures = new ArrayList<>();
            for (int i = 0; i < listingHrefs.size(); i++) {
                String href = listingHrefs.get(i);
                futures.add(executor.submit(() -> fetchListingDetails(finalContext, href, finalCardNames.get(href))));
                if (i % 4 == 3) try { Thread.sleep(800); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
            executor.shutdown();

            List<Map<String, Object>> results = new ArrayList<>();
            int failed = 0;
            for (Future<Map<String, Object>> f : futures) {
                try {
                    Map<String, Object> item = f.get();
                    if (item != null) {
                        String n = (String) item.get("name");
                        if (n != null && !n.isBlank()) {
                            results.add(item);
                        } else { failed++; }
                    } else { failed++; }
                } catch (Exception ignored) { failed++; }
            }
            System.out.println("[SCRAPER] Got " + results.size() + " results, " + failed + " failed");
            return results;
        } catch (Exception ignored) {
            return new ArrayList<>();
        } finally {
            if (page != null) page.close();
            if (context != null) context.close();
        }
    }

    private Map<String, Object> fetchListingDetails(BrowserContext context, String href, String cardName) {
        Page listingPage = null;
        try {
            listingPage = context.newPage();
            try {
                listingPage.navigate(href, new Page.NavigateOptions().setTimeout(10000).setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
            } catch (Exception ignored) {}
            try { listingPage.waitForSelector("h1, h2, [itemprop='name'], [data-item-id*='name'], .DUwDvf", new Page.WaitForSelectorOptions().setTimeout(3000)); } catch (Exception ignored) {}

            String html = listingPage.content();
            Document doc = Jsoup.parse(html);

            String name = extractName(doc);
            if (name.isBlank()) name = extractNameFromUrl(href);
            if (name.isBlank() && cardName != null) name = cardName;

            String phone = extractPhone(doc);
            String website = extractWebsite(doc);
            String address = extractAddressFromListing(doc);

            Double rating = null;
            try {
                Element rtEl = doc.selectFirst("div.fontBodyMedium span[aria-hidden='true'], div[role='feed'] ~ div span[aria-hidden='true']");
                if (rtEl != null) {
                    Matcher m = Pattern.compile("([\\d.]+)").matcher(rtEl.text());
                    if (m.find()) rating = Double.parseDouble(m.group(1));
                }
            } catch (Exception ignored) {}

            if (name.isBlank()) {
                System.out.println("[SCRAPER] Skipped listing (no name found): " + (href.length() > 80 ? href.substring(0, 80) + "..." : href));
                return null;
            }

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("name", name);
            map.put("phone", phone);
            map.put("website", website);
            map.put("address", address != null ? address : "");
            map.put("rating", rating);
            map.put("reviewCount", null);
            return map;
        } catch (Exception e) {
            return null;
        } finally {
            if (listingPage != null) listingPage.close();
        }
    }

    private String extractName(Document doc) {
        String cached = tryCached("name", doc);
        if (cached != null) {
            Element el = doc.selectFirst(cached);
            if (el != null) { String t = el.text(); if (!t.isBlank()) return t.trim(); }
        }
        String[] selectors = {".DUwDvf", "h1", "h2", "[itemprop='name']", "[data-item-id*='name']"};
        for (String sel : selectors) {
            Element el = doc.selectFirst(sel);
            if (el != null) { String t = el.text(); if (!t.isBlank()) { learnSelector("name", sel); return t.trim(); } }
        }
        for (Element h : doc.select("h1, h2, h3")) {
            String t = h.text();
            if (!t.isBlank() && t.length() > 2) { learnSelector("name", "h1"); return t.trim(); }
        }
        String title = doc.title();
        if (!title.isBlank()) {
            title = title.replace(" - Google Maps", "").replace("Google Maps", "").trim();
            if (!title.isEmpty()) { learnSelector("name", "h1"); return title; }
        }
        return "";
    }

    private String extractNameFromUrl(String href) {
        try {
            String path = href.contains("/maps/place/") ? href.substring(href.indexOf("/maps/place/") + 13) : "";
            int slash = path.indexOf('/');
            if (slash > 0) path = path.substring(0, slash);
            path = java.net.URLDecoder.decode(path, "UTF-8").replace('+', ' ').trim();
            int atIdx = path.indexOf('@');
            if (atIdx > 0) path = path.substring(0, atIdx).trim();
            int dataIdx = path.indexOf("data=");
            if (dataIdx > 0) path = path.substring(0, dataIdx).trim();
            if (!path.isBlank() && path.length() > 1) return path;
        } catch (Exception ignored) {}
        return "";
    }

    private void dismissPopups(Page page) {
        try {
            page.waitForSelector("button:has-text('Accept all'), button:has-text('Reject all'), button:has-text('Accept'), button[aria-label*='Accept']", new Page.WaitForSelectorOptions().setTimeout(3000));
            ElementHandle btn = page.querySelector("button:has-text('Accept all'), button:has-text('Reject all'), button:has-text('Accept'), button[aria-label*='Accept']");
            if (btn != null) { btn.click(); page.waitForTimeout(500); }
        } catch (Exception ignored) {}
    }

    private void navigateWithRetry(Page page, String url, int timeoutMs) {
        int maxAttempts = 3;
        int baseDelayMs = 500;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                page.navigate(url, new Page.NavigateOptions()
                    .setTimeout(timeoutMs)
                    .setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
                return;
            } catch (Exception e) {
                if (attempt == maxAttempts) throw e;
                try { Thread.sleep(baseDelayMs * (long)Math.pow(2, attempt - 1)); }
                catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException(ie); }
            }
        }
    }

    private String extractPhone(Document doc) {
        String cached = tryCached("phone", doc);
        if (cached != null) {
            Element el = doc.selectFirst(cached);
            if (el != null) {
                String dataId = el.attr("data-item-id");
                if (dataId.startsWith("phone:tel:")) return dataId.replace("phone:tel:", "").trim();
            }
        }
        Element btn = doc.selectFirst("button[data-item-id*='phone']");
        if (btn != null) {
            String dataId = btn.attr("data-item-id");
            if (dataId.startsWith("phone:tel:")) { learnSelector("phone", "button[data-item-id*='phone']"); return dataId.replace("phone:tel:", "").trim(); }
        }
        Element aTag = doc.selectFirst("a[href^='tel:']");
        if (aTag != null) { String h = aTag.attr("href"); if (h.startsWith("tel:")) { learnSelector("phone", "a[href^='tel:']"); return h.substring(4).trim(); } }
        return "";
    }

    private String extractWebsite(Document doc) {
        String cached = tryCached("website", doc);
        if (cached != null) {
            Element el = doc.selectFirst(cached);
            if (el != null) {
                if (cached.contains("button")) {
                    String d = el.attr("data-item-id"); int i = d.indexOf("http"); if (i != -1) return d.substring(i).trim();
                } else { String w = el.attr("href"); if (!w.isBlank()) return w; }
            }
        }
        Element siteBtn = doc.selectFirst("a[data-item-id*='website']");
        if (siteBtn != null) { String href = siteBtn.attr("href"); if (href.startsWith("http")) { learnSelector("website", "a[data-item-id*='website']"); return href; } }
        siteBtn = doc.selectFirst("a[aria-label*='Website' i]");
        if (siteBtn != null) { String href = siteBtn.attr("href"); if (href.startsWith("http")) { learnSelector("website", "a[aria-label*='Website' i]"); return href; } }
        siteBtn = doc.selectFirst("button[data-item-id*='website']");
        if (siteBtn != null) { String d = siteBtn.attr("data-item-id"); int i = d.indexOf("http"); if (i != -1) { learnSelector("website", "button[data-item-id*='website']"); return d.substring(i).trim(); } }

        for (Element link : doc.select("a[href^='http']")) {
            String href = link.attr("href");
            String label = link.attr("aria-label");
            if (label.toLowerCase().contains("website")) { learnSelector("website", "a[href^='http']"); return href; }
        }
        for (Element link : doc.select("a[href^='http']")) {
            String href = link.attr("href");
            String text = link.text().toLowerCase();
            if (text.contains("website")) { learnSelector("website", "a[href^='http']"); return href; }
        }
        for (Element link : doc.select("a[href^='http']")) {
            String href = link.attr("href");
            if (href.contains("google.com") || href.contains("goo.gl") || href.contains("youtube.com")
                || href.contains("facebook.com") || href.contains("instagram.com")
                || href.contains("twitter.com") || href.contains("linkedin.com")) continue;
            if (href.contains("//") && href.indexOf("//") + 2 < href.length()) {
                String domain = href.substring(href.indexOf("//") + 2).split("/")[0];
                if (domain.contains(".") && !domain.endsWith(".google")) { learnSelector("website", "a[href^='http']"); return href; }
            }
        }
        return "";
    }

    private String extractAddressFromListing(Document doc) {
        String cached = tryCached("address", doc);
        if (cached != null) {
            Element el = doc.selectFirst(cached);
            if (el != null) {
                String dataId = el.attr("data-item-id");
                if (dataId.startsWith("address:")) return dataId.replace("address:", "").trim();
                String t = el.text(); if (!t.isBlank()) return t.trim();
            }
        }
        Element btn = doc.selectFirst("button[data-item-id*='address']");
        if (btn != null) {
            String dataId = btn.attr("data-item-id");
            if (dataId.startsWith("address:")) { learnSelector("address", "button[data-item-id*='address']"); return dataId.replace("address:", "").trim(); }
        }
        Element addrEl = doc.selectFirst("button[data-item-id*='address'] + span, div[data-item-id*='address']");
        if (addrEl != null) { String t = addrEl.text(); if (!t.isBlank()) { learnSelector("address", "button[data-item-id*='address'] + span"); return t.trim(); } }
        Element el = doc.selectFirst("[itemprop='address'], [data-item-id*='address']");
        if (el != null) { String t = el.text(); if (!t.isBlank()) { learnSelector("address", "[itemprop='address']"); return t.trim(); } }

        String bodyText = doc.body().text();
        if (bodyText != null) {
            Pattern addrPattern = Pattern.compile("([A-Za-z0-9\\s,.-]+(?:Road|Street|St|Rd|Avenue|Ave|Nagar|Colony|Layout|Circle|Chowk|Square|Marg|Boulevard|Blvd|Lane|Ln|Sector|Phase)[,\\s]*[A-Za-z\\s]*(?:\\d{5,6})?)", Pattern.CASE_INSENSITIVE);
            Matcher m = addrPattern.matcher(bodyText);
            if (m.find()) { learnSelector("address", "[itemprop='address']"); return m.group(1).trim(); }
        }
        return null;
    }
}
