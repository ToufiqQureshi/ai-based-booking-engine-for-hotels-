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


// === Auto-Reply Logic handling (Outside Listener) ===
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get('auto_reply') === 'true') {
    const replyText = urlParams.get('reply_text');
    const guestName = urlParams.get('guest_name');

    console.log(`[Content] Auto-Reply detected for ${guestName}. Waiting for page load...`);

    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:10px;right:10px;z-index:9999;background:#000;color:#fff;padding:10px;border-radius:5px;";
    overlay.innerText = `Hotelier Hub: Replying to ${guestName}...`;
    document.body.appendChild(overlay);

    setTimeout(() => {
        attemptAutoReply(replyText, guestName);
    }, 5000);
}

function attemptAutoReply(text, guestName) {
    const mmtItems = document.querySelectorAll('.userRvs__item');
    let targetItem = null;

    mmtItems.forEach(item => {
        const guestEl = item.querySelector('.userRvs__rvdtlPoints.titText') || item.querySelector('.userRvs__userName');
        if (guestEl && guestEl.innerText.includes(guestName)) {
            targetItem = item;
        }
    });

    if (!targetItem) {
        document.querySelector('div[style*="Hotelier Hub"]').innerText = `❌ Review by ${guestName} not found on this page.`;
        return;
    }

    const buttons = targetItem.querySelectorAll('span, p, a, button');
    let replyBtn = null;
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase().includes('reply')) {
            replyBtn = btn;
        }
    });

    if (replyBtn) {
        replyBtn.click();

        setTimeout(() => {
            const textarea = targetItem.querySelector('textarea');
            if (textarea) {
                textarea.value = text;
                textarea.focus();
                document.querySelector('div[style*="Hotelier Hub"]').innerText = "✅ Draft Pasted! Please Review & Submit.";
                textarea.style.border = "2px solid green";
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                document.querySelector('div[style*="Hotelier Hub"]').innerText = "❌ Reply Box did not open.";
            }
        }, 1000);

    } else {
        document.querySelector('div[style*="Hotelier Hub"]').innerText = "❌ 'Reply' button not found (Already replied?).";
    }
}

// === Auto-Scrape Logic ===
if (urlParams.get('auto_scrape') === 'true') {
    console.log("[Content] Auto-Scrape detected. Waiting for page load...");

    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:10px;right:10px;z-index:9999;background:#000;color:#fff;padding:10px;border-radius:5px;";
    overlay.innerText = "Hotelier Hub: Auto-Syncing Reviews...";
    document.body.appendChild(overlay);

    setTimeout(() => {
        chrome.runtime.sendMessage({ action: "SCRAPE_REVIEWS" }, (response) => {
            scrapeAndSend();
        });
    }, 5000);
}

function scrapeAndSend() {
    console.log("[Content] Scraping Reviews (Auto)...");
    let reviews = [];

    const mmtItems = document.querySelectorAll('.userRvs__item');
    if (mmtItems.length > 0) {
        mmtItems.forEach(item => {
            const textEl = item.querySelector('.reviewText') || item.querySelector('.userReviewComment');
            const guestEl = item.querySelector('.userRvs__rvdtlPoints.titText');
            const ratingEl = item.querySelector('.userRvs__rtng');
            const dateEl = item.querySelector('.userRvs__itemHdr + span') || item.querySelector('.userRvs__rvdtl');

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

    const topReviews = reviews.slice(0, 10);

    if (topReviews.length > 0) {
        fetch("http://127.0.0.1:8001/api/v1/reviews/ingest", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(topReviews)
        }).then(res => {
            if (res.ok) {
                const overlay = document.querySelector('div[style*="Hotelier Hub"]');
                if (overlay) overlay.innerText = "Sync Complete! Closing in 3s...";
                setTimeout(() => window.close(), 3000);
            }
        }).catch(err => {
            console.error(err);
            const overlay = document.querySelector('div[style*="Hotelier Hub"]');
            if (overlay) overlay.innerText = "Sync Failed. Check console.";
        });
    } else {
        const overlay = document.querySelector('div[style*="Hotelier Hub"]');
        if (overlay) overlay.innerText = "No Reviews Found.";
    }
}
