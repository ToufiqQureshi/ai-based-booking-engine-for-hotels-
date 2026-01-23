// Availability Page - Real API Integration
import { ChevronLeft, ChevronRight, Edit2, Lock, Unlock, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { BulkUpdateDialog } from '@/components/availability/BulkUpdateDialog';
import { ManageOccupancyDialog } from '@/components/availability/ManageOccupancyDialog';

interface AvailabilityDay {
  date: string;
  totalRooms: number;
  bookedRooms: number;
  availableRooms: number;
  isBlocked: boolean;
  blockedRooms?: number;
}

interface RoomAvailability {
  id: string;
  name: string;
  totalInventory: number;
  availability: AvailabilityDay[];
}

export function AvailabilityPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilityData, setAvailabilityData] = useState<RoomAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // Cell Management Dialog
  const [selectedCell, setSelectedCell] = useState<{ room: { id: string, name: string }, date: Date } | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  const { toast } = useToast();

  const handleCellClick = (room: any, date: Date) => {
    setSelectedCell({ room: { id: room.id, name: room.name }, date });
    setIsManageDialogOpen(true);
  };

  const daysToShow = 14;

  const generateDates = (startDate: Date, days: number) => {
    const dates = [];
    for (let i = 0; i < days; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  };

  const dates = generateDates(currentDate, daysToShow);

  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      const startDateStr = format(dates[0], 'yyyy-MM-dd');
      const endDateStr = format(dates[dates.length - 1], 'yyyy-MM-dd');

      const data = await apiClient.get<RoomAvailability[]>('/availability', {
        start_date: startDateStr,
        end_date: endDateStr
      });
      setAvailabilityData(data);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load availability data.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [currentDate]);

  const getAvailabilityColor = (available: number, total: number, isBlocked: boolean) => {
    if (isBlocked) return 'bg-muted text-muted-foreground';
    if (total === 0) return 'bg-muted text-muted-foreground';
    const ratio = available / total;
    if (ratio === 0) return 'bg-destructive/10 text-destructive';
    if (ratio < 0.3) return 'bg-warning/10 text-warning';
    return 'bg-success/10 text-success';
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = addDays(currentDate, direction === 'next' ? daysToShow : -daysToShow);
    setCurrentDate(newDate);
  };

  const filteredData = selectedRoomType === 'all'
    ? availabilityData
    : availabilityData.filter(r => r.id === selectedRoomType);

  if (isLoading && availabilityData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading availability...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
          <p className="text-muted-foreground">
            Real-time room inventory management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsBulkDialogOpen(true)}>
            <Edit2 className="h-4 w-4" />
            Bulk Block
          </Button>
        </div>
      </div>

      <BulkUpdateDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        roomTypes={availabilityData.map(r => ({ id: r.id, name: r.name, totalInventory: r.totalInventory }))}
        onSuccess={fetchAvailability}
      />

      <ManageOccupancyDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        roomType={selectedCell?.room || null}
        date={selectedCell?.date || null}
        onSuccess={fetchAvailability}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Room Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Room Types</SelectItem>
            {availabilityData.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-success/20"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-warning/20"></div>
          <span>Limited</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-destructive/20"></div>
          <span>Sold Out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted"></div>
          <span>Blocked/None</span>
        </div>
      </div>

      {/* Availability Grid */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="min-w-[900px]">
            {/* Header Row - Dates */}
            <div className="grid grid-cols-[180px_repeat(14,1fr)] border-b bg-muted/30">
              <div className="p-3 font-medium">Room Type</div>
              {dates.map((date) => (
                <div
                  key={date.toISOString()}
                  className="p-2 text-center text-xs border-l"
                >
                  <div className="font-medium">{format(date, 'EEE, MMM d')}</div>
                </div>
              ))}
            </div>

            {/* Room Type Rows */}
            {filteredData.map((room) => (
              <div
                key={room.id}
                className="grid grid-cols-[180px_repeat(14,1fr)] border-b last:border-0"
              >
                <div className="p-3 flex items-center">
                  <span className="font-medium text-sm">{room.name}</span>
                </div>
                {/* Map over the dates array to ensure alignment, finding matching data via date string */}
                {dates.map((date, index) => {
                  const dayStr = format(date, 'yyyy-MM-dd');
                  const dayData = room.availability.find(d => d.date === dayStr);
                  // Fallback if data missing
                  const available = dayData?.availableRooms ?? 0;
                  const total = dayData?.totalRooms ?? 0;
                  const isBlocked = dayData?.isBlocked ?? false;
                  // If blocked rooms > 0, show lock
                  const hasBlocks = (dayData?.blockedRooms || 0) > 0;

                  return (
                    <div
                      key={index}
                      className={`p-2 border-l flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors ${getAvailabilityColor(available, total, isBlocked)}`}
                      title={`Total: ${total} | Booked: ${dayData?.bookedRooms || 0} | Blocked: ${dayData?.blockedRooms || 0} | Available: ${available}`}
                      onClick={() => handleCellClick(room, date)}
                    >
                      {hasBlocks ? (
                        <div className="flex flex-col items-center">
                          <Lock className="h-3 w-3 mb-1 opacity-50" />
                          <span className="text-sm font-semibold">{available}</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold">{available}</span>
                          <span className="text-[10px] text-muted-foreground">
                            /{total}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Note */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </div>
          <CardDescription>
            Use the "Bulk Block" button above to block rooms for maintenance. Inventory overrides coming soon.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default AvailabilityPage;
