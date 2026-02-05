(function (window) {
    'use strict';

    function initChat(config) {
        console.log("Hotelier Chat Loader v1.0");

        // Config defaults
        var hotelSlug = config.hotelSlug;
        var frontendUrl = config.frontendUrl || 'https://zippy-pudding-7299b5.netlify.app'; // Default to prod

        if (!hotelSlug) {
            console.error("Hotelier Chat: Missing hotelSlug in config");
            return;
        }

        if (document.getElementById('hotelier-chat-widget')) return;

        var chatIframe = document.createElement('iframe');
        chatIframe.id = 'hotelier-chat-widget';
        chatIframe.src = frontendUrl + '/book/' + hotelSlug + '/chat';

        // Styling - Fixed Position Bottom Right
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

        // Resize Logic (Required for "Pop Open" effect)
        window.addEventListener('message', function (event) {
            if (!event.data) return;

            if (event.data.type === 'CHAT_OPEN') {
                chatIframe.style.width = '400px';
                chatIframe.style.height = '600px';
            }
            if (event.data.type === 'CHAT_CLOSE') {
                chatIframe.style.width = '350px';
                chatIframe.style.height = '120px';
            }
        });
    }

    // Expose globally
    window.HotelierChat = {
        init: initChat
    };

})(window);
