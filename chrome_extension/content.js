// Content.js - Rate Scraping Trigger Only
// Robust Production Version v2.2

console.log("[HotelierHub] Content Script Loaded (Rates Only Mode)");

const ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
    "https://app.gadget4me.in"
];

// 1. From React App (Dashboard Sync Button)
window.addEventListener("INITIATE_SCRAPE", (event) => {
    console.log("[Content] INITIATE_SCRAPE received from:", window.location.origin);
    console.log("[Content] Event Data:", event.detail);

    // Allow all origins for debugging (or uncomment check for production)
    // if (!ALLOWED_ORIGINS.includes(window.location.origin)) return; 

    chrome.runtime.sendMessage({
        action: "START_SCRAPE",
        data: event.detail.jobs,
        token: event.detail.token
    }, (response) => {
        console.log("[Content] Background Response:", response);
        if (chrome.runtime.lastError) {
            console.error("[Content] Messaging Error:", chrome.runtime.lastError);
        }
    });
});
