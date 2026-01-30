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
// Listen for direct commands from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SCRAPE_REVIEWS") {
        console.log("[Content] Scraping Reviews...");
        let reviews = [];

        // MMT Precise Selectors
        const mmtItems = document.querySelectorAll('.userRvs__item');
        if (mmtItems.length > 0) {
            mmtItems.forEach(item => {
                const textEl = item.querySelector('.reviewText') || item.querySelector('.userReviewComment');
                const guestEl = item.querySelector('.userRvs__rvdtlPoints.titText');
                const ratingEl = item.querySelector('.userRvs__rtng');
                const titleEl = item.querySelector('.userRvs__itemHdr p');
                const dateEl = item.querySelector('.userRvs__itemHdr + span') || item.querySelector('.userRvs__rvdtl');
                // Note: date selector is tricky, just grabbing text if possible

                if (textEl && textEl.innerText.length > 5) {
                    reviews.push({
                        guest_name: guestEl ? guestEl.innerText : "Guest",
                        rating: ratingEl ? parseFloat(ratingEl.innerText) : 0,
                        review_text: textEl.innerText.trim(),
                        source: "MMT",
                        review_date: dateEl ? dateEl.innerText : new Date().toISOString()
                    });
                }
            });
        }

        // Generic Fallback
        if (reviews.length === 0) {
            const paragraphs = document.querySelectorAll('p, div');
            paragraphs.forEach(p => {
                const text = p.innerText || "";
                if (text.length > 50 && text.length < 1000 && (text.includes("hotel") || text.includes("stay"))) {
                    reviews.push({
                        guest_name: "Unknown Guest",
                        rating: 0,
                        review_text: text.trim(),
                        source: "Generic",
                        review_date: new Date().toISOString()
                    });
                }
            });
        }

        const topReviews = reviews.slice(0, 10); // Limit to top 10

        if (topReviews.length === 0) {
            sendResponse({ success: false, error: "No reviews found." });
        } else {
            sendResponse({ success: true, reviews: topReviews, url: window.location.href });
        }
    }

    if (request.action === "PASTE_REPLY") {
        console.log("[Content] Pasting Reply...");
        const replyText = request.text;

        // Strategy 1: Active Element (If user clicked textarea)
        let activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.contentEditable === 'true')) {
            if (activeEl.tagName === 'TEXTAREA') activeEl.value = replyText;
            else activeEl.innerText = replyText;
            sendResponse({ success: true, method: "active_element" });
            return;
        }

        // Strategy 2: Find first visible textarea
        const textareas = document.querySelectorAll('textarea');
        for (let ta of textareas) {
            if (ta.offsetParent !== null) { // Visible check
                ta.value = replyText;
                ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ta.focus();
                sendResponse({ success: true, method: "found_textarea" });
                return;
            }
        }

        sendResponse({ success: false, error: "No reply box found. Please click inside the reply box first." });
    }
    return true;
});
