
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { ChatWidget } from '@/components/ChatWidget';

export default function BookingWidget() {
    const { hotelSlug } = useParams();
    const [config, setConfig] = useState<any>(null);

    // Fetch Widget Configuration
    useEffect(() => {
        if (!hotelSlug) return;

        // Use relative URL if on same domain, otherwise construct API URL
        // Simple hack: assume relative path /api/v1 for testing, or use full URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'; // Fallback

        fetch(`${apiUrl}/public/hotels/slug/${hotelSlug}/widget-config`)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Failed to fetch config");
            })
            .then(data => setConfig(data))
            .catch(() => { /* Widget config load optional, using defaults */ });
    }, [hotelSlug]);

    // Ensure iframe body is transparent
    useEffect(() => {
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
        return () => {
            document.body.style.backgroundColor = '';
            document.documentElement.style.backgroundColor = '';
        };
    }, []);

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 1),
    });
    const [guests, setGuests] = useState('2');
    const [promoCode, setPromoCode] = useState('');

    // Dynamic Resizing Logic (Only for Calendar now)
    const [isDateOpen, setIsDateOpen] = useState(false);

    // Mobile Detection for Calendar
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Explicitly set height based on calendar state
        // Portal content doesn't affect body height, so we must force it.
        const baseHeight = 160;
        const expandedHeight = 420; // Super tuned for standard DatePicker height (approx 350px + UI)

        const height = isDateOpen ? expandedHeight : baseHeight;

        // Also verify real content height just in case (for base state)
        // const contentHeight = document.body.scrollHeight;
        // const finalHeight = Math.max(height, contentHeight);

        window.parent.postMessage({ type: 'RESIZE_SEARCH_WIDGET', height: height }, '*');
    }, [isDateOpen]);

    const handleSearch = () => {
        if (!hotelSlug || !date?.from || !date?.to) return;
        const params = new URLSearchParams({
            check_in: format(date.from, 'yyyy-MM-dd'),
            check_out: format(date.to, 'yyyy-MM-dd'),
            guests: guests,
            promo_code: promoCode
        });

        // Open in parent window/tab
        const url = `${window.location.origin}/book/${hotelSlug}/rooms?${params.toString()}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-transparent p-4 w-full flex flex-col items-center justify-start font-sans">
            <div className="bg-white rounded-full shadow-2xl p-2 w-full max-w-6xl flex items-center justify-between border border-gray-100">

                {/* DATE SECTION */}
                <div className="flex-1 px-6 py-2 border-r border-gray-200 relative z-50 group cursor-pointer hover:bg-gray-50 rounded-l-full transition-colors">
                    <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-full h-full p-0 flex flex-col items-start justify-center hover:bg-transparent">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Check In - Out</span>
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-bold text-gray-900">
                                        {date?.from ? (
                                            <>
                                                {format(date.from, "dd MMM")}
                                                <span className="mx-2 text-gray-400">—</span>
                                                {date?.to ? format(date.to, "dd MMM") : "Select Checkout"}
                                            </>
                                        ) : "Select Dates"}
                                    </span>
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto p-0 !z-[9999] relative bg-white shadow-2xl border border-gray-200 rounded-lg"
                            align="start"
                            side="bottom"
                            sideOffset={20}
                            avoidCollisions={false}
                        >
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={isMobile ? 1 : 2}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* GUESTS SECTION */}
                <div className="flex-1 px-6 py-2 border-r border-gray-200 relative z-40 group cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="w-full h-full flex flex-col items-start justify-center relative">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Guests</span>
                        <div className="flex items-center gap-2 relative w-full">
                            <Users className="w-4 h-4 text-blue-600 absolute left-0 pointer-events-none" />
                            <select
                                value={guests}
                                onChange={(e) => setGuests(e.target.value)}
                                className="w-full bg-transparent text-sm font-bold text-gray-900 appearance-none pl-6 outline-none cursor-pointer"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                    <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* PROMO SECTION */}
                <div className="flex-1 px-6 py-2 relative group hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-start justify-center w-full">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Promo Code</span>
                        <input
                            className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-300 outline-none"
                            placeholder="Optional"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                        />
                    </div>
                </div>

                {/* SEARCH BUTTON */}
                <div className="pl-2">
                    <Button
                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:scale-105 transition-all duration-200"
                        onClick={handleSearch}
                    >
                        Check Availability
                    </Button>
                </div>
            </div>

        </div>
    );
}
