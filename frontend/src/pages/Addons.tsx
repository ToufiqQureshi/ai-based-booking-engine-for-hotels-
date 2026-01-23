
import { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Loader2, Sparkles, Pencil, Trash2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';
import { AddOn } from '@/types/api';
import { AddonDialog } from '@/components/addons/AddonDialog';
import { getImageUrl } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function AddonsPage() {
    const [addons, setAddons] = useState<AddOn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAddon, setSelectedAddon] = useState<AddOn | null>(null);

    const fetchAddons = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await apiClient.get<AddOn[]>('/addons');
            setAddons(data);
        } catch (error) {
            console.error('Failed to fetch addons:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load add-ons. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAddons();
    }, [fetchAddons]);

    const handleCreateOpen = () => {
        setSelectedAddon(null);
        setIsDialogOpen(true);
    };

    const handleEditOpen = (addon: AddOn) => {
        setSelectedAddon(addon);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service?")) return;

        try {
            await apiClient.delete(`/addons/${id}`);
            toast({ title: 'Deleted', description: 'Add-on deleted successfully.' });
            fetchAddons();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete add-on.',
            });
        }
    };

    const filteredAddons = addons.filter(addon =>
        addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        addon.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Add-on Services</h1>
                    <p className="text-muted-foreground">Manage extra services like spa, dining, and transport.</p>
                </div>
                <Button className="gap-2" onClick={handleCreateOpen}>
                    <Plus className="h-4 w-4" />
                    Add Service
                </Button>
            </div>

            <AddonDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={fetchAddons}
                initialData={selectedAddon}
            />

            <div className="flex items-center justify-between bg-background/95 backdrop-blur z-10 py-2">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search services..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredAddons.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Services Yet</h3>
                        <p className="text-muted-foreground text-center mt-1">
                            Enhance guest experience by adding extra services.
                        </p>
                        <Button className="mt-4" onClick={handleCreateOpen}>
                            Add First Service
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAddons.map((addon) => (
                                <TableRow key={addon.id}>
                                    <TableCell>
                                        <div className="h-10 w-16 rounded overflow-hidden bg-muted relative">
                                            {addon.image_url ? (
                                                <img
                                                    src={getImageUrl(addon.image_url)}
                                                    alt={addon.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                                                    <ImageOff className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div>{addon.name}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {addon.description}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="uppercase text-[10px]">
                                            {addon.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>₹{addon.price.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={addon.is_active ? 'default' : 'destructive'} className={addon.is_active ? "bg-green-500 hover:bg-green-600" : ""}>
                                            {addon.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditOpen(addon)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(addon.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
