import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, differenceInDays, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';

const formSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    roomTypeId: z.string().min(1, 'Room type is required'),
    checkIn: z.date(),
    checkOut: z.date(),
    pricePerNight: z.coerce.number().min(0, 'Price must be positive'),
});

interface RoomType {
    id: string;
    name: string;
    base_price: number;
}

interface CreateBookingDialogProps {
    onSuccess: () => void;
}

export function CreateBookingDialog({ onSuccess }: CreateBookingDialogProps) {
    const [open, setOpen] = useState(false);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            checkIn: new Date(),
            checkOut: addDays(new Date(), 1),
            pricePerNight: 0,
        },
    });

    useEffect(() => {
        if (open) {
            apiClient.get<RoomType[]>('/rooms').then(setRoomTypes).catch(console.error);
        }
    }, [open]);

    // Update price when room type changes
    const handleRoomTypeChange = (id: string) => {
        const room = roomTypes.find(r => r.id === id);
        if (room) {
            form.setValue('pricePerNight', room.base_price);
        }
        form.setValue('roomTypeId', id);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const nights = differenceInDays(values.checkOut, values.checkIn);
            if (nights < 1) {
                form.setError('checkOut', { message: 'Check-out must be after check-in' });
                return;
            }

            const selectedRoom = roomTypes.find(r => r.id === values.roomTypeId);

            const payload = {
                check_in: format(values.checkIn, 'yyyy-MM-dd'),
                check_out: format(values.checkOut, 'yyyy-MM-dd'),
                guest: {
                    first_name: values.firstName,
                    last_name: values.lastName,
                    email: values.email,
                },
                rooms: [
                    {
                        room_type_id: values.roomTypeId,
                        room_type_name: selectedRoom?.name || 'Unknown',
                        guests: 2, // Default
                        price_per_night: values.pricePerNight,
                        total_price: values.pricePerNight * nights,
                    }
                ],
                source: 'manual'
            };

            await apiClient.post('/bookings', payload);

            toast({
                title: 'Booking Created',
                description: `Booking for ${values.firstName} has been created.`,
            });
            setOpen(false);
            form.reset();
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Failed to create booking',
                description: 'Please try again.',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Booking
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Booking</DialogTitle>
                    <DialogDescription>
                        Enter guest details and room selection to create a manual booking.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="john@example.com" type="email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="roomTypeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Room Type</FormLabel>
                                    <Select onValueChange={handleRoomTypeChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a room" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {roomTypes.map((room) => (
                                                <SelectItem key={room.id} value={room.id}>
                                                    {room.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="checkIn"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Check-in</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="checkOut"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Check-out</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date <= form.getValues('checkIn')}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="pricePerNight"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price Per Night</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormDescription>Override standard rate if needed</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Booking'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
