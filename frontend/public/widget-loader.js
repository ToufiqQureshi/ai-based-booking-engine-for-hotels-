(function () {
    // 1. Get the script element to read configuration (hotel ID)
    const scriptTag = document.currentScript || document.querySelector('script[data-hotel-id]');
    const hotelId = scriptTag ? scriptTag.getAttribute('data-hotel-id') : null;
    const baseUrl = scriptTag ? new URL(scriptTag.src).origin : 'https://app.gadget4me.in';

    if (!hotelId) {
        console.error('HotelierHub Widget: Missing data-hotel-id attribute.');
        return;
    }

    // 2. Create the wrapper container
    const wrapper = document.createElement('div');
    wrapper.id = 'hotelhero-booking-widget';

    // 3. Inject Styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        #hotelhero-booking-widget {
            position: relative;
            width: 84%;
            max-width: 1200px;
            margin: -40px auto 0; /* Default negative margin */
            height: 80px; 
            z-index: 9999;
            background: transparent !important;
            font-family: sans-serif;
        }

        #hotelhero-booking-widget iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 600px; /* Tall for dropdowns */
            border: none;
            background: transparent !important;
        }

        @media (max-width: 768px) {
            #hotelhero-booking-widget {
                width: 95%;
                margin-top: -30px;
                height: 100px;
            }
        }
    `;
    document.head.appendChild(style);

    // 4. Create Iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${baseUrl}/book/${hotelId}/widget`;
    iframe.allowTransparency = "true";
    iframe.scrolling = "no"; // Prevent scrolling inside iframe if possible

    // 5. Assemble
    wrapper.appendChild(iframe);

    // Insert after the script tag (or append to body if preferred, but usually where script is placed)
    // Actually, usually users want to place the widget IN specific location.
    // So we replace the script tag with the widget, OR we ask them to place a <div id="booking-widget"></div>
    // BUT user asked for "Trick".
    // Best Trick: User places <script> where they want the widget. We insert widget immediately after script.
    scriptTag.parentNode.insertBefore(wrapper, scriptTag.nextSibling);

})();
