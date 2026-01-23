import { MoreHorizontal, Users, Bed, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoomType } from '@/types/api';

interface RoomListItemProps {
    room: RoomType;
    onEdit: (room: RoomType) => void;
    onDelete: (id: string) => void;
    formatCurrency: (amount: number) => string;
}

export function RoomListItem({ room, onEdit, onDelete, formatCurrency }: RoomListItemProps) {
    const primaryPhoto = room.photos?.find(p => p.is_primary) ?? room.photos?.[0];

    return (
        <div className="flex items-center gap-4 p-4 group hover:bg-muted/50 transition-colors">
            <div className="h-16 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border relative">
                {primaryPhoto ? (
                    <img
                        src={primaryPhoto.url}
                        alt={room.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Bed className="h-6 w-6 text-muted-foreground/50" />
                )}
            </div>

            <div className="flex-1 min-w-0 grid gap-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{room.name}</h3>
                    {room.is_active ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>
                    ) : (
                        <Badge variant="secondary">Inactive</Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{room.description || 'No description'}</p>
            </div>

            <div className="flex items-center gap-6 text-sm tabular-nums shrink-0">
                <span className="flex items-center gap-1.5 text-muted-foreground w-16" title="Occupancy">
                    <Users className="h-4 w-4" />
                    {room.base_occupancy}-{room.max_occupancy}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground w-16" title="Inventory">
                    <Bed className="h-4 w-4" />
                    {room.total_inventory}
                </span>
                <span className="font-semibold w-24 text-right">
                    {formatCurrency(room.base_price)}
                </span>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(room)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(room.id)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
