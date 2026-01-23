// Content.js - Bridge between Hotelier Hub (React) and Extension

console.log("Hotelier Hub Content Script Loaded");

// Listen for Event from React App
window.addEventListener("INITIATE_SCRAPE", (event) => {
    console.log("[Content Script] Received INITIATE_SCRAPE event", event.detail);

    // Forward to Background Script
    chrome.runtime.sendMessage({
        action: "START_SCRAPE",
        data: event.detail // Array of Competitors
    }, (response) => {
        console.log("[Content Script] Background response:", response);
    });
});
