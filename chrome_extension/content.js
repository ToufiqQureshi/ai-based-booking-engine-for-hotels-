// Content.js - Robust Production Version
// Implements Strategy Pattern for Multi-Platform Support

console.log("[HotelierHub] Content Script Loaded v2.1");

const ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
    "https://app.gadget4me.in"
];

// =============================================================================
// Strategy Interface & Implementation
// =============================================================================
class ReviewStrategy {
    canHandle() { return false; }
    scrape() { return []; }
    async reply(guestName, text) { throw new Error("Not implemented"); }
}

class MMTStrategy extends ReviewStrategy {
    canHandle() {
        return window.location.href.includes("makemytrip.com");
    }

    scrape() {
        console.log("[MMT] Starting Scrape...");
        const reviews = [];
        const items = document.querySelectorAll('.userRvs__item'); // Primary Selector

        if (items.length === 0) {
            console.warn("[MMT] No review items found using primary selector.");
            return [];
        }

        items.forEach(item => {
            try {
                // 1. Extract Text
                const textEl = item.querySelector('.reviewText') || item.querySelector('.userReviewComment');
                const text = textEl ? textEl.innerText.trim() : "";

                // 2. Extract Guest
                const guestEl = item.querySelector('.userRvs__rvdtlPoints.titText') || item.querySelector('.userRvs__userName');
                const guestName = guestEl ? guestEl.innerText.trim() : "Guest";

                // 3. Extract Rating
                const ratingEl = item.querySelector('.userRvs__rtng');
                const rating = ratingEl ? parseFloat(ratingEl.innerText) : 0;

                // 4. Extract Date (Robust)
                let reviewDate = "Unknown Date";
                const spans = Array.from(item.querySelectorAll('span'));
                const monthLabel = spans.find(el => el.innerText.includes('Travel Month:'));
                if (monthLabel && monthLabel.nextElementSibling) {
                    reviewDate = monthLabel.nextElementSibling.innerText.trim();
                }

                // 5. Check Reply Status
                const replyEl = item.querySelector('.replyMsg');
                const isReplied = !!replyEl;

                if (text.length > 5) {
                    reviews.push({
                        guest_name: guestName,
                        rating: rating,
                        review_text: text,
                        source: "MMT",
                        review_date: reviewDate,
                        review_url: window.location.href,
                        status: isReplied ? "REPLIED" : "PENDING"
                    });
                }
            } catch (e) {
                console.error("[MMT] Failed to parse item", e);
            }
        });

        return reviews;
    }

    async reply(guestName, text) {
        console.log(`[MMT] Attempting reply to ${guestName}`);

        // 1. Find Review
        const items = Array.from(document.querySelectorAll('.userRvs__item'));
        const targetItem = items.find(item => {
             const guestEl = item.querySelector('.userRvs__rvdtlPoints.titText') || item.querySelector('.userRvs__userName');
             return guestEl && guestEl.innerText.includes(guestName);
        });

        if (!targetItem) throw new Error("Review not found on page");

        // 2. Safety Check
        if (targetItem.innerText.includes("Response from Property") || targetItem.querySelector('.replyMsg')) {
            throw new Error("Already Replied (Safety Lock)");
        }

        // 3. Open Reply Box
        const buttons = Array.from(targetItem.querySelectorAll('span, p, a, button'));
        const replyBtn = buttons.find(b => b.innerText.toLowerCase().includes('reply'));

        if (!replyBtn) throw new Error("Reply button not found");
        replyBtn.click();

        // 4. Wait & Paste
        await this.wait(500);
        const textarea = targetItem.querySelector('textarea');
        if (!textarea) throw new Error("Reply textarea did not open");

        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true })); // Trigger React/Framework events

        // 5. Submit (Auto or Manual?)
        // Requirement: "Paste & Submit"
        const submitBtn = Array.from(targetItem.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('post'));
        if (submitBtn) {
            submitBtn.click();
            return { success: true, method: "AUTO_SUBMIT" };
        } else {
             return { success: true, method: "PASTE_ONLY" };
        }
    }

    wait(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ... Other strategies (Agoda, Generic) can be added here ...

function getStrategy() {
    if (window.location.href.includes("makemytrip")) return new MMTStrategy();
    return null;
}

// =============================================================================
// Event Listeners
// =============================================================================

// 1. From React App (Frontend)
window.addEventListener("INITIATE_SCRAPE", (event) => {
    if (!ALLOWED_ORIGINS.includes(window.location.origin)) return;
    chrome.runtime.sendMessage({
        action: "START_SCRAPE",
        data: event.detail.jobs,
        token: event.detail.token
    });
});

// 2. From Background Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const strategy = getStrategy();

    // A. Scrape Action
    if (request.action === "SCRAPE_REVIEWS") {
        if (!strategy) {
            sendResponse({ error: "No strategy for this site" });
            return;
        }
        const reviews = strategy.scrape();
        sendResponse({ success: true, reviews: reviews.slice(0, 15) });
    }

    // B. Execute Reply Action
    if (request.action === "EXECUTE_REPLY") {
        if (!strategy) {
            sendResponse({ error: "No strategy for this site" });
            return;
        }

        strategy.reply(request.guest_name, request.reply_text)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, error: err.message }));

        return true; // Async response
    }
});
