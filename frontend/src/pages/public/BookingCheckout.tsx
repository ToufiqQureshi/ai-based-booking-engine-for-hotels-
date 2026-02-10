import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, User, Mail, Phone, Calendar, ShieldCheck, CreditCard, Sparkles, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/api/client';
import { AddOn } from '@/types/api';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { BookingStepper } from '@/components/public/BookingStepper';

interface BookingState {
    checkInDate: Date;
    checkOutDate: Date;
    guests: number;
    rooms: any[];
    totalRoomPrice: number;
    addons?: AddOn[];
}
interface CheckoutFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialRequests?: string;
    promoCode?: string;
}

export default function BookingCheckout() {
    const { hotelSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormData>();

    const state = location.state as BookingState;

    if (!state || !state.rooms || state.rooms.length === 0 || !state.checkInDate || !state.checkOutDate) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
                <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Session Expired</h2>
                <p className="text-slate-500">Please start your search again to find the best rates.</p>
                <Button onClick={() => navigate(`/book/${hotelSlug}/rooms`)} size="lg" className="rounded-full px-8">Back to Search</Button>
            </div>
        )
    }

    const room = state.rooms[0];
    const nights = (new Date(state.checkOutDate).getTime() - new Date(state.checkInDate).getTime()) / (1000 * 60 * 60 * 24);

    const onSubmit = async (data: CheckoutFormData) => {
        try {
            setIsSubmitting(true);

            const bookingPayload = {
                check_in: state.checkInDate,
                check_out: state.checkOutDate,
                guest: {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    nationality: 'IN',
                    id_type: 'passport',
                    id_number: 'PENDING'
                },
                rooms: state.rooms.map((room) => ({
                    room_type_id: room.id,
                    room_type_name: room.name,
                    price_per_night: room.rate_options[0].price_per_night,
                    total_price: room.rate_options[0].total_price,
                    guests: state.guests,
                    rate_plan_id: room.rate_options[0].id,
                    rate_plan_name: room.rate_options[0].name
                })),
                addons: state.addons ? state.addons.map(a => ({
                    id: a.id,
                    name: a.name,
                    price: a.price
                })) : [],
                promo_code: data.promoCode,
                special_requests: data.specialRequests
            };

            const response = await apiClient.post('/public/bookings', bookingPayload);

            navigate(`/book/${hotelSlug}/confirmation`, {
                state: { booking: response }
            });

        } catch (error) {
            console.error('Booking failed:', error);
            toast({
                variant: "destructive",
                title: "Booking Failed",
                description: "Something went wrong. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const addonsTotal = state.addons?.reduce((sum, a) => sum + a.price, 0) || 0;
    const grandTotal = state.totalRoomPrice + addonsTotal;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 selection:bg-primary/10">
            {/* Stepper Header */}
            <BookingStepper currentStep={4} />

            <div className="max-w-6xl mx-auto px-4 mt-8">
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Secure Your Stay</h1>
                    <p className="text-slate-500">Complete your reservation in just a few steps.</p>
                </div>

                <div className="grid gap-12 lg:grid-cols-[1fr,420px]">
                    {/* Left Column: Form */}
                    <div className="space-y-8 animate-enter">
                        {/* Guest Section */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Guest Information</h2>
                                    <p className="text-sm text-slate-500">Who will be staying?</p>
                                </div>
                            </div>

                            <form id="booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName" className="text-xs uppercase tracking-wider text-slate-500 font-bold">First Name</Label>
                                        <Input
                                            id="firstName"
                                            placeholder="Eg. John"
                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            {...register('firstName', { required: 'First name is required' })}
                                        />
                                        {errors.firstName && <span className="text-xs text-red-500 font-medium">{errors.firstName.message}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Eg. Doe"
                                            className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            {...register('lastName', { required: 'Last name is required' })}
                                        />
                                        {errors.lastName && <span className="text-xs text-red-500 font-medium">{errors.lastName.message}</span>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                                placeholder="john@example.com"
                                                {...register('email', {
                                                    required: 'Email is required',
                                                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                                                })}
                                            />
                                        </div>
                                        {errors.email && <span className="text-xs text-red-500 font-medium">{errors.email.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="phone"
                                                type="tel"
                                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                                placeholder="+91 98765 43210"
                                                {...register('phone', { required: 'Phone is required' })}
                                            />
                                        </div>
                                        {errors.phone && <span className="text-xs text-red-500 font-medium">{errors.phone.message}</span>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="requests" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Special Requests</Label>
                                    <Textarea
                                        id="requests"
                                        placeholder="Any specific preferences? (Optional)"
                                        className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white transition-all resize-none"
                                        {...register('specialRequests')}
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Payment Section */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Payment Details</h2>
                                        <p className="text-sm text-green-600 font-medium">No prepayment needed today</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/50 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                                <CreditCard className="w-8 h-8 text-slate-400" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900">Pay at Property</h3>
                                    <p className="text-sm text-slate-500">Your card is only needed to guarantee your booking. You'll pay when you arrive.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Summary */}
                    <div className="lg:sticky lg:top-8 h-fit animate-enter" style={{ animationDelay: '0.1s' }}>
                        <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
                            {/* Room Image Header */}
                            <div className="h-48 relative bg-slate-200">
                                {room.photos && room.photos.length > 0 ? (
                                    <img src={room.photos[0].url} alt="Room" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-4 left-6 text-white">
                                    <h3 className="font-bold text-xl mb-1">{room.name}</h3>
                                    <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-0">
                                        {room.rate_options[0].name}
                                    </Badge>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Date Timeline */}
                                <div className="flexItems-center justify-between relative pl-4">
                                    <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-slate-100"></div>
                                    <div className="space-y-6">
                                        <div className="relative pl-6">
                                            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-primary bg-white z-10" />
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Check-in</p>
                                            <p className="font-semibold text-slate-900">{format(new Date(state.checkInDate), 'EEE, MMM dd')}</p>
                                            <p className="text-xs text-slate-500">From 2:00 PM</p>
                                        </div>
                                        <div className="relative pl-6">
                                            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 z-10" />
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Check-out</p>
                                            <p className="font-semibold text-slate-900">{format(new Date(state.checkOutDate), 'EEE, MMM dd')}</p>
                                            <p className="text-xs text-slate-500">Until 11:00 AM</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Price Breakdown */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">{room.name} x {nights} nights</span>
                                        <span className="font-medium text-slate-900">{formatCurrency(state.totalRoomPrice)}</span>
                                    </div>

                                    {state.addons && state.addons.length > 0 && (
                                        <div className="space-y-2 pt-2">
                                            {state.addons.map((addon, index) => (
                                                <div key={index} className="flex justify-between text-sm text-slate-500">
                                                    <span className="flex items-center"><Sparkles className="w-3 h-3 mr-1 text-primary" /> {addon.name}</span>
                                                    <span>{formatCurrency(addon.price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between text-sm text-green-600 pt-2">
                                        <span>Taxes & Fees</span>
                                        <span className="font-bold">Included</span>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
                                        <span className="text-3xl font-bold text-slate-900 tracking-tight">{formatCurrency(grandTotal)}</span>
                                    </div>
                                    <p className="text-xs text-right text-slate-400">Includes all taxes and charges</p>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                                    type="submit"
                                    form="booking-form"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Confirming...
                                        </>
                                    ) : (
                                        <>
                                            Complete Booking <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="text-center mt-6">
                            <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                By proceeding, you agree to our <a href="#" className="underline hover:text-primary">Terms of Service</a> and <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
