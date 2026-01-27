import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/api/client';
import { Loader2, Users, Building, Activity, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    apiClient.get('/admin/stats'),
                    apiClient.get('/admin/users')
                ]);
                setStats(statsRes);
                setUsers(usersRes as any[]);
            } catch (error) {
                console.error("Admin Load Failed", error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

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
                        <p className="text-xs text-muted-foreground">100% Subscribed</p>
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

                {/* Recent Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
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
                                {users.slice(0, 5).map(u => (
                                    <TableRow key={u.id}>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{u.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex h-2 w-2 rounded-full bg-green-500" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
