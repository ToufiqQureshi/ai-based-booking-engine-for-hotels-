// Background Service Worker - Production Refactor v2.1
// Handles Rates Scraping, Review Sync, and Auto-Replies

console.log("[ServiceWorker] Loaded v2.2 (Rates Only)");

// Configuration
const CONFIG = {
    SCRAPE_TIMEOUT_MS: 45000,
    TAB_DELAY_MS: 3000,

    // API Configuration
    API_BASE: "https://api.gadget4me.in/api/v1",

    ENDPOINTS: {
        RATES_INGEST: "/competitors/rates/ingest"
    }
};

// Global State
const state = {
    queue: [],
    isProcessing: false,
    authToken: null
};

// Initialize Alarms
chrome.runtime.onInstalled.addListener(() => {
    // Only Rate Alarms if needed, or none
    console.log("[Alarms] Installed");
});

// Load Token from Storage on Startup
chrome.storage.local.get(['auth_token'], (result) => {
    if (result.auth_token) {
        state.authToken = result.auth_token;
        console.log("[Auth] Token restored from storage");
    }
});

// =============================================================================
// Message Handling & Alarms
// =============================================================================
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log(`[Alarm] Triggered: ${alarm.name}`);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Handle New Job Request (Rates)
    if (request.action === "START_SCRAPE") {
        console.log(`[Queue] Received ${request.data.length} jobs`);
        if (request.token) {
            state.authToken = request.token;
            chrome.storage.local.set({ auth_token: request.token });
        }

        // Normalize jobs
        const jobs = request.data.map(d => ({ ...d, type: 'RATE_SCRAPE' }));
        state.queue.push(...jobs);
        processQueue();
        sendResponse({ status: "QUEUED", count: state.queue.length });
    }
    return true;
});

// =============================================================================
// Queue Manager
// =============================================================================
async function processQueue() {
    if (state.isProcessing) return;
    state.isProcessing = true;

    console.log("[Queue] Processing Started");

    while (state.queue.length > 0) {
        const job = state.queue.shift();
        console.log(`[Job] Starting: ${job.type} - ${job.url || 'No URL'}`);

        try {
            if (job.type === 'RATE_SCRAPE') {
                const result = await executeRateScrapeJob(job);
                if (result && !result.error) await sendToBackend(result, CONFIG.ENDPOINTS.RATES_INGEST);
            }
        } catch (error) {
            console.error(`[Job] Critical Failure`, error);
        }

        await wait(CONFIG.TAB_DELAY_MS);
    }

    state.isProcessing = false;
    console.log("[Queue] All jobs completed");
}

// =============================================================================
// Job Executors
// =============================================================================

// 1. Rate Scrape (Legacy)
function executeRateScrapeJob(comp) {
    return new Promise((resolve) => {
        let tabId = null;
        let isResolved = false;

        const cleanup = () => {
            chrome.runtime.onMessage.removeListener(onMsg);
            if (tabId) chrome.tabs.remove(tabId).catch(() => { });
        };

        const finish = (data) => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            resolve(data);
        };

        const onMsg = (msg, sender) => {
            if (sender.tab && sender.tab.id === tabId && msg.action === "SCRAPE_RESULT") {
                finish((msg.data || []).map(r => ({ ...r, competitor_id: comp.id })));
            }
        };

        setTimeout(() => finish({ error: "TIMEOUT" }), CONFIG.SCRAPE_TIMEOUT_MS);
        chrome.runtime.onMessage.addListener(onMsg);

        if (!comp.url) {
            console.error("[Job] Missing URL for competitor", comp);
            finish({ error: "MISSING_URL" });
            return;
        }

        let targetUrl = comp.url;
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

        console.log(`[Job] Opening tab for: ${targetUrl}`);

        chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
            tabId = tab.id;
            chrome.tabs.onUpdated.addListener(function listener(tid, info) {
                if (tid === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ["scraper.js"] // or determine based on URL
                    }).catch(() => finish({ error: "INJECTION_FAILED" }));
                }
            });
        });
    });
}

// 2. Review Scrape & Reply Executors REMOVED

// =============================================================================
// Helpers
// =============================================================================
async function sendToBackend(data, endpoint) {
    try {
        const url = CONFIG.API_BASE + endpoint;
        const headers = { "Content-Type": "application/json" };
        if (state.authToken) headers["Authorization"] = `Bearer ${state.authToken}`;

        // Unify payload format if needed. ingest expects list.
        const body = Array.isArray(data) ? data : [data];

        // SPECIAL CASE: RateIngestRequest expects { rates: [...] }
        const finalBody = endpoint === CONFIG.ENDPOINTS.RATES_INGEST ? { rates: body } : body;

        console.log(`[API] Sending to ${endpoint}:`, JSON.stringify(finalBody));

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(finalBody)
        });
        if (!response.ok) console.warn(`[API] ${endpoint} returned ${response.status}`);
        else console.log(`[API] ${endpoint} Success`);
    } catch (e) {
        console.error(`[API] ${endpoint} Failed`, e);
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
