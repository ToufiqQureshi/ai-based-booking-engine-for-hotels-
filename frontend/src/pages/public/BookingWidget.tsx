
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Users, Search, BedDouble, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export default function BookingWidget() {
    const { hotelSlug } = useParams();
    const [config, setConfig] = useState<any>(null);

    // Fetch Widget Configuration
    useEffect(() => {
        if (!hotelSlug) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'; // Fallback

        fetch(`${apiUrl}/public/hotels/slug/${hotelSlug}/widget-config`)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Failed to fetch config");
            })
            .then(data => setConfig(data))
            .catch(() => { /* Defaults */ });
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

    // State
    const [checkInDate, setCheckInDate] = useState<Date | undefined>(new Date());
    const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(addDays(new Date(), 1));
    const [adults, setAdults] = useState('2');
    const [children, setChildren] = useState('0');
    const [promoCode, setPromoCode] = useState('');

    // Calendar UI State
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

    // Dynamic Resizing Logic
    useEffect(() => {
        const baseHeight = 100; // Reduced for overlay mode
        const expandedHeight = 650; // Increased to preventing clipping
        const isOpen = isCheckInOpen || isCheckOutOpen;
        const height = isOpen ? expandedHeight : baseHeight;

        console.log("BookingWidget: Resize Request ->", height); // Debug Log

        if (window.parent !== window) {
            window.parent.postMessage({ type: 'RESIZE_OVERLAY', height }, '*');
        }
    }, [isCheckInOpen, isCheckOutOpen]);

    const handleSearch = () => {
        const parentUrl = document.referrer;
        const targetUrl = `${window.location.origin}/book/${hotelSlug}/rooms`;

        // Sum guests for backend compatibility
        const totalGuests = parseInt(adults) + parseInt(children);

        const params = new URLSearchParams({
            check_in: checkInDate ? format(checkInDate, 'yyyy-MM-dd') : '',
            check_out: checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : '',
            guests: totalGuests.toString(), // Backend expects total
            promo_code: promoCode
        });

        if (window.parent !== window) {
            window.open(`${targetUrl}?${params.toString()}`, '_blank');
        } else {
            window.location.href = `${targetUrl}?${params.toString()}`;
        }
    };

    return (
        <div className="w-full flex justify-center font-sans p-4">
            {/* Main Container - Dark Bar */}
            <div className="bg-slate-900 rounded-xl shadow-2xl p-4 w-full max-w-6xl flex flex-col lg:flex-row items-center gap-4 border border-slate-700">

                {/* DATE: Check In */}
                <div className="w-full lg:flex-1 space-y-1 group">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Check In</label>
                    <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full h-12 justify-start text-left font-medium border-0 bg-white text-slate-900 hover:bg-slate-50 rounded-lg shadow-sm overflow-hidden",
                                    !checkInDate && "text-slate-400"
                                )}
                            >
                                <CalendarIcon className="mr-3 h-4 w-4 text-purple-600" />
                                {checkInDate ? format(checkInDate, "EEE, dd MMM") : "Select Date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 bg-white" align="start" side="bottom" avoidCollisions={false}>
                            <Calendar
                                mode="single"
                                selected={checkInDate}
                                onSelect={(date) => {
                                    setCheckInDate(date);
                                    setIsCheckInOpen(false);
                                    // Auto-advance logic could go here
                                    if (date && (!checkOutDate || date >= checkOutDate)) {
                                        setCheckOutDate(addDays(date, 1));
                                    }
                                }}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* DATE: Check Out */}
                <div className="w-full lg:flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Check Out</label>
                    <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full h-12 justify-start text-left font-medium border-0 bg-white text-slate-900 hover:bg-slate-50 rounded-lg shadow-sm overflow-hidden",
                                    !checkOutDate && "text-slate-400"
                                )}
                            >
                                <CalendarIcon className="mr-3 h-4 w-4 text-purple-600" />
                                {checkOutDate ? format(checkOutDate, "EEE, dd MMM") : "Select Date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 bg-white" align="start" side="bottom" avoidCollisions={false}>
                            <Calendar
                                mode="single"
                                selected={checkOutDate}
                                onSelect={(date) => {
                                    setCheckOutDate(date);
                                    setIsCheckOutOpen(false);
                                }}
                                disabled={(date) => date <= (checkInDate || new Date())}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* GUESTS: Adults */}
                <div className="w-full lg:w-32 space-y-1 relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Adults</label>
                    <div className="relative h-12 bg-white rounded-lg shadow-sm flex items-center overflow-hidden">
                        <Users className="absolute left-3 w-4 h-4 text-purple-600 pointer-events-none" />
                        <select
                            value={adults}
                            onChange={(e) => setAdults(e.target.value)}
                            className="w-full h-full bg-transparent text-sm font-bold text-slate-900 appearance-none pl-10 pr-8 outline-none cursor-pointer"
                        >
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                        {/* Custom Arrow */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-2 h-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* GUESTS: Children */}
                <div className="w-full lg:w-32 space-y-1 relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Children</label>
                    <div className="relative h-12 bg-white rounded-lg shadow-sm flex items-center overflow-hidden">
                        <Baby className="absolute left-3 w-4 h-4 text-purple-600 pointer-events-none" />
                        <select
                            value={children}
                            onChange={(e) => setChildren(e.target.value)}
                            className="w-full h-full bg-transparent text-sm font-bold text-slate-900 appearance-none pl-10 pr-8 outline-none cursor-pointer"
                        >
                            {[0, 1, 2, 3, 4].map((num) => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-2 h-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* PROMO CODE */}
                <div className="w-full lg:flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Promo Code</label>
                    <input
                        className="w-full h-12 bg-white text-sm font-bold text-slate-900 px-4 rounded-lg outline-none placeholder:text-slate-300 shadow-sm"
                        placeholder="Optional"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                    />
                </div>

                {/* SEARCH BUTTON */}
                <div className="w-full lg:w-auto pt-5 lg:pt-0">
                    <Button
                        className="w-full lg:w-auto h-12 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:scale-105 transition-all duration-200"
                        onClick={handleSearch}
                    >
                        Check Availability
                    </Button>
                </div>
            </div>
        </div>
    );
}
