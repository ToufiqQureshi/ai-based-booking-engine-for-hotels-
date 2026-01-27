// Background Service Worker - Production Refactor
// Handles safe orchestration of scraping jobs with strict cleanup policies

console.log("[ServiceWorker] Loaded v2.0 (Stable)");

// Configuration
const CONFIG = {
    SCRAPE_TIMEOUT_MS: 45000, // 45s hard limit per job
    TAB_DELAY_MS: 2000,       // Pause between jobs
    BACKEND_URL: "http://127.0.0.1:8001/api/v1/competitors/rates/ingest"
};

// Global State
const state = {
    queue: [],
    isProcessing: false,
    authToken: null
};

// =============================================================================
// Message Handling (Frontend -> Background context)
// =============================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Handle New Job Request from Hotelier Hub Frontend
    if (request.action === "START_SCRAPE") {
        console.log(`[Queue] Received ${request.data.length} jobs`);
        state.authToken = request.token; // Store token
        state.queue.push(...request.data);
        processQueue(); // Fire and forget
        sendResponse({ status: "QUEUED", count: state.queue.length });
    }
    // Return true here if we intended to sendResponse asynchronously
});

// =============================================================================
// Queue Manager
// =============================================================================
async function processQueue() {
    if (state.isProcessing) return; // Mutex lock
    state.isProcessing = true;

    console.log("[Queue] Processing Started");

    while (state.queue.length > 0) {
        const job = state.queue.shift(); // FIFO
        console.log(`[Job] Starting: ${job.name} (${job.url})`);

        try {
            const result = await executeScrapeJob(job);
            if (result && !result.error && result.length > 0) {
                await sendToBackend(result);
            } else {
                console.warn(`[Job] No valid data for ${job.name}`, result);
            }
        } catch (error) {
            console.error(`[Job] Critical Failure: ${job.name}`, error);
        }

        // Polite delay to prevent rate-limiting or browser lockup
        await wait(CONFIG.TAB_DELAY_MS);
    }

    state.isProcessing = false;
    console.log("[Queue] All jobs completed");
}

// =============================================================================
// Core Scraping Logic (The "Job")
// =============================================================================
function executeScrapeJob(comp) {
    return new Promise((resolve) => {
        let tabId = null;
        let timer = null;
        let isResolved = false;

        // --- Cleanup Helper ---
        // Critical: Removes all listeners and partial state to prevent leaks
        const cleanup = () => {
            if (timer) clearTimeout(timer);
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            chrome.runtime.onMessage.removeListener(onScrapeMessage);

            // Close tab if it exists
            if (tabId) {
                chrome.tabs.remove(tabId).catch(() => { /* Maintain silence on closed tabs */ });
            }
        };

        // --- Final Resolver ---
        // Ensures we only resolve the Promise ONCE
        const finish = (data) => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            resolve(data);
        };

        // --- 1. Timeout Handler ---
        timer = setTimeout(() => {
            console.error(`[Job] Timeout (${CONFIG.SCRAPE_TIMEOUT_MS}ms) for ${comp.name}`);
            finish({ error: "TIMEOUT" });
        }, CONFIG.SCRAPE_TIMEOUT_MS);

        // --- 2. Message Handler (Scraper -> Background) ---
        const onScrapeMessage = (msg, sender) => {
            // Verify origin matching (Must be from OUR tab and OUR action)
            if (sender.tab && sender.tab.id === tabId && msg.action === "SCRAPE_RESULT") {
                console.log(`[Job] Data received for ${comp.name}`);

                // tag data with ID
                const taggedData = (msg.data || []).map(r => ({
                    ...r,
                    competitor_id: comp.id
                }));

                finish(taggedData);
            }
        };

        // --- 3. Tab Status Handler (Injection Trigger) ---
        const onTabUpdated = (tid, changeInfo, tab) => {
            if (tid === tabId && changeInfo.status === 'complete') {
                // Remove self immediately to prevent double injection
                chrome.tabs.onUpdated.removeListener(onTabUpdated);

                // Detect correct script
                const url = tab.url || "";
                let scriptFile = "scraper.js"; // Default
                if (url.includes("agoda.com")) scriptFile = "agoda_scraper.js";

                console.log(`[Job] Injecting ${scriptFile} into tab ${tabId}`);

                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: [scriptFile]
                }).catch(err => {
                    console.error("[Job] Injection Failed", err);
                    finish({ error: "INJECTION_FAILED" });
                });
            }
        };

        // --- Execution Start ---

        // Listeners MUST be attached before creating tab to catch early events
        chrome.runtime.onMessage.addListener(onScrapeMessage);
        chrome.tabs.onUpdated.addListener(onTabUpdated);

        // Normalize URL
        let targetUrl = comp.url;
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

        chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("[Job] Tab Creation Failed", chrome.runtime.lastError);
                finish({ error: "TAB_FAILED" });
                return;
            }
            tabId = tab.id;
        });
    });
}

// =============================================================================
// API Utilities
// =============================================================================
async function sendToBackend(payload) {
    try {
        console.log(`[API] Sending ${payload.length} rates`);

        const headers = { "Content-Type": "application/json" };
        if (state.authToken) headers["Authorization"] = `Bearer ${state.authToken}`;

        const response = await fetch(CONFIG.BACKEND_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ rates: payload })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        console.log("[API] Success");

    } catch (e) {
        console.error("[API] Upload Failed", e);
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
