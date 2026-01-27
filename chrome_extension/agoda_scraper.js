// Agoda-specific scraper
// Handles Agoda.com DOM structure which is different from MakeMyTrip

console.log("[Agoda Scraper] Loaded v4 - Fallback Mode");

// Parse check-in date from Agoda URL
function getCheckinDateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let checkinDate = new Date().toISOString().split('T')[0];

    // Agoda uses 'checkIn' parameter in YYYY-MM-DD format
    const checkinStr = urlParams.get('checkIn');
    if (checkinStr && checkinStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        checkinDate = checkinStr;
    }

    return checkinDate;
}

// Extract price from Agoda's specific HTML structure
function scrapeAgodaData() {
    let price = 0;
    let roomName = "Standard Room";
    let isSoldOut = false;

    // Agoda has multiple layouts. Try multiple selectors.
    const priceSelectors = [
        '.StickyNavPrice__priceDetail', // Layout 1 (Sticky Header)
        '[data-selenium="hotel-price"]', // Layout 2 (Standard)
        '[data-selenium="display-price"]', // NEW: Verified Price Element
        '.PropertyCardPrice__Value', // NEW: Verified Price Element
        '.pd-price__price-value', // Layout 3
        '.PriceContainer', // Layout 4
        '#pd-price-section', // Layout 5
        '.CheapestPriceLabel', // Layout 6
        '[data-element-name="property-price"]', // Layout 7
        '.Cross SalePrice', // Layout 8
        '.Box-sc-kv6pi1-0.hRUYUu' // Generic Flex container often used for price
    ];

    let foundPriceText = "";

    let scope = document;

    // CRITICAL: Scoping to First Hotel Only (for List Pages)
    // If we are on a search result list, only look at the FIRST card.
    // Otherwise, if Hotel 1 is sold out (no price), we might grab Hotel 2's price.
    const firstCard = document.querySelector('[data-selenium="hotel-item"], .PropertyCard, [data-component="property-card"]');
    if (firstCard) {
        console.log("[Agoda] Detected List View - Scoping to First Card");
        scope = firstCard;
    }

    // 1. Try Specific Selectors
    for (let selector of priceSelectors) {
        const els = scope.querySelectorAll(selector);
        for (let el of els) {
            if (el.offsetParent === null) continue; // Skip hidden elements

            foundPriceText = el.textContent.trim();
            // Try to extract number
            const numMatch = foundPriceText.match(/[\d,]+\.?\d*/);
            if (numMatch) {
                const cleanPrice = numMatch[0].replace(/,/g, '');
                const parsedPrice = parseFloat(cleanPrice);
                if (!isNaN(parsedPrice) && parsedPrice > 100) {
                    price = parsedPrice;
                    console.log(`[Agoda] Found price element via ${selector}: ${parsedPrice}`);
                    break;
                }
            }
        }
        if (price > 0) break;
    }

    // 2. Fallback: Search for "Rs." text pattern in specific containers if still 0
    if (price === 0) {
        // REMOVED 'body' and '#SearchBoxContainer' to avoid False Positives (finding prices of OTHER hotels in footer/ads)
        const containerSelectors = ['.StickyHeader', '.PropertyHeader'];
        for (let containerSel of containerSelectors) {
            const container = scope.querySelector(containerSel);
            if (!container) continue;

            // Look for text nodes containing "Rs." or "INR" followed by numbers
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            while (walker.nextNode()) {
                const text = walker.currentNode.nodeValue;
                // Matches "Rs. 6,096" or "INR 6,096" or "Rs 6096"
                if (text.match(/(Rs\.?|INR)\s*[\d,]+/i)) {
                    const numMatch = text.match(/[\d,]+/);
                    if (numMatch) {
                        const cleanPrice = numMatch[0].replace(/,/g, '');
                        const parsedPrice = parseFloat(cleanPrice);
                        if (!isNaN(parsedPrice) && parsedPrice > 100) {
                            price = parsedPrice;
                            console.log(`[Agoda] Found price via Text Search in ${containerSel}: ${parsedPrice}`);
                            break;
                        }
                    }
                }
            }
            if (price > 0) break;
        }
    }

    // Check for "Sold Out" specific indicators if price not found
    if (price === 0) {
        const soldOutSelectors = [
            '.no-rooms-text',
            '.sold-out-message',
            '[data-component="sold-out-banner"]',
            '.RoomGrid-search-empty-content',
            '.Typographystyled__TypographyStyled-sc-1uoovui-0', // Verified Sold Out Base Class
            '.jZutHX' // Verified Sold Out Specific Class
        ];

        for (let selector of soldOutSelectors) {
            if (scope.querySelector(selector)) {
                console.log(`[Agoda] Found sold out indicator: ${selector}`);
                isSoldOut = true;
                break;
            }
        }

        // Final fallback: If Agoda page loaded logic
        if (!isSoldOut && document.readyState === 'complete') {
            // If we can see the "Update" button, page is likely loaded
            if (document.querySelector('button[data-element-name="search-button"]')) {
                // Check for "Sold out on your dates!" text specifically as requested
                const bodyText = document.body.innerText;
                if (bodyText.includes("Sold out on your dates!")) {
                    console.log("[Agoda] Found 'Sold out on your dates!' in text.");
                    isSoldOut = true;
                }
            }
        }
    }

    // Try to get room type
    try {
        const roomTypeElement = document.querySelector('.room-type-name, .RoomRow-module__room-name, [data-selenium="room-name"]');
        if (roomTypeElement) {
            roomName = roomTypeElement.textContent.trim();
        }
    } catch (e) {
        // use default
    }

    return {
        check_in_date: getCheckinDateFromUrl(),
        price: price,
        room_type: roomName,
        is_sold_out: isSoldOut
    };
}

// Wait for page to load, then scrape
setTimeout(() => {
    console.log("[Agoda] Starting scrape sequence...");

    let attempts = 0;
    const maxAttempts = 10; // Reduced from 15 to 10 for faster fail-over

    const interval = setInterval(() => {
        attempts++;

        // SCROLL to trigger lazy items (as requested)
        window.scrollBy(0, 300);

        const data = scrapeAgodaData();

        // Stop if Price Found OR Explicit Sold Out (with short confirmation delay) OR Max Attempts
        if (data.price > 0 || (data.is_sold_out && attempts > 2) || attempts >= maxAttempts) {
            clearInterval(interval);

            // If timed out and no price, mark sold out
            if (data.price === 0 && !data.is_sold_out) {
                console.log("[Agoda] Timed out finding price - defaulting to Sold Out");
                data.is_sold_out = true;
            }

            console.log("[Agoda] Final Data:", data);

            // Show visual feedback
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; 
                top: 60px; 
                right: 10px; 
                background: ${data.price > 0 ? 'green' : 'red'}; 
                color: white; 
                padding: 15px 25px; 
                border-radius: 8px; 
                z-index: 999999;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                border: 2px solid white;
            `;

            if (data.price > 0) {
                banner.textContent = `✅ Agoda: Found Rs. ${data.price.toFixed(0)}`;
            } else {
                banner.textContent = `❌ Agoda: SOLD OUT (or parse error)`;
            }

            document.body.appendChild(banner);

            // Send to background script
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: "SCRAPE_RESULT",
                    data: [data]
                });
            }, 1000);
        }
    }, 1000);

}, 3000); // Reduced initial delay to 3s
