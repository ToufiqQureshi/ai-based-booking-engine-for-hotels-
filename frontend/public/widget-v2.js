(function (window) {
    'use strict';

    function init(config) {
        console.log("Hotelier Widget Init v2.2 (New Version)");
        var container = document.getElementById('hotelier-booking-widget');
        if (!container) {
            console.error('Hotelier Widget: Container #hotelier-booking-widget not found');
            return;
        }

        var hotelSlug = config.hotelSlug || container.getAttribute('data-hotel-slug');

        // Use URLs from config (injected by backend) or fallback to defaults
        var baseUrl = config.apiUrl || 'http://localhost:8001';
        var frontendUrl = config.frontendUrl || 'http://localhost:8080';

        if (!hotelSlug) {
            container.innerHTML = '<div style="color:red; border:1px solid red; padding:10px;">Error: Missing Hotel Slug</div>';
            return;
        }

        // Fetch Config for verification
        fetch(baseUrl + '/api/v1/public/hotels/slug/' + hotelSlug + '/widget-config')
            .then(function (response) {
                if (!response.ok) throw new Error('Invalid Hotel');
                return response.json();
            })
            .then(function (data) {
                // DOMAIN VERIFICATION
                // If allowed_domains is empty/null, allow all (or we could default to Strict off)
                // User requirement: "integration should be only allowed on those site which is verify"
                // So if list exists, we MUST check.

                var currentDomain = window.location.hostname;
                var allowedDomains = data.allowed_domains ? data.allowed_domains.split(',').map(function (d) { return d.trim(); }) : [];

                if (allowedDomains.length > 0) {
                    var isAllowed = allowedDomains.some(function (domain) {
                        return currentDomain === domain || currentDomain.endsWith('.' + domain);
                    });

                    if (!isAllowed) {
                        console.error('Hotelier Widget: Domain ' + currentDomain + ' is not authorized.');
                        container.innerHTML = '<div style="color:gray; font-size:12px; font-family:sans-serif;">Booking widget not authorized for this domain.</div>';
                        return;
                    }
                }

                if (!data.widget_enabled) {
                    container.innerHTML = '<div style="color:gray; font-size:12px; font-family:sans-serif;">Booking widget is currently disabled.</div>';
                    return;
                }

                // Render Booking Widget (Search Bar)
                renderWidget(container, hotelSlug, data.primary_color || '#3B82F6', frontendUrl);

                // Render Chat Widget (Floating)
                renderChatWidget(hotelSlug, frontendUrl);
            })
            .catch(function (err) {
                console.error('Hotelier Widget Error:', err);
                container.innerHTML = '<div style="color:red; font-size:12px;">Widget Error: ' + err.message + '</div>';
            });
    }

    function renderWidget(container, hotelSlug, primaryColor, frontendUrl) {
        // Create Iframe for the Search Bar Widget
        var iframe = document.createElement('iframe');
        iframe.src = frontendUrl + '/book/' + hotelSlug + '/widget';
        iframe.style.width = '100%';
        iframe.style.height = '80px';
        iframe.style.minWidth = '200px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '12px';
        iframe.style.overflow = 'hidden';
        iframe.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        iframe.scrolling = 'no';

        container.innerHTML = '';
        container.appendChild(iframe);
    }

    function renderChatWidget(hotelSlug, frontendUrl) {
        if (document.getElementById('hotelier-chat-widget')) return;

        var chatIframe = document.createElement('iframe');
        chatIframe.id = 'hotelier-chat-widget';
        chatIframe.src = frontendUrl + '/book/' + hotelSlug + '/chat';

        // --- CONSTANTS ---
        var DESKTOP_BOTTOM = '110px';
        var DESKTOP_RIGHT = '20px';
        var MOBILE_BOTTOM = '10px';
        var MOBILE_RIGHT = '10px';

        // Initial Dimensions (Button State)
        var BTN_WIDTH = '280px';
        var BTN_HEIGHT = '100px';

        // --- STYLES ---
        // Strict Iframe-Level Fixed Positioning
        chatIframe.style.cssText = `
            position: fixed !important;
            bottom: ${window.innerWidth <= 768 ? MOBILE_BOTTOM : DESKTOP_BOTTOM} !important;
            right: ${window.innerWidth <= 768 ? MOBILE_RIGHT : DESKTOP_RIGHT} !important;
            left: auto !important;
            top: auto !important;
            width: ${BTN_WIDTH} !important;
            height: ${BTN_HEIGHT} !important;
            border: none !important;
            z-index: 2147483647 !important;
            overflow: visible !important; /* Allow shadow if needed, though usually clipped in iframe */
            background: transparent !important;
            transition: width 0.3s ease, height 0.3s ease, right 0.3s ease, bottom 0.3s ease;
            box-shadow: none !important;
        `;

        document.body.appendChild(chatIframe);

        // --- EVENT HANDLERS ---
        window.addEventListener('message', function (event) {
            // Validate origin if needed (Skipped for now for broad compatibility)
            if (!event.data) return;

            var isMobile = window.innerWidth <= 768;

            if (event.data.type === 'CHAT_OPEN') {
                // Open State Dimensions
                var openWidth = isMobile ? '90vw' : '400px';
                var openHeight = isMobile ? '80vh' : '650px';

                chatIframe.style.width = openWidth;
                chatIframe.style.height = openHeight;
                chatIframe.style.borderRadius = "16px";
                chatIframe.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";

            } else if (event.data.type === 'CHAT_CLOSE') {
                // Reset to Button State
                chatIframe.style.width = BTN_WIDTH;
                chatIframe.style.height = BTN_HEIGHT;
                chatIframe.style.borderRadius = "0"; // Or maintain button radius if needed
                chatIframe.style.boxShadow = "none";
            }
        });

        // Handle Window Resize
        window.addEventListener('resize', function () {
            var isMobile = window.innerWidth <= 768;
            chatIframe.style.bottom = isMobile ? MOBILE_BOTTOM : DESKTOP_BOTTOM;
            chatIframe.style.right = isMobile ? MOBILE_RIGHT : DESKTOP_RIGHT;
        });
    }

    // Expose global object
    window.HotelierWidget = {
        init: init
    };

})(window);
