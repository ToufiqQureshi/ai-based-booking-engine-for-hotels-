// Scraper.js - Injected into MMT Page

(function () {
    console.log("[Extension] Scraper Injected");

    // 1. ADD VISUAL BANNER (So User knows what's happening)
    const banner = document.createElement("div");
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.width = "100%";
    banner.style.backgroundColor = "red";
    banner.style.color = "white";
    banner.style.zIndex = "999999";
    banner.style.textAlign = "center";
    banner.style.padding = "20px";
    banner.style.fontSize = "24px";
    banner.style.fontWeight = "bold";
    banner.innerText = "HOTELIER HUB: Scraping Rates... DO NOT CLOSE !";
    document.body.prepend(banner);

    function getElementByXpath(path) {
        return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    function scrapeData() {
        let price = 0;
        let roomName = "Standard Room";
        let isSoldOut = false;

        // 1. Critical Check: "Sold Out" Markers
        // Based on User provided HTML: <div class="htlSoldOutNew soldOut"> and <h4 class="soldOutTxt">
        const soldOutSelectors = [
            ".htlSoldOutNew.soldOut",  // Container class from HTML
            ".soldOutTxt",             // H4 class from HTML
            "//h4[contains(text(),'You Just Missed It')]",
            "//div[contains(@class,'hdrContainer__right--soldOut')]", // Parent wrapper
            ".soldOut"                 // Generic class
        ];

        for (let sel of soldOutSelectors) {
            try {
                let el;
                if (sel.startsWith("//")) el = getElementByXpath(sel);
                else el = document.querySelector(sel);

                if (el && el.offsetParent !== null) {
                    console.log("[Extension] Detected Sold Out Element:", sel);
                    isSoldOut = true;
                    roomName = "Sold Out";
                    break;
                }
            } catch (e) { }
        }

        // Broad Text Search (Fallback)
        if (!isSoldOut) {
            const bodyText = document.body.innerText;
            if (
                bodyText.includes("You Just Missed It") ||
                bodyText.includes("Not available for selected dates")
            ) {
                console.log("[Extension] Detected Sold Out via Text Search");
                isSoldOut = true;
                roomName = "Sold Out";
            }
        }

        // If Sold Out, Strict Return
        if (isSoldOut) {
            return {
                check_in_date: getCheckinDateFromUrl(),
                price: 0,
                room_type: roomName,
                is_sold_out: true
            };
        }

        // 2. Check Price (Only if NOT Sold Out)
        const priceSelectors = [
            "#hlistpg_hotel_shown_price",
            ".latoBlack.font28",
            "//div[contains(@class,'latoBlack') and contains(@class,'font28')]//div[contains(text(),'₹')]",
            ".font22.latoBlack",
            "//span[contains(text(),'₹')]"
        ];

        // ... rest of price logic ...
        let priceText = null;
        for (let sel of priceSelectors) {
            try {
                let el;
                if (sel.startsWith("//")) el = getElementByXpath(sel);
                else el = document.querySelector(sel);

                if (el && el.innerText) {
                    priceText = el.innerText;
                    break;
                }
            } catch (e) { }
        }

        // Fallback: Regex Search in body
        if (!priceText) {
            const match = bodyText.match(/₹\s?([\d,]+)/);
            if (match) priceText = match[1];
        }

        if (priceText) {
            price = parseFloat(priceText.replace(/[^\d.]/g, ''));
        }

        // Double check: If price is found but relatively small/weird and page looks empty?
        // No, trust the "Sold Out" check above.

        // 3. Room Name
        const roomEl = document.querySelector(".bkngOption__title");
        if (roomEl) roomName = roomEl.innerText;

        return {
            check_in_date: getCheckinDateFromUrl(),
            price: price,
            room_type: roomName,
            is_sold_out: false
        };
    }

    function getCheckinDateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        let checkinDate = new Date().toISOString().split('T')[0];
        const checkinStr = urlParams.get('checkin');
        if (checkinStr && checkinStr.length === 8) {
            const m = checkinStr.substring(0, 2);
            const d = checkinStr.substring(2, 4);
            const y = checkinStr.substring(4, 8);
            checkinDate = `${y}-${m}-${d}`;
        }
        return checkinDate;
    }

    // DELAY START
    console.log("[Extension] Waiting 5s for Page Load...");
    setTimeout(() => {

        let attempts = 0;
        const maxAttempts = 5; // Reduced to 5s check (Total 10s wait is enough)

        const interval = setInterval(() => {
            attempts++;
            const data = scrapeData();

            banner.innerText = `HOTELIER HUB: Checking... Price:${data.price} SoldOut:${data.is_sold_out} (${attempts}/${maxAttempts})`;
            console.log("[Extension] Scan Result:", data);

            // Check Success
            if (data.price > 0 || data.is_sold_out) {
                clearInterval(interval);
                banner.style.backgroundColor = "green";
                banner.innerText = `SUCCESS! Found: ${data.price > 0 ? data.price : 'Sold Out'}`;

                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        action: "SCRAPE_RESULT",
                        data: [data]
                    });
                }, 1000);
            } else if (attempts >= maxAttempts) {
                // TIMEOUT FALLBACK
                clearInterval(interval);
                banner.style.backgroundColor = "orange";
                banner.innerText = "TIMEOUT -> Assuming SOLD OUT";

                // If we couldn't find a price after 10s, it's likely Sold Out or Failed.
                // We default to Sold Out to be safe (stops retry loop).
                data.is_sold_out = true;
                data.room_type = "Timeout / Sold Out";

                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        action: "SCRAPE_RESULT",
                        data: [data]
                    });
                }, 1000);
            }
        }, 1000);

    }, 5000); // 5s Delay before starting loop

})();
