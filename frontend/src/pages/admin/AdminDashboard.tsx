import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/api/client';
import { Loader2, Users, Building, Activity, ShieldAlert, CheckCircle, XCircle, Plus, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [hotels, setHotels] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [selectedHotelId, setSelectedHotelId] = useState('');
    const [subFormData, setSubFormData] = useState({
        plan_name: 'Pro',
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 2500
    });
    const { toast } = useToast();

    const loadData = async () => {
        try {
            const [statsRes, usersRes, hotelsRes, subsRes] = await Promise.all([
                apiClient.get('/admin/stats'),
                apiClient.get('/admin/users'),
                apiClient.get('/admin/hotels'),
                apiClient.get('/admin/subscriptions')
            ]);
            setStats(statsRes);
            setUsers(usersRes as any[]);
            setHotels(hotelsRes as any[]);
            setSubscriptions(subsRes as any[]);
        } catch (error) {
            console.error("Admin Load Failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleHotelUpdate = async (hotelId: string, field: string, value: boolean) => {
        try {
            await apiClient.patch(`/admin/hotels/${hotelId}`, { [field]: value });
            setHotels(prev => prev.map(h => h.id === hotelId ? { ...h, [field]: value } : h));
            toast({
                title: "Updated",
                description: "Hotel settings updated successfully."
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update hotel settings."
            });
        }
    };

    const handleCreateSub = async () => {
        if (!selectedHotelId) {
            toast({ variant: "destructive", title: "Wait", description: "Select a hotel first." });
            return;
        }
        try {
            await apiClient.post('/admin/subscriptions', {
                hotel_id: selectedHotelId,
                ...subFormData,
                end_date: new Date(subFormData.end_date).toISOString()
            });
            toast({ title: "Success", description: "Subscription created/renewed." });
            setIsSubDialogOpen(false);
            loadData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to create subscription." });
        }
    };

    const getHotelName = (id: string) => hotels.find(h => h.id === id)?.name || id;

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    if (!stats) return <div className="p-8 text-red-500">Failed to load Admin Data. Are you a Super Admin?</div>;

    const scrapeData = [
        { name: 'Agoda', value: stats.scraping.sources.Agoda },
        { name: 'MakeMyTrip', value: stats.scraping.sources.MakeMyTrip },
    ];

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Super Admin Dashboard 🛡️</h1>
                <Badge variant="outline" className="px-4 py-1 text-sm bg-green-100 text-green-800 border-green-200">
                    System: {stats.system_status}
                </Badge>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="hotels">Hotels</TabsTrigger>
                    <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Hoteliers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.users.total}</div>
                                <p className="text-xs text-muted-foreground">{stats.users.active_now} active sessions</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Mapped Hotels</CardTitle>
                                <Building className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.hotels.total}</div>
                                <p className="text-xs text-muted-foreground">{stats.hotels.subscribed} Active Subscriptions</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Scraping Health (24h)</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.scraping.total_rates_24h} Rates</div>
                                <p className="text-xs text-green-600">Success Rate: {stats.scraping.health}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Scrape Distribution Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Source Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={scrapeData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#8884d8">
                                            {scrapeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#0056b3'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="hotels">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Hotels</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Hotel Name</TableHead>
                                        <TableHead>Active</TableHead>
                                        <TableHead>Rate Shopper</TableHead>
                                        <TableHead>AI Agent</TableHead>
                                        <TableHead>Guest Bot</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hotels.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell className="font-medium">{h.name}<br /><span className="text-xs text-muted-foreground">{h.slug}</span></TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={h.is_active}
                                                    onCheckedChange={(c) => handleHotelUpdate(h.id, 'is_active', c)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={h.feature_rate_shopper}
                                                    onCheckedChange={(c) => handleHotelUpdate(h.id, 'feature_rate_shopper', c)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={h.feature_ai_agent}
                                                    onCheckedChange={(c) => handleHotelUpdate(h.id, 'feature_ai_agent', c)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={h.feature_guest_bot}
                                                    onCheckedChange={(c) => handleHotelUpdate(h.id, 'feature_guest_bot', c)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" className="gap-2" onClick={() => {
                                                    setSelectedHotelId(h.id);
                                                    setIsSubDialogOpen(true);
                                                }}>
                                                    <Calendar className="h-4 w-4" />
                                                    Renew
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subscriptions">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Subscription History</CardTitle>
                            <Button size="sm" className="gap-2" onClick={() => setIsSubDialogOpen(true)}>
                                <Plus className="h-4 w-4" /> Add Multi-Hotel Sub
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Hotel</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Expiry Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subscriptions.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No subscriptions found.</TableCell></TableRow>
                                    ) : subscriptions.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{getHotelName(s.hotel_id)}</TableCell>
                                            <TableCell><Badge variant="outline">{s.plan_name}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant={s.status === 'active' ? 'default' : 'destructive'}>
                                                    {s.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(s.end_date).toLocaleDateString()}</TableCell>
                                            <TableCell>{s.currency} {s.amount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(u => (
                                        <TableRow key={u.id}>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{u.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={u.is_active ? "default" : "destructive"}>
                                                    {u.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add/Renew Subscription</DialogTitle>
                        <DialogDescription>Update a hotel's plan and access period.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Target Hotel</Label>
                            <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Hotel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {hotels.map(h => (
                                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Plan Name</Label>
                            <Select value={subFormData.plan_name} onValueChange={(v) => setSubFormData({ ...subFormData, plan_name: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Basic">Basic</SelectItem>
                                    <SelectItem value="Pro">Pro</SelectItem>
                                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Expiry Date</Label>
                            <Input type="date" value={subFormData.end_date} onChange={(e) => setSubFormData({ ...subFormData, end_date: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Amount (INR)</Label>
                            <Input type="number" value={subFormData.amount} onChange={(e) => setSubFormData({ ...subFormData, amount: Number(e.target.value) })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSubDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSub}>Manual Renewal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
