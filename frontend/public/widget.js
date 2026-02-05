(function (window) {
    'use strict';

    function init(config) {
        console.log("Hotelier Widget Init v2.1 (Sticky Fix)");
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
        iframe.style.height = '160px'; // Increased for Flexible Dates & Labels
        iframe.style.minWidth = '200px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '0'; // Flat/custom integration
        iframe.style.overflow = 'visible';
        iframe.style.boxShadow = 'none'; // Clean look
        iframe.scrolling = 'no';

        container.innerHTML = '';
        container.appendChild(iframe);
    }

    function renderChatWidget(hotelSlug, frontendUrl) {
        if (document.getElementById('hotelier-chat-widget')) return;

        var chatIframe = document.createElement('iframe');
        chatIframe.id = 'hotelier-chat-widget';
        chatIframe.src = frontendUrl + '/book/' + hotelSlug + '/chat';

        // Legacy dimensions but wide enough for the pill button
        chatIframe.style.cssText = `
            position: fixed !important;
            bottom: 10px !important;
            right: 0px !important;
            width: 350px; 
            height: 120px;
            border: none !important;
            z-index: 2147483647 !important;
            background: transparent !important;
            transition: all 0.3s ease;
        `;

        document.body.appendChild(chatIframe);

        window.addEventListener('message', function (event) {
            if (event.data && event.data.type === 'CHAT_OPEN') {
                chatIframe.style.width = '400px';
                chatIframe.style.height = '600px';
            }
            if (event.data && event.data.type === 'CHAT_CLOSE') {
                chatIframe.style.width = '300px';
                chatIframe.style.height = '120px';
            }
        });
    }

    // Expose global object
    window.HotelierWidget = {
        init: init
    };

})(window);
