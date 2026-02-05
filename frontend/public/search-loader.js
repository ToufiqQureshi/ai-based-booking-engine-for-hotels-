(function (window) {
    'use strict';

    function initSearch(config) {
        console.log("Hotelier Search Loader v1.0");
        var container = document.getElementById(config.containerId || 'hotelier-booking-widget');

        if (!container) {
            console.error('Hotelier Search: Container not found');
            return;
        }

        var hotelSlug = config.hotelSlug || container.getAttribute('data-hotel-slug');
        var frontendUrl = config.frontendUrl || 'https://zippy-pudding-7299b5.netlify.app';

        if (!hotelSlug) {
            container.innerHTML = '<div style="color:red; border:1px solid red; padding:10px;">Error: Missing Hotel Slug</div>';
            return;
        }

        // Create Iframe for the Search Bar
        var iframe = document.createElement('iframe');
        iframe.src = frontendUrl + '/book/' + hotelSlug + '/widget';

        // Styling matches "New Design" dimensions
        iframe.style.width = '100%';
        iframe.style.height = '160px'; // Fit for labels + flexible dates
        iframe.style.border = 'none';
        iframe.style.overflow = 'visible';
        iframe.scrolling = 'no';

        // Clear container and append
        container.innerHTML = '';
        container.appendChild(iframe);

        // Resize Logic for Dropdowns (Calendar/Guests)
        window.addEventListener('message', function (event) {
            if (!event.data) return;
            if (event.data.type === 'RESIZE_SEARCH_WIDGET') {
                if (event.data.height) {
                    iframe.style.height = event.data.height + 'px';
                }
            }
        });
    }

    // Expose globally
    window.HotelierSearch = {
        init: initSearch
    };

})(window);
