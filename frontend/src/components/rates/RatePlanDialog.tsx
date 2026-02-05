import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';
import { RatePlan } from '@/types/api';

const ratePlanSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    // meal_plan: z.string(), // REMOVED as per user request
    price_adjustment: z.coerce.number().min(0, 'Must be positive'),
    is_refundable: z.boolean(),
    cancellation_hours: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)),
    is_active: z.boolean(),
});

interface RatePlanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    planToEdit?: RatePlan | null; // If present, we are editing
    onSuccess: () => void;
}

export function RatePlanDialog({ open, onOpenChange, planToEdit, onSuccess }: RatePlanDialogProps) {
    const { toast } = useToast();
    const isEditing = !!planToEdit;

    const form = useForm<z.infer<typeof ratePlanSchema>>({
        resolver: zodResolver(ratePlanSchema),
        defaultValues: {
            name: '',
            description: '',
            // meal_plan: 'RO',
            price_adjustment: 0,
            is_refundable: true,
            cancellation_hours: 24,
            is_active: true,
        },
    });

    useEffect(() => {
        if (planToEdit) {
            form.reset({
                name: planToEdit.name,
                description: planToEdit.description || '',
                // meal_plan: planToEdit.meal_plan,
                price_adjustment: planToEdit.price_adjustment || 0,
                is_refundable: planToEdit.is_refundable,
                cancellation_hours: planToEdit.cancellation_hours,
                is_active: planToEdit.is_active,
            });
        } else {
            form.reset({
                name: '',
                description: '',
                // meal_plan: 'RO',
                price_adjustment: 0,
                is_refundable: true,
                cancellation_hours: 24,
                is_active: true,
            });
        }
    }, [planToEdit, form, open]);

    const onSubmit = async (values: z.infer<typeof ratePlanSchema>) => {
        try {
            if (isEditing) {
                await apiClient.patch(`/rates/plans/${planToEdit.id}`, values);
                toast({
                    title: 'Rate Plan Updated',
                    description: 'Changes saved successfully.',
                });
            } else {
                await apiClient.post('/rates/plans', values);
                toast({
                    title: 'Rate Plan Created',
                    description: 'New rate plan added successfully.',
                });
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Failed to ${isEditing ? 'update' : 'create'} rate plan.`,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Rate Plan' : 'Add New Rate Plan'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modify existing rate plan details.' : 'Create a new pricing strategy for your rooms.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rate Plan Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Bed & Breakfast, Special Deal" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Short description for guests" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            {/* REMOVED MEAL PLAN SELECTION */}

                            <FormField
                                control={form.control}
                                name="price_adjustment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Extra Rate (Markup)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                                <Input type="number" min={0} className="pl-7" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormDescription>Added to room base price per night</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cancellation_hours"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cancellation (Hours)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} value={field.value} onChange={e => field.onChange(e.target.value)} />
                                        </FormControl>
                                        <FormDescription>Hours before check-in</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
                            <FormField
                                control={form.control}
                                name="is_refundable"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg p-0">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Refundable</FormLabel>
                                            <FormDescription>
                                                Can guests cancel for a refund?
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg p-0">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Active Status</FormLabel>
                                            <FormDescription>
                                                Visible to guests on booking engine
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
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
                                {isEditing ? 'Save Changes' : 'Create Plan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
