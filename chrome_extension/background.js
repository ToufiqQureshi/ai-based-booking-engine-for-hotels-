// Background Service Worker - Production Refactor v2.1
// Handles Rates Scraping, Review Sync, and Auto-Replies

console.log("[ServiceWorker] Loaded v2.1 (Review Management Added)");

// Configuration
const CONFIG = {
    SCRAPE_TIMEOUT_MS: 45000,
    TAB_DELAY_MS: 3000,

    // API Configuration
    // API_BASE: "https://api.gadget4me.in/api/v1", // Production
    API_BASE: "http://127.0.0.1:8001/api/v1", // Development

    ENDPOINTS: {
        RATES_INGEST: "/competitors/rates/ingest",
        REVIEWS_INGEST: "/reviews/ingest",
        JOBS_PENDING: "/reviews/jobs/pending",
        JOB_RESULT: (id) => `/reviews/jobs/${id}/result`
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
    chrome.alarms.create("SYNC_REVIEWS", { periodInMinutes: 60 });
    chrome.alarms.create("POLL_JOBS", { periodInMinutes: 2 });
    console.log("[Alarms] Registered SYNC_REVIEWS (60m) and POLL_JOBS (2m)");
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
    if (alarm.name === "SYNC_REVIEWS") {
        // Trigger generic scrape for reviews on known platforms
        // For MVP, we scrape MMT if URL is known or hardcoded
        // Ideally, fetch 'Competitors' from backend to get URLs.
        // For now, assuming user triggers via UI or we use a stored URL.
        // We'll skip auto-sync if we don't have URLs.
    }
    if (alarm.name === "POLL_JOBS") {
        pollReplyJobs();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Handle New Job Request
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

    // 2. Handle Manual Review Scrape
    if (request.action === "START_REVIEW_SYNC") {
        if (request.token) {
            state.authToken = request.token;
            chrome.storage.local.set({ auth_token: request.token });
        }
        state.queue.push({
            type: 'REVIEW_SCRAPE',
            url: "https://www.makemytrip.com/hotels/hotel-details", // Placeholder or passed in data
            ...request.data
        });
        processQueue();
        sendResponse({ status: "QUEUED" });
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
            else if (job.type === 'REVIEW_SCRAPE') {
                const result = await executeReviewScrapeJob(job);
                if (result && !result.error) await sendToBackend(result, CONFIG.ENDPOINTS.REVIEWS_INGEST);
            }
            else if (job.type === 'REPLY') {
                await executeReplyJob(job);
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
            if (tabId) chrome.tabs.remove(tabId).catch(() => {});
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

        let targetUrl = comp.url;
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

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

// 2. Review Scrape
function executeReviewScrapeJob(job) {
    return new Promise((resolve) => {
        let tabId = null;
        let isResolved = false;

        const cleanup = () => {
            chrome.runtime.onMessage.removeListener(onMsg);
            if (tabId) chrome.tabs.remove(tabId).catch(() => {});
        };

        const finish = (data) => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            resolve(data);
        };

        const onMsg = (msg, sender) => {
            if (sender.tab && sender.tab.id === tabId && msg.success) {
                finish(msg.reviews);
            } else if (sender.tab && sender.tab.id === tabId && msg.error) {
                 finish({ error: msg.error });
            }
        };

        setTimeout(() => finish({ error: "TIMEOUT" }), CONFIG.SCRAPE_TIMEOUT_MS);
        chrome.runtime.onMessage.addListener(onMsg);

        chrome.tabs.create({ url: job.url, active: false }, (tab) => {
            tabId = tab.id;
            chrome.tabs.onUpdated.addListener(function listener(tid, info) {
                if (tid === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    // Content script is auto-injected. Just send message.
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, { action: "SCRAPE_REVIEWS" }, (resp) => {
                            if (chrome.runtime.lastError) console.warn("Msg Failed", chrome.runtime.lastError);
                             // Response handled by onMsg or callback
                             if (resp) onMsg(resp, { tab: tab });
                        });
                    }, 5000); // Wait for dynamic load
                }
            });
        });
    });
}

// 3. Reply Execution
function executeReplyJob(job) {
    return new Promise((resolve) => {
        let tabId = null;
        let isResolved = false;

        const cleanup = () => {
             if (tabId) chrome.tabs.remove(tabId).catch(() => {});
        };

        const report = async (status, msg) => {
            if (isResolved) return;
            isResolved = true;

            // Send Result to Backend
            try {
                const url = CONFIG.API_BASE + CONFIG.ENDPOINTS.JOB_RESULT(job.id);
                await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.authToken}`
                    },
                    body: JSON.stringify({ status: status, message: msg })
                });
            } catch (e) { console.error("Failed to report job result", e); }

            cleanup();
            resolve();
        };

        // Determine URL (Assuming job has review URL or we use a generic one and search)
        // For MMT, we usually need the hotel page.
        // If we don't have deep link, this is hard.
        // Assuming job has 'source_url' or similar.
        // If not, we fall back to a known URL (e.g. from the job data).
        // The job object comes from 'Review' model. It should have the URL of the competitor/hotel.
        // But Review model doesn't store URL directly, just 'source'.
        // We need the URL.
        // Hack: We assume the user is logged into MMT/Agoda Extranet or we use the public page.
        // If public page, we need the URL.
        // For this MVP, let's assume `job.url` is populated (maybe we add it to model later or pass it).

        // Use review_url if available, else fallback to generic logic (or job.url if passed separately)
        const targetUrl = job.review_url || job.url || "https://www.makemytrip.com/hotels/hotel-details-page";

        if (!targetUrl.startsWith('http')) {
             report("failure", "Invalid URL: " + targetUrl);
             return;
        }

        chrome.tabs.create({ url: targetUrl, active: true }, (tab) => {
            tabId = tab.id;
            chrome.tabs.onUpdated.addListener(function listener(tid, info) {
                if (tid === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);

                    // Wait for render
                    setTimeout(() => {
                        // 1. Scroll to Review
                        // 2. Click Reply
                        // 3. Paste
                        // 4. Submit
                        // We send a complex command to content script
                        chrome.tabs.sendMessage(tabId, {
                            action: "EXECUTE_REPLY",
                            guest_name: job.guest_name,
                            reply_text: job.ai_reply_draft
                        }, (resp) => {
                            if (chrome.runtime.lastError) {
                                report("failure", "Communication Error: " + chrome.runtime.lastError.message);
                            } else if (resp && resp.success) {
                                report("success", "Replied successfully");
                            } else {
                                report("failure", resp ? resp.error : "Unknown Error");
                            }
                        });
                    }, 8000);
                }
            });
        });

        // Timeout
        setTimeout(() => report("failure", "Timeout"), 60000);
    });
}

// =============================================================================
// Helpers
// =============================================================================
async function pollReplyJobs() {
    if (!state.authToken) return;

    try {
        const url = CONFIG.API_BASE + CONFIG.ENDPOINTS.JOBS_PENDING;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${state.authToken}` }
        });
        if (res.ok) {
            const jobs = await res.json();
            if (jobs.length > 0) {
                console.log(`[Poller] Found ${jobs.length} reply jobs`);
                for (const job of jobs) {
                    state.queue.push({ type: 'REPLY', ...job });
                }
                processQueue();
            }
        }
    } catch (e) {
        console.error("[Poller] Failed", e);
    }
}

async function sendToBackend(data, endpoint) {
    try {
        const url = CONFIG.API_BASE + endpoint;
        const headers = { "Content-Type": "application/json" };
        if (state.authToken) headers["Authorization"] = `Bearer ${state.authToken}`;

        // Unify payload format if needed. ingest expects list.
        const body = Array.isArray(data) ? data : [data];

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
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
