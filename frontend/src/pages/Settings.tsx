// Settings Page - Real API Integration
import { useState } from 'react';
import { Building2, Users, Bell, Key, Palette, Globe, Save, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';
import { Hotel } from '@/types/api';

import { useEffect } from 'react';
import { PromoManager } from '@/components/settings/PromoManager';

function TeamList() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiClient.get<any[]>('/users');
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch team:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading team...</div>;

  return (
    <div className="space-y-4">
      {users.map(u => (
        <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {u.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </div>
          </div>
          <div className="text-sm font-medium text-primary">{u.role}</div>
        </div>
      ))}
      <Button variant="outline" className="w-full gap-2" onClick={() => {
        // Simple alert for now as full invite flow needs email server
        alert("Invite Feature: In a production app, this would open a form to send an invite email. For now, you can register new users via the Signup page.");
      }}>
        <Users className="h-4 w-4" />
        Invite Team Member
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const { hotel, user, setHotel } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    star_rating: hotel?.star_rating || 3,
    description: hotel?.description || '',
    address: {
      street: hotel?.address?.street || '',
      city: hotel?.address?.city || ''
    },
    contact: {
      phone: hotel?.contact?.phone || '',
      email: hotel?.contact?.email || ''
    },
    settings: {
      check_in_time: hotel?.settings?.check_in_time || '14:00',
      check_out_time: hotel?.settings?.check_out_time || '11:00',
      currency: hotel?.settings?.currency || 'INR',
      timezone: hotel?.settings?.timezone || 'Asia/Kolkata',
      // Store branding in settings json for now to match form structure or map to top level if backend requires
      // Backend Hotel model has them at top level (logo_url, primary_color) but our handleUpdate maps simplistic sections.
      // Let's check handleSave.
      primary_color: hotel?.primary_color || '#3B82F6',
      logo_url: hotel?.logo_url || '',
      mmt_review_url: hotel?.settings?.mmt_review_url || ''
    }
  });

  const handleUpdate = (section: string, field: string, value: any) => {
    setFormData(prev => {
      if (section === 'root') {
        return { ...prev, [field]: value };
      }
      if (section === 'address') {
        return { ...prev, address: { ...prev.address, [field]: value } };
      }
      if (section === 'contact') {
        return { ...prev, contact: { ...prev.contact, [field]: value } };
      }
      if (section === 'settings') {
        return { ...prev, settings: { ...prev.settings, [field]: value } };
      }
      return prev;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedHotel = await apiClient.patch<Hotel>('/hotels/me', {
        name: formData.name,
        star_rating: Number(formData.star_rating),
        description: formData.description,
        address: formData.address,
        contact: formData.contact,
        settings: formData.settings,
        // Map back from settings state to top level fields
        logo_url: formData.settings.logo_url,
        primary_color: formData.settings.primary_color
      });
      setHotel(updatedHotel);
      toast({
        title: 'Settings saved',
        description: 'Your hotel profile has been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!hotel) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your hotel profile and preferences
        </p>
      </div>

      <Tabs defaultValue="hotel" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
          <TabsTrigger value="hotel" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Hotel</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>

          <TabsTrigger value="promos" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Promotions</span>
          </TabsTrigger>

          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
        </TabsList>

        {/* Hotel Settings */}
        <TabsContent value="hotel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Profile</CardTitle>
              <CardDescription>
                Basic information about your property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hotelName">Hotel Name</Label>
                  <Input
                    id="hotelName"
                    value={formData.name}
                    onChange={(e) => handleUpdate('root', 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starRating">Star Rating</Label>
                  <Select
                    value={String(formData.star_rating)}
                    onValueChange={(val) => handleUpdate('root', 'star_rating', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Star</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleUpdate('root', 'description', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address.street}
                    onChange={(e) => handleUpdate('address', 'street', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleUpdate('address', 'city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.contact.phone}
                    onChange={(e) => handleUpdate('contact', 'phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.contact.email}
                    onChange={(e) => handleUpdate('contact', 'email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check-in Time</Label>
                  <Input
                    id="checkIn"
                    type="time"
                    value={formData.settings.check_in_time}
                    onChange={(e) => handleUpdate('settings', 'check_in_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOut">Check-out Time</Label>
                  <Input
                    id="checkOut"
                    type="time"
                    value={formData.settings.check_out_time}
                    onChange={(e) => handleUpdate('settings', 'check_out_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="mmtUrl">MakeMyTrip Reviews URL</Label>
                  <Input
                    id="mmtUrl"
                    value={formData.settings.mmt_review_url || ''}
                    onChange={(e) => handleUpdate('settings', 'mmt_review_url', e.target.value)}
                    placeholder="https://www.makemytrip.com/hotels/hotel-details-..."
                  />
                  <p className="text-xs text-muted-foreground">Used for One-Click Sync from Reviews Dashboard.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.settings.currency}
                    onValueChange={(val) => handleUpdate('settings', 'currency', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.settings.timezone}
                    onValueChange={(val) => handleUpdate('settings', 'timezone', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage who has access to this dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Team List Generator */}
                <TeamList />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Choose what emails you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'new-booking', label: 'New Booking', description: 'Get notified when a new booking is made' },
                { id: 'cancellation', label: 'Cancellations', description: 'Get notified when a booking is cancelled' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Promotions Settings */}
        <TabsContent value="promos" className="space-y-6">
          <PromoManager />
        </TabsContent>

        {/* Branding Settings - Coming Soon */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Engine Branding</CardTitle>
              <CardDescription>
                Customize how your booking engine looks to guests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      className="w-12 h-10 p-1 cursor-pointer"
                      value={formData.settings.primary_color || '#3B82F6'}
                      onChange={(e) => handleUpdate('settings', 'primary_color', e.target.value)}
                    />
                    <Input
                      value={formData.settings.primary_color || '#3B82F6'}
                      onChange={(e) => handleUpdate('settings', 'primary_color', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This color will be used for buttons and highlights on your booking page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={formData.settings.logo_url || ''}
                    onChange={(e) => handleUpdate('settings', 'logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  {formData.settings.logo_url && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p className="mb-1">Preview:</p>
                      <img src={formData.settings.logo_url} alt="Logo Preview" className="h-12 w-auto object-contain border rounded p-1" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SettingsPage;
