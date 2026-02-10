import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/api/client';
import { RoomType, Amenity } from '@/types/api';
import { useToast } from '@/hooks/use-toast';
import { RoomImageUploader } from './RoomImageUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const roomSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    base_price: z.coerce.number().min(0, 'Price must be positive'),
    total_inventory: z.coerce.number().min(0, 'Inventory must be positive'),
    base_occupancy: z.coerce.number().min(1, 'At least 1 person'),
    max_occupancy: z.coerce.number().min(1, 'At least 1 person'),
    max_children: z.coerce.number().min(0, 'Cannot be negative'),
    extra_bed_allowed: z.boolean().default(false),
    photos: z.array(z.object({
        id: z.string().optional(),
        url: z.string(),
        caption: z.string().optional(),
        is_primary: z.boolean(),
        order: z.number(),
    })).default([]),
    amenity_ids: z.array(z.string()).default([]),
});

interface RoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialData?: RoomType | null;
}

export function RoomDialog({ open, onOpenChange, onSuccess, initialData }: RoomDialogProps) {
    const { toast } = useToast();
    const isEditing = !!initialData;

    const form = useForm<z.infer<typeof roomSchema>>({
        resolver: zodResolver(roomSchema),
        defaultValues: {
            name: '',
            description: '',
            base_price: 0,
            total_inventory: 1,
            base_occupancy: 2,
            max_occupancy: 2,
            max_children: 0,
            extra_bed_allowed: false,
            photos: [],
        },
    });

    const [availableAmenities, setAvailableAmenities] = useState<Amenity[]>([]);

    useEffect(() => {
        // Fetch global amenities
        const loadAmenities = async () => {
            try {
                const data = await apiClient.get<Amenity[]>('/amenities');
                setAvailableAmenities(data);
            } catch (e) {
                console.error("Failed to load amenities", e);
            }
        };
        if (open) loadAmenities();
    }, [open]);

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset({
                    name: initialData.name,
                    description: initialData.description || '',
                    base_price: initialData.base_price,
                    total_inventory: initialData.total_inventory,
                    base_occupancy: initialData.base_occupancy,
                    max_occupancy: initialData.max_occupancy,
                    max_children: initialData.max_children || 0,
                    extra_bed_allowed: initialData.extra_bed_allowed || false,
                    photos: initialData.photos || [],
                    // Map existing Linked Amenities to IDs
                    // If backend sends 'amenities' as objects, we map them to IDs
                    amenity_ids: initialData.amenities?.map(a => a.id) || [],
                });
            } else {
                form.reset({
                    name: '',
                    description: '',
                    base_price: 0,
                    total_inventory: 1,
                    base_occupancy: 2,
                    max_occupancy: 2,
                    max_children: 0,
                    extra_bed_allowed: false,
                    photos: [],
                    amenity_ids: [],
                });
            }
        }
    }, [open, initialData, form]);

    const onSubmit = async (values: z.infer<typeof roomSchema>) => {
        try {
            if (isEditing && initialData) {
                await apiClient.patch(`/rooms/${initialData.id}`, values);
                toast({ title: 'Room Updated', description: 'Room details have been saved.' });
            } else {
                await apiClient.post('/rooms', values);
                toast({ title: 'Room Created', description: 'New room type has been added.' });
            }
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to save room details.',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Room Type' : 'Add Room Type'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modify existing room details.' : 'Create a new room category for your hotel.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Room Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Deluxe Suite" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Room amenities and details..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Images */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Room Photos</h3>
                            <FormField
                                control={form.control}
                                name="photos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <RoomImageUploader
                                                images={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Amenities Selection */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Room Amenities</h3>
                            <FormField
                                control={form.control}
                                name="amenity_ids"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-base">Select Amenities</FormLabel>
                                            <DialogDescription>
                                                Choose features available in this room type.
                                            </DialogDescription>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {availableAmenities.map((amenity) => (
                                                <FormField
                                                    key={amenity.id}
                                                    control={form.control}
                                                    name="amenity_ids"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={amenity.id}
                                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(amenity.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, amenity.id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== amenity.id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal text-sm cursor-pointer">
                                                                    {amenity.name}
                                                                    {amenity.is_featured && <Badge variant="outline" className="ml-2 text-[10px] h-4">Featured</Badge>}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Capacity & Pricing */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Capacity & Pricing</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="base_price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Base Price (₹)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="total_inventory"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total Rooms</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="base_occupancy"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Base Occ.</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="max_occupancy"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Occ.</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="max_children"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Child</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="extra_bed_allowed"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Extra Bed Allowed
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Save Changes' : 'Create Room'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
