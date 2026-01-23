import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, User, Wifi, Calendar as CalendarIcon, Search, ShoppingBag, Plus, Check, ArrowRight, BedDouble, Utensils, Info, Tv, Coffee, Snowflake, Waves, Dumbbell, Car, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/api/client';
import { PublicRoomSearchResult, RateOption, AddOn } from '@/types/api';
import { RoomDetailModal } from '@/components/public/RoomDetailModal';
import { BookingStepper } from '@/components/public/BookingStepper'; // New Component
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn, getImageUrl } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";

export default function BookingSelection() {
    const { hotelSlug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [rooms, setRooms] = useState<PublicRoomSearchResult[]>([]);
    const [addons, setAddons] = useState<AddOn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<PublicRoomSearchResult | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Icon Mapping (Should theoretically be shared but duplicating for speed)
    const ICONS: Record<string, any> = {
        wifi: Wifi,
        tv: Tv,
        coffee: Coffee,
        snowflake: Snowflake,
        waves: Waves,
        dumbbell: Dumbbell,
        car: Car,
        utensils: Utensils,
        star: Star
    };

    // Addon Sheet State
    const [isAddonSheetOpen, setIsAddonSheetOpen] = useState(false);
    const [selectedRatePlan, setSelectedRatePlan] = useState<RateOption | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<AddOn[]>([]);
    const [pendingRoom, setPendingRoom] = useState<PublicRoomSearchResult | null>(null);

    // Search State
    const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
    const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
    const [guestCount, setGuestCount] = useState('2');
    const [promoCode, setPromoCode] = useState('');

    const location = useLocation();

    // Extract params and init state
    const checkIn = searchParams.get('check_in');
    const checkOut = searchParams.get('check_out');
    const guests = searchParams.get('guests');
    const urlPromo = searchParams.get('promo_code');

    useEffect(() => {
        // Fallback to location state if URL params are missing
        const state = location.state as any;

        if (checkIn) setCheckInDate(new Date(checkIn));
        else if (state?.checkInDate) setCheckInDate(new Date(state.checkInDate));

        if (checkOut) setCheckOutDate(new Date(checkOut));
        else if (state?.checkOutDate) setCheckOutDate(new Date(state.checkOutDate));

        if (guests) setGuestCount(guests);
        else if (state?.guests) setGuestCount(state.guests);

        if (urlPromo) setPromoCode(urlPromo);
    }, [checkIn, checkOut, guests, urlPromo, location.state]);

    const handleSearch = () => {
        if (!hotelSlug || !checkInDate || !checkOutDate) return;
        const params = new URLSearchParams({
            check_in: format(checkInDate, 'yyyy-MM-dd'),
            check_out: format(checkOutDate, 'yyyy-MM-dd'),
            guests: guestCount,
            promo_code: promoCode
        });

        navigate(`/book/${hotelSlug}/rooms?${params.toString()}`);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!hotelSlug || !checkIn || !checkOut) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const queryGuests = guests || '1';

                const query = new URLSearchParams({
                    check_in: checkIn,
                    check_out: checkOut,
                    guests: queryGuests,
                    promo_code: urlPromo || ''
                }).toString();

                const [roomsData, addonsData] = await Promise.all([
                    apiClient.get<PublicRoomSearchResult[]>(`/public/hotels/${hotelSlug}/rooms?${query}`),
                    apiClient.get<AddOn[]>(`/public/hotels/${hotelSlug}/addons`)
                ]);

                setRooms(roomsData);
                setAddons(addonsData.filter(a => a.is_active !== false));
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [hotelSlug, checkIn, checkOut, guests, urlPromo]);

    const handleSelectRate = (room: PublicRoomSearchResult, ratePlan: RateOption) => {
        setPendingRoom(room);
        setSelectedRatePlan(ratePlan);
        setSelectedAddons([]);
        setIsAddonSheetOpen(true);
    };

    const toggleAddon = (addon: AddOn) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.id === addon.id);
            if (exists) {
                return prev.filter(a => a.id !== addon.id);
            } else {
                return [...prev, addon];
            }
        });
    };

    const handleProceedToCheckout = () => {
        if (!pendingRoom || !selectedRatePlan) return;

        navigate(`/book/${hotelSlug}/checkout`, {
            state: {
                checkInDate,
                checkOutDate,
                guests: guests || '1',
                rooms: [{
                    ...pendingRoom,
                    price_per_night: selectedRatePlan.price_per_night,
                    total_price: selectedRatePlan.total_price,
                    rate_plan_id: selectedRatePlan.id,
                    rate_plan_name: selectedRatePlan.name
                }],
                totalRoomPrice: selectedRatePlan.total_price,
                addons: selectedAddons
            }
        });
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[600px] bg-slate-50">
                <BookingStepper currentStep={2} />
                <div className="flex flex-col items-center animate-pulse gap-4 mt-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-slate-400 font-medium tracking-wide text-sm uppercase">Checking Availability...</p>
                </div>
            </div>
        );
    }

    const grandTotal = (selectedRatePlan?.total_price || 0) + selectedAddons.reduce((sum, a) => sum + a.price, 0);

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            {/* 1. Header with Stepper */}
            <BookingStepper currentStep={2} />

            <div className="max-w-7xl mx-auto px-4 mt-8">
                {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-md border border-slate-200">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {(!checkInDate || !checkOutDate) ? "Select Dates" : "No rooms available"}
                        </h3>
                        <p className="text-slate-500 mb-6">
                            {(!checkInDate || !checkOutDate) ? "Please select check-in and check-out dates." : "Try changing your dates."}
                        </p>
                        <Button variant="outline" onClick={() => navigate(`/book/${hotelSlug}`)}>Modify Search</Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Inline Search Modifier (Dense) */}
                        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between text-sm">
                            <div className="flex items-center gap-6">
                                <div>
                                    <span className="block text-slate-400 text-xs font-bold uppercase">Dates</span>
                                    <span className="font-semibold text-slate-900">{checkInDate && format(checkInDate, 'dd MMM')} - {checkOutDate && format(checkOutDate, 'dd MMM')}</span>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div>
                                    <span className="block text-slate-400 text-xs font-bold uppercase">Guests</span>
                                    <span className="font-semibold text-slate-900">{guestCount} Guests</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold" onClick={() => document.getElementById('search-bar')?.scrollIntoView()}>
                                Change
                            </Button>
                        </div>

                        {/* Room List (Dense / OTA Style) */}
                        {rooms.map((room) => (
                            <div key={room.id} className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col md:flex-row group">
                                {/* Thumbnail */}
                                <div className="md:w-64 md:h-auto h-48 relative shrink-0 cursor-pointer" onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }}>
                                    {room.photos && room.photos.length > 0 ? (
                                        <img src={room.photos[0].url} alt={room.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">No Image</div>
                                    )}
                                    <div className="absolute bottom-2 left-2">
                                        <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/90 backdrop-blur" onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); setIsModalOpen(true); }}>
                                            <Info className="w-3 h-3 mr-1" /> Room Details
                                        </Button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer" onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }}>
                                                {room.name}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50">
                                                <User className="w-3 h-3 mr-1" /> Max {room.max_occupancy || 2}
                                            </Badge>

                                            {/* Dynamic Amenities */}
                                            {room.amenities && room.amenities.length > 0 ? (
                                                room.amenities.map((amenity) => {
                                                    const Icon = ICONS[amenity.icon_slug] || Star;
                                                    return (
                                                        <Badge key={amenity.id} variant="outline" className={cn("font-normal text-slate-600 bg-slate-50", amenity.is_featured && "border-primary/30 bg-primary/5 text-primary")}>
                                                            <Icon className="w-3 h-3 mr-1" /> {amenity.name}
                                                        </Badge>
                                                    );
                                                })
                                            ) : (
                                                // Fallback if no amenities linked
                                                <>
                                                    <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50"><BedDouble className="w-3 h-3 mr-1" /> King Bed</Badge>
                                                    <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50"><Wifi className="w-3 h-3 mr-1" /> Free Wifi</Badge>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rate Plans Table */}
                                    <div className="space-y-3 mt-4 border-t border-slate-100 pt-4">
                                        {(room.rate_options || []).map((plan) => (
                                            <div key={plan.id} className="flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 border border-slate-200 rounded-md p-3 hover:border-primary/50 transition-colors">
                                                <div className="mb-2 sm:mb-0 w-full sm:w-auto">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900">{plan.name}</span>
                                                        {plan.savings_text && (
                                                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
                                                                {plan.savings_text}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                                        <span className="flex items-center"><Utensils className="w-3 h-3 mr-1" /> {plan.name.includes('Breakfast') ? 'Breakfast Included' : 'Room Only'}</span>
                                                        <span className="flex items-center text-green-600"><Check className="w-3 h-3 mr-1" /> Free Cancellation</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                                                    <div className="text-right">
                                                        {plan.savings_text && <span className="block text-xs text-slate-400 line-through">{formatCurrency(plan.total_price * 1.15)}</span>}
                                                        <span className="block font-bold text-lg text-slate-900">{formatCurrency(plan.total_price)}</span>
                                                        <span className="block text-[10px] text-slate-400">Total Price</span>
                                                    </div>
                                                    <Button
                                                        className="font-bold shadow-sm bg-primary hover:bg-primary/90"
                                                        onClick={() => handleSelectRate(room, plan)}
                                                    >
                                                        Book Now
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Room Detail Modal (Preserved) */}
            <RoomDetailModal
                room={selectedRoom}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onBook={handleSelectRate}
                guests={guests || '1'}
            />

            {/* Add-on Sidebar (Sheet) */}
            <Sheet open={isAddonSheetOpen} onOpenChange={setIsAddonSheetOpen}>
                <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col border-l shadow-2xl">
                    <SheetHeader className="p-6 border-b bg-slate-50">
                        <Badge className="w-fit mb-2 bg-slate-200 text-slate-700 hover:bg-slate-300 border-0">Step 3 of 4</Badge>
                        <SheetTitle className="text-xl font-bold text-slate-900">Enhance Your Stay</SheetTitle>
                        <SheetDescription>Optional extras for {pendingRoom?.name}</SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {addons.length === 0 ? (
                            <div className="text-center py-10 space-y-2">
                                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                                <p className="text-slate-500">No add-ons available.</p>
                            </div>
                        ) : (
                            addons.map((addon) => {
                                const isSelected = selectedAddons.some(a => a.id === addon.id);
                                return (
                                    <div
                                        key={addon.id}
                                        className={cn(
                                            "flex gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                                            isSelected ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/30"
                                        )}
                                        onClick={() => toggleAddon(addon)}
                                    >
                                        <div className="w-16 h-16 bg-slate-100 rounded-md overflow-hidden shrink-0">
                                            {addon.image_url ? (
                                                <img src={getImageUrl(addon.image_url)} className="w-full h-full object-cover" />
                                            ) : (
                                                <ShoppingBag className="w-6 h-6 m-auto mt-5 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between font-bold text-slate-900">
                                                <span>{addon.name}</span>
                                                <span>₹{addon.price}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{addon.description}</p>
                                            {isSelected ? (
                                                <div className="mt-2 text-xs font-bold text-primary flex items-center"><Check className="w-3 h-3 mr-1" /> Added</div>
                                            ) : (
                                                <div className="mt-2 text-xs font-bold text-slate-400 flex items-center"><Plus className="w-3 h-3 mr-1" /> Add</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <SheetFooter className="p-6 border-t bg-white flex-col gap-4">
                        <div className="flex justify-between items-end">
                            <div className="text-sm">
                                <p className="text-slate-500">Room Total</p>
                                <p className="font-bold">{formatCurrency(selectedRatePlan?.total_price)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-400 text-xs uppercase font-bold">Grand Total</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrency(grandTotal)}</p>
                            </div>
                        </div>
                        <Button size="lg" className="w-full font-bold text-lg" onClick={handleProceedToCheckout}>
                            Confirm & Checkout <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
