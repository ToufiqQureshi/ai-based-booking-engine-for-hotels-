// Content.js - Bridge between Hotelier Hub (React) and Extension

console.log("Hotelier Hub Content Script Loaded");

const ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
    "https://app.gadget4me.in"
];

// Listen for Event from React App
window.addEventListener("INITIATE_SCRAPE", (event) => {
    // Security Check: Verify Origin
    if (!ALLOWED_ORIGINS.includes(window.location.origin)) {
        console.warn("[Content Script] INITIATE_SCRAPE ignored from unauthorized origin:", window.location.origin);
        return;
    }

    console.log("[Content Script] Received INITIATE_SCRAPE event", event.detail);

    // Forward to Background Script
    chrome.runtime.sendMessage({
        action: "START_SCRAPE",
        data: event.detail.jobs, // Extract jobs
        token: event.detail.token // Extract token
    }, (response) => {
        console.log("[Content Script] Background response:", response);
    });
});
