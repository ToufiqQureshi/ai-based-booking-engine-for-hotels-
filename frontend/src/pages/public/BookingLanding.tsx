import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Users, MapPin, Star, Wifi, Coffee, Utensils, Car, ArrowRight, Check } from 'lucide-react';
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
    SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';
import { Hotel, PublicRoomSearchResult } from '@/types/api';
import { DateRange } from 'react-day-picker';

export default function BookingLanding() {
    const { hotelSlug } = useParams();
    const navigate = useNavigate();
    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [rooms, setRooms] = useState<PublicRoomSearchResult[]>([]);
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 1),
    });
    const [guests, setGuests] = useState('2');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!hotelSlug) return;
            try {
                // Fetch Hotel
                const hotelData = await apiClient.get<Hotel>(`/public/hotels/${hotelSlug}`);
                setHotel(hotelData);

                // Fetch Rooms for preview
                const today = format(new Date(), 'yyyy-MM-dd');
                const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                const roomData = await apiClient.get<PublicRoomSearchResult[]>(`/public/hotels/${hotelSlug}/rooms?check_in=${today}&check_out=${tomorrow}&guests=1`);

                // Take first 3 unique rooms
                const uniqueRooms = roomData.slice(0, 3);
                setRooms(uniqueRooms);

            } catch (error) {
                console.error('Failed to fetch data', error);
            }
        };
        fetchData();
    }, [hotelSlug]);

    const handleSearch = () => {
        if (!hotelSlug || !date?.from || !date?.to) return;
        const params = new URLSearchParams({
            check_in: format(date.from, 'yyyy-MM-dd'),
            check_out: format(date.to, 'yyyy-MM-dd'),
            guests: guests
        });
        navigate(`/book/${hotelSlug}/rooms?${params.toString()}`);
    };

    if (!hotel) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-primary font-medium tracking-wide">Loading experience...</p>
            </div>
        </div>
    );

    // Clean, high-quality hero image
    const heroImage = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=3270&auto=format&fit=crop";

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-primary/10">
            {/* Navbar - Minimalist */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
                scrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-8"
            )}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <div className={cn(
                        "text-2xl font-bold transition-colors duration-300 tracking-tight",
                        scrolled ? "text-slate-900" : "text-white"
                    )}>
                        {hotel.name}
                    </div>
                    {/* Clean action button */}
                    <div className="hidden md:block">
                        <span className={cn("text-sm font-medium mr-6 transition-colors", scrolled ? "text-slate-600" : "text-white/90")}>
                            Need assistance?
                        </span>
                        <Button
                            variant={scrolled ? "default" : "outline"}
                            className={cn(
                                "rounded-full px-8 transition-all hover:scale-105",
                                !scrolled && "border-white text-white hover:bg-white hover:text-slate-900"
                            )}
                            onClick={() => document.getElementById('search-bar')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Book Your Stay
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Immersive Hero Section */}
            <div className="relative h-[90vh] min-h-[700px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src={heroImage}
                        alt="Hero"
                        className="w-full h-full object-cover animate-in fade-in zoom-in duration-[2s]"
                    />
                    {/* Subtle gradient overlay, not too dark */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10" />
                </div>

                <div className="relative z-10 container mx-auto px-6 text-center text-white space-y-10 animate-enter">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium tracking-wider uppercase">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Premium Collection</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-tight">
                        Simple.<br />
                        <span className="text-white/90">Unforgettable.</span>
                    </h1>

                    <p className="text-xl text-white/90 max-w-xl mx-auto font-light leading-relaxed">
                        {hotel.description || `Experience the epitome of luxury and comfort at ${hotel.name}.`}
                    </p>

                    {hotel.address && (
                        <div className="flex items-center justify-center gap-2 text-white/80">
                            <MapPin className="w-5 h-5" />
                            <span className="text-lg">{hotel.address.city}, {hotel.address.country}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Search Bar - The "Interactive" Star */}
            <div id="search-bar" className="relative z-30 -mt-16 container mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 p-6 md:p-4 grid gap-4 grid-cols-1 md:grid-cols-[1fr,1fr,auto,auto] items-center max-w-5xl mx-auto border border-slate-100 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-1">

                    {/* Check-in / Check-out */}
                    <div className="relative group px-4 py-2 rounded-xl transition-colors hover:bg-slate-50 cursor-pointer">
                        <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"ghost"}
                                    className={cn(
                                        "w-full h-full justify-start text-left font-normal p-0 hover:bg-transparent",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dates</p>
                                        <div className="flex items-center gap-3">
                                            <CalendarIcon className="h-5 w-5 text-primary" />
                                            <span className="text-lg font-semibold text-slate-900">
                                                {date?.from ? (
                                                    date.to ? (
                                                        `${format(date.from, "MMM dd")} - ${format(date.to, "MMM dd")}`
                                                    ) : (
                                                        format(date.from, "MMM dd, y")
                                                    )
                                                ) : (
                                                    "Select Dates"
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0 shadow-xl rounded-2xl overflow-hidden" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    className="p-4"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Guests */}
                    <div className="relative group px-4 py-2 border-l border-slate-100 rounded-xl transition-colors hover:bg-slate-50">
                        <Select value={guests} onValueChange={setGuests}>
                            <SelectTrigger className="w-full h-full border-0 p-0 hover:bg-transparent focus:ring-0 shadow-none">
                                <div className="text-left w-full">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Guests</p>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-primary" />
                                        <span className="text-lg font-semibold text-slate-900">
                                            {guests} {parseInt(guests) === 1 ? 'Guest' : 'Guests'}
                                        </span>
                                    </div>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="border-0 shadow-xl rounded-xl">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                    <SelectItem key={num} value={num.toString()} className="font-medium cursor-pointer">
                                        {num} {num === 1 ? 'Guest' : 'Guests'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Promo Code (Optional, Minimal) */}
                    <div className="hidden md:block px-4 py-2 border-l border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Promo</p>
                        <input
                            className="w-full bg-transparent outline-none text-base font-medium placeholder:text-slate-300"
                            placeholder="Add code"
                        />
                    </div>

                    {/* Search Button */}
                    <div className="pl-2">
                        <Button
                            size="lg"
                            className="w-full h-16 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95"
                            onClick={handleSearch}
                        >
                            Search
                        </Button>
                    </div>
                </div>
            </div>

            {/* Featured Section - Clean & Spatial */}
            {rooms.length > 0 && (
                <div className="container mx-auto px-6 py-24">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Curated Accommodations</h2>
                            <p className="text-slate-500 text-lg max-w-md">
                                Each room is designed for comfort, style, and serenity.
                            </p>
                        </div>
                        <Button variant="ghost" className="text-primary hover:bg-primary/5 hover:text-primary font-semibold group rounded-full px-6">
                            View All Rooms <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="group bg-white rounded-3xl overflow-hidden hover-lift border border-slate-100 cursor-pointer"
                                onClick={handleSearch}
                            >
                                <div className="relative h-72 overflow-hidden">
                                    {room.photos && room.photos.length > 0 ? (
                                        <img
                                            src={room.photos[0].url}
                                            alt={room.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />

                                    {/* Price Tag - Floating */}
                                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg font-bold text-slate-900 border border-slate-100">
                                        {(() => {
                                            const price = room.price_starting_at ?? room.base_price;
                                            if (!price) return '₹0';
                                            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
                                        })()}
                                        <span className="text-xs font-normal text-slate-500 ml-1">/ night</span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="font-bold text-xl text-slate-900 mb-2 group-hover:text-primary transition-colors">{room.name}</h3>
                                    <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                                        {room.description}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            {room.max_occupancy} Guests
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                            King Bed
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Property Highlights - Premium Grid */}
            <div className="bg-slate-50 py-24 border-t border-slate-100 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
                        <span className="text-primary font-bold tracking-widest text-xs uppercase">Why Choose Us</span>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">An Experience Like No Other</h2>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            Discover a world where every detail is curated for your comfort. From arrival to departure, we ensure a seamless stay.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: Wifi, title: "High-Speed Connectivity", desc: "Seamless 5G Wi-Fi throughout the property." },
                            { icon: Coffee, title: "Artisan Breakfast", desc: "Locally sourced organic ingredients served daily." },
                            { icon: CalendarIcon, title: "Flexible Check-In", desc: "Digital self check-in options for your convenience." },
                            { icon: Star, title: "5-Star Concierge", desc: "24/7 dedicated support for all your needs." },
                            { icon: Utensils, title: "Fine Dining", desc: "Award-winning culinary experiences on-site." },
                            { icon: Car, title: "Valet Parking", desc: "Secure, covered parking with EV charging stations." },
                            { icon: Users, title: "Co-Working Spaces", desc: "Quiet, productive environments for business travelers." },
                            { icon: Check, title: "Premium Hygiene", desc: "Hospital-grade cleaning protocols for your safety." },
                        ].map((item, i) => (
                            <div key={i} className="group bg-white rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100/50">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-slate-400">
                                    <item.icon className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Minimal-Footer */}
            <footer className="bg-white border-t border-slate-100 py-12">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">H</div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">{hotel.name}</span>
                    </div>

                    <div className="flex gap-8 text-sm font-medium text-slate-500">
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Contact</a>
                    </div>

                    <div className="text-sm text-slate-400">
                        &copy; {new Date().getFullYear()} Hotelier Hub
                    </div>
                </div>
            </footer>
        </div>
    );
}
