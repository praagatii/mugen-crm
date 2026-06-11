package com.mugencrm.lead;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.WaitUntilState;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.net.URLDecoder;
import java.util.*;

@Service
public class ScraperService {

    private static final int EXTRACT_TIMEOUT_MS = 25000;
    private static final int MAX_RETRIES = 2;
    private Playwright playwright;
    private Browser browser;

    private synchronized Browser getBrowser() {
        if (browser == null) {
            playwright = Playwright.create();
            browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(true)
                .setArgs(List.of(
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-gpu",
                    "--disable-dev-shm-usage"
                )));
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

            page.addInitScript("() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); }");
            page.addInitScript("() => { window.chrome = { runtime: {} }; }");

            dismissPopups(page);

            String url = "https://www.google.com/maps/search/" + URLEncoder.encode(query, "UTF-8");
            navigateWithRetry(page, url, 30000);

            try {
                page.waitForSelector("div[role='feed']", new Page.WaitForSelectorOptions().setTimeout(15000));
            } catch (Exception ignored) {}

            int scrolls = Math.min(maxResults / 3 + 2, 12);
            for (int scroll = 0; scroll < scrolls; scroll++) {
                page.evaluate("document.querySelector('div[role=\\'feed\\']')?.scrollBy(0, 5000)");
                page.waitForTimeout(600);
            }
            page.waitForTimeout(1000);

            List<Map<String, Object>> results = extractFromCards(page, maxResults);
            System.out.println("[SCRAPER] Got " + results.size() + " card names");

            if (!results.isEmpty()) {
                enrichFromListingPages(context, results);
                System.out.println("[SCRAPER] Final: " + results.size() + " results");
            }

            return results;
        } catch (Exception e) {
            System.out.println("[SCRAPER] Error: " + e.getMessage());
            return new ArrayList<>();
        } finally {
            if (page != null) page.close();
            if (context != null) context.close();
        }
    }

    private List<Map<String, Object>> extractFromCards(Page page, int maxResults) {
        List<ElementHandle> cards = page.querySelectorAll("div[role='feed'] a[href*='/maps/place/']");
        List<Map<String, Object>> results = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (ElementHandle card : cards) {
            if (results.size() >= maxResults) break;
            try {
                String href = card.getAttribute("href");
                if (href == null || href.isBlank() || seen.contains(href)) continue;
                seen.add(href);

                String name = extractNameFromUrl(href);
                if (name.isBlank() || name.length() < 2) {
                    name = card.textContent().replaceAll("^[^\\p{Print}]+", "").trim();
                }

                String cleanHref = href.contains("?") ? href.substring(0, href.indexOf("?")) : href;

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", name);
                item.put("link", cleanHref);
                results.add(item);
            } catch (Exception ignored) {}
        }
        return results;
    }

    private void enrichFromListingPages(BrowserContext context, List<Map<String, Object>> results) {
        // Navigate sequentially to avoid Playwright context thread-safety issues
        for (int i = 0; i < results.size(); i++) {
            Map<String, Object> item = results.get(i);
            String link = (String) item.get("link");
            if (link != null) {
                scrapeListingDetails(context, item, link);
                if (i < results.size() - 1) try { Thread.sleep(500); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
        }
    }

    private void scrapeListingDetails(BrowserContext context, Map<String, Object> item, String href) {
        Page page = null;
        try {
            page = context.newPage();
            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    page.navigate(href, new Page.NavigateOptions()
                        .setTimeout(EXTRACT_TIMEOUT_MS)
                        .setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
                    break;
                } catch (Exception e) {
                    if (attempt == MAX_RETRIES) throw e;
                    Thread.sleep(500 * (long) Math.pow(2, attempt));
                }
            }
            page.waitForTimeout(3000);

            String html = page.content();
            Document doc = Jsoup.parse(html);

            String address = extractAddress(doc);
            if (address != null && !address.isBlank()) item.put("address", address);

            String phone = extractPhone(doc);
            if (phone != null && !phone.isBlank()) item.put("phone", phone);

            String website = extractWebsite(doc);
            if (website != null && !website.isBlank()) item.put("website", website);

        } catch (Exception e) {
            System.out.println("[SCRAPER] Listing failed: " + e.getMessage());
        } finally {
            if (page != null) page.close();
        }
    }

    private String extractAddress(Document doc) {
        Element btn = doc.selectFirst("button[data-item-id*='address']");
        if (btn != null) {
            String dataId = btn.attr("data-item-id");
            if (dataId.startsWith("address:")) return cleanAddress(dataId.replace("address:", "").trim());
        }
        Element el = doc.selectFirst("[data-item-id*='address']");
        if (el != null) {
            String dataId = el.attr("data-item-id");
            if (dataId.startsWith("address:")) return cleanAddress(dataId.replace("address:", "").trim());
            String t = el.text();
            if (!t.isBlank()) return cleanAddress(t.trim());
        }
        for (Element e : doc.select("button")) {
            String dataId = e.attr("data-item-id");
            if (dataId.startsWith("address:")) return cleanAddress(dataId.replace("address:", "").trim());
        }
        return null;
    }

    private String cleanAddress(String addr) {
        if (addr == null) return null;
        return addr.replaceAll("[^\\p{Print}\\p{Space}]", "").trim();
    }

    private String extractPhone(Document doc) {
        Element btn = doc.selectFirst("button[data-item-id*='phone']");
        if (btn != null) {
            String dataId = btn.attr("data-item-id");
            if (dataId.startsWith("phone:tel:")) return dataId.replace("phone:tel:", "").trim();
        }
        Element a = doc.selectFirst("a[href^='tel:']");
        if (a != null) {
            String h = a.attr("href");
            if (h.startsWith("tel:")) return h.substring(4).trim();
        }
        for (Element e : doc.select("button, a, div")) {
            String dataId = e.attr("data-item-id");
            if (dataId.startsWith("phone:tel:")) return dataId.replace("phone:tel:", "").trim();
        }
        return null;
    }

    private String extractWebsite(Document doc) {
        Element a = doc.selectFirst("a[data-item-id*='website']");
        if (a != null) {
            String href = a.attr("href");
            if (href.startsWith("http")) return href;
        }
        a = doc.selectFirst("a[aria-label*='website' i]");
        if (a != null) {
            String href = a.attr("href");
            if (href.startsWith("http")) return href;
        }
        Element btn = doc.selectFirst("button[data-item-id*='website']");
        if (btn != null) {
            String d = btn.attr("data-item-id");
            int i = d.indexOf("http");
            if (i >= 0) return d.substring(i).trim();
        }
        for (Element link : doc.select("a[href^='http']")) {
            String href = link.attr("href");
            String text = link.text().toLowerCase();
            if (text.contains("website")) return href;
        }
        for (Element link : doc.select("a[href^='http']")) {
            String href = link.attr("href");
            if (href.contains("google.com") || href.contains("goo.gl")) continue;
            if (href.contains("//")) {
                String domain = href.substring(href.indexOf("//") + 2).split("/")[0];
                if (domain.contains(".") && !domain.endsWith(".google")) return href;
            }
        }
        return null;
    }

    private String extractNameFromUrl(String href) {
        try {
            String path = href.contains("/maps/place/") ? href.substring(href.indexOf("/maps/place/") + 12) : "";
            int slash = path.indexOf('/');
            if (slash > 0) path = path.substring(0, slash);
            path = java.net.URLDecoder.decode(path, "UTF-8").replace('+', ' ').trim();
            int atIdx = path.indexOf('@');
            if (atIdx > 0) path = path.substring(0, atIdx).trim();
            int dataIdx = path.indexOf("data=");
            if (dataIdx > 0) path = path.substring(0, dataIdx).trim();
            return path;
        } catch (Exception ignored) {}
        return "";
    }

    private void dismissPopups(Page page) {
        try {
            page.waitForSelector("button:has-text('Accept all'), button:has-text('Reject all'), button:has-text('Accept')", new Page.WaitForSelectorOptions().setTimeout(3000));
            ElementHandle btn = page.querySelector("button:has-text('Accept all'), button:has-text('Reject all'), button:has-text('Accept')");
            if (btn != null) { btn.click(); page.waitForTimeout(500); }
        } catch (Exception ignored) {}
    }

    private void navigateWithRetry(Page page, String url, int timeoutMs) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                page.navigate(url, new Page.NavigateOptions()
                    .setTimeout(timeoutMs)
                    .setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
                return;
            } catch (Exception e) {
                if (attempt == 3) throw e;
                try { Thread.sleep(500 * (long) Math.pow(2, attempt - 1)); }
                catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException(ie); }
            }
        }
    }
}
