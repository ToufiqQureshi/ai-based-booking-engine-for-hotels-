import { MoreHorizontal, Users, Bed, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, getImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoomType } from '@/types/api';

interface RoomCardProps {
    room: RoomType;
    onEdit: (room: RoomType) => void;
    onDelete: (id: string) => void;
    formatCurrency: (amount: number) => string;
}

export function RoomCard({ room, onEdit, onDelete, formatCurrency }: RoomCardProps) {
    // Logic to find primary photo or fallback to first
    const primaryPhoto = room.photos?.find(p => p.is_primary) ?? room.photos?.[0];

    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-none ring-1 ring-border/50">
            <div className="aspect-video relative overflow-hidden bg-muted flex items-center justify-center">
                {primaryPhoto ? (
                    <img
                        src={getImageUrl(primaryPhoto.url)}
                        alt={room.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                        <Bed className="h-12 w-12 mb-2" />
                        <span className="text-xs font-medium">No Image</span>
                    </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                    {room.is_active ? (
                        <Badge className="bg-emerald-500/90 hover:bg-emerald-500 backdrop-blur-sm shadow-sm">Active</Badge>
                    ) : (
                        <Badge variant="secondary" className="backdrop-blur-sm shadow-sm bg-background/80">Inactive</Badge>
                    )}
                </div>
            </div>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold tracking-tight">{room.name}</CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(room)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(room.id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Room
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5em]">{room.description || 'No description available for this room type.'}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5" title="Occupancy">
                            <Users className="h-4 w-4" />
                            {room.base_occupancy}-{room.max_occupancy}
                        </span>
                        <span className="flex items-center gap-1.5" title="Inventory">
                            <Bed className="h-4 w-4" />
                            {room.total_inventory}
                        </span>
                    </div>
                    <span className="font-bold text-primary">{formatCurrency(room.base_price)}<span className="text-xs font-normal text-muted-foreground">/night</span></span>
                </div>
            </CardContent>
        </Card>
    );
}
