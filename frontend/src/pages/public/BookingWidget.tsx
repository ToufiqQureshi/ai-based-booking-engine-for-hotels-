
import { useState } from 'react';
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

export default function BookingWidget() {
    const { hotelSlug } = useParams();
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 1),
    });
    const [guests, setGuests] = useState('2');
    const [promoCode, setPromoCode] = useState('');

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
        <div className="bg-transparent p-2 font-sans h-full w-full flex items-center justify-center">
            {/* Widget Container - Forced Horizontal Grid */}
            <div className="bg-white rounded-full shadow-lg shadow-slate-200/50 p-1.5 pl-6 grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 items-center w-full border border-slate-100">

                {/* Check-in / Check-out */}
                < div className="relative group py-2 border-r border-slate-100 pr-4" >
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"ghost"}
                                className={cn(
                                    "w-full h-full justify-start text-left font-normal p-0 hover:bg-transparent h-auto",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Check In - Out</p>
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-bold text-slate-900 truncate">
                                            {date?.from ? (
                                                date.to ? (
                                                    `${format(date.from, "dd MMM")} — ${format(date.to, "dd MMM")}`
                                                ) : (
                                                    format(date.from, "dd MMM")
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
                                numberOfMonths={1}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                className="p-4"
                            />
                        </PopoverContent>
                    </Popover>
                </div >

                {/* Guests */}
                < div className="relative group py-2 border-r border-slate-100 pr-4" >
                    <Select value={guests} onValueChange={setGuests}>
                        <SelectTrigger className="w-full h-auto border-0 p-0 hover:bg-transparent focus:ring-0 shadow-none">
                            <div className="text-left w-full">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Guests</p>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-bold text-slate-900">
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
                </div >

                {/* Promo Code */}
                < div className="py-2" >
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Promo Code</p>
                    <input
                        className="w-full bg-transparent outline-none text-sm font-bold placeholder:text-slate-300 placeholder:font-normal"
                        placeholder="Optional"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                    />
                </div >

                {/* Search Button */}
                < div >
                    <Button
                        size="lg"
                        className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-105 transition-all duration-300"
                        onClick={handleSearch}
                    >
                        Check Availability
                    </Button>
                </div >
            </div >
        </div >
    );
}
