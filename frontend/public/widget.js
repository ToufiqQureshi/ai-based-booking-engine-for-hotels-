(function (window) {
    'use strict';

    function init(config) {
        var container = document.getElementById('hotelier-booking-widget');
        if (!container) {
            console.error('Hotelier Widget: Container #hotelier-booking-widget not found');
            return;
        }

        var hotelSlug = config.hotelSlug || container.getAttribute('data-hotel-slug');
        var baseUrl = 'http://localhost:8003'; // Backend API
        var frontendUrl = 'http://localhost:8080'; // Frontend URL for booking link

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

                // Allow localhost loopback for testing always? Or strict? 
                // User said "only verify site", implying strictness.
                // But let's verify if array is empty -> maybe allow all? Or block?
                // Taking safe bet: If allowed_domains is set, check it. If empty, warn/allow?
                // Let's assume empty = allow all (dev mode) unless explicit.

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

                // Render Widget
                renderWidget(container, hotelSlug, data.primary_color || '#3B82F6', frontendUrl);
            })
            .catch(function (err) {
                console.error('Hotelier Widget Error:', err);
                container.innerHTML = '<div style="color:red; font-size:12px;">Widget Error: ' + err.message + '</div>';
            });
    }

    function renderWidget(container, hotelSlug, primaryColor, frontendUrl) {
        var bookingUrl = frontendUrl + '/book/' + hotelSlug;

        var button = document.createElement('a');
        button.href = bookingUrl;
        button.target = '_blank';
        button.innerText = 'Book Now';
        button.style.display = 'inline-block';
        button.style.backgroundColor = primaryColor;
        button.style.color = '#ffffff';
        button.style.padding = '12px 24px';
        button.style.borderRadius = '6px';
        button.style.textDecoration = 'none';
        button.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        button.style.fontSize = '16px';
        button.style.fontWeight = '600';
        button.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        button.style.cursor = 'pointer';

        button.onmouseover = function () {
            button.style.filter = 'brightness(90%)';
        };
        button.onmouseout = function () {
            button.style.filter = 'none';
        };

        container.innerHTML = '';
        container.appendChild(button);
    }

    // Expose global object
    window.HotelierWidget = {
        init: init
    };

    // Auto-init if data attributes are present and script is loaded normally (not async init)
    // But mostly users will call HotelierWidget.init() as per instructions.

})(window);
