// Application Header with hotel selector and user menu
import { Bell, ChevronDown, Menu, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function AppHeader() {
  const { user, hotel, logout } = useAuth();
  const [properties, setProperties] = React.useState<any[]>([]);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = React.useState(false);
  const [newPropName, setNewPropName] = React.useState('');
  const [newPropSlug, setNewPropSlug] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  // Fetch properties on mount
  React.useEffect(() => {
    // Only fetch if user is logged in
    if (user) {
      import('@/api/client').then(({ apiClient }) => {
        apiClient.get('/properties')
          .then((data: any) => setProperties(data))
          .catch(err => console.error("Failed to fetch properties", err));
      });
    }
  }, [user]);

  const handleSwitchProperty = async (hotelId: string) => {
    try {
      const { apiClient } = await import('@/api/client');
      await apiClient.post(`/properties/switch/${hotelId}`, {});
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch property", error);
      alert("Failed to switch property");
    }
  };

  const handleAddProperty = async () => {
    if (!newPropName || !newPropSlug) return;
    setIsCreating(true);
    try {
      const { apiClient } = await import('@/api/client');
      await apiClient.post('/properties', {
        name: newPropName,
        slug: newPropSlug
      });
      window.location.reload(); // Reload to switch to new property automatically
    } catch (error) {
      console.error("Failed to create property", error);
      alert("Failed to create property. Slug might be taken.");
      setIsCreating(false);
    }
  };

  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Sidebar Toggle */}
      <SidebarTrigger className="-ml-2">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </SidebarTrigger>

      {/* Hotel Selector (for multi-property users) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 font-medium">
            <span className="hidden sm:inline">{hotel?.name || 'Select Hotel'}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Switch Property</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {properties.map(p => (
            <DropdownMenuItem key={p.id} className="gap-2" onClick={() => handleSwitchProperty(p.id)}>
              <Badge variant={p.is_current ? "default" : "outline"} className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                {p.name[0]}
              </Badge>
              {p.name}
              {p.is_current && <span className="ml-auto text-xs opacity-50">Active</span>}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-primary cursor-pointer" onSelect={(e) => { e.preventDefault(); setIsAddPropertyOpen(true); }}>
            + Add New Property
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Property Dialog */}
      <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prop-name">Hotel Name</Label>
              <Input id="prop-name" value={newPropName} onChange={(e) => {
                setNewPropName(e.target.value);
                // Auto-generate slug
                setNewPropSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
              }} placeholder="e.g. Lagoona Goa" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prop-slug">URL Slug</Label>
              <Input id="prop-slug" value={newPropSlug} onChange={(e) => setNewPropSlug(e.target.value)} placeholder="e.g. lagoona-goa" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPropertyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProperty} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search (Desktop) */}
      <div className="hidden flex-1 md:flex md:max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search bookings, guests..."
            className="w-full pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            3
          </span>
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground">{user?.role || 'Manager'}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Notification Preferences</DropdownMenuItem>
            <DropdownMenuItem>Help & Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={logout}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default AppHeader;
