import { useParams } from 'react-router-dom';
import { ChatWidget } from '@/components/ChatWidget';
import { useEffect, useState } from 'react';

export default function ChatEmbed() {
    const { hotelSlug } = useParams();
    const [config, setConfig] = useState<any>(null);

    // Fetch config for colors
    useEffect(() => {
        if (!hotelSlug) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
        fetch(`${apiUrl}/public/hotels/slug/${hotelSlug}/widget-config`)
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(() => { /* Config load optional */ });
    }, [hotelSlug]);

    // Transparent Body for Iframe
    useEffect(() => {
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
        return () => {
            document.body.style.backgroundColor = '';
            document.documentElement.style.backgroundColor = '';
        };
    }, []);

    return (
        <div className="h-screen w-screen bg-transparent pointer-events-none">
            {/* Wrapper div with pointer-events-none allows clicks to pass through the empty iframe space */}
            <div className="pointer-events-auto">
                <ChatWidget
                    hotelSlug={hotelSlug || ''}
                    primaryColor={config?.widget_background_color || '#3B82F6'}
                />
            </div>
        </div>
    );
}
