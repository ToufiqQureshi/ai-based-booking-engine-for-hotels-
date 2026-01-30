
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, RefreshCw, CheckCircle, BrainCircuit } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface Review {
    id: number;
    guest_name: string;
    rating: number;
    review_text: string;
    source: string;
    status: string;
    review_date?: string;
    ai_reply_draft?: string;
    final_reply?: string;
}

const ReviewsPage: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, hotel } = useAuth();
    const { toast } = useToast();

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/reviews`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setReviews(data);
            }
        } catch (error) {
            console.error("Failed to fetch reviews", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [user]);

    const handleGenerateReply = async (reviewId: number) => {
        try {
            const token = localStorage.getItem('token');
            toast({ title: "AI Working...", description: "Drafting a professional reply." });

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/reviews/${reviewId}/generate-reply`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast({ title: "Reply Drafted!", description: "Review response generated." });
                fetchReviews(); // Refresh
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not generate reply." });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Guest Reviews</h2>
                    <p className="text-muted-foreground">Manage and reply to reviews from all OTAs.</p>
                </div>
                <Button onClick={fetchReviews} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button onClick={() => {
                    const savedUrl = hotel?.settings?.mmt_review_url;
                    if (savedUrl) {
                        const target = new URL(savedUrl);
                        target.searchParams.set("auto_scrape", "true");
                        window.open(target.toString(), "_blank");
                    } else {
                        const url = prompt("Enter your MakeMyTrip Hotel Reviews URL:", localStorage.getItem("mmt_url") || "");
                        if (url) {
                            localStorage.setItem("mmt_url", url);
                            const target = new URL(url);
                            target.searchParams.set("auto_scrape", "true");
                            window.open(target.toString(), "_blank");
                        }
                    }
                }} size="sm" className="ml-2">
                    <RefreshCw className="mr-2 h-4 w-4" /> Sync Reviews
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                    <CardDescription>Reviews synced from Chrome Extension</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Guest</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead className="w-[40%]">Review</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviews.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No reviews found. Use the Extension to sync!</TableCell>
                                </TableRow>
                            ) : (
                                reviews.map((review) => (
                                    <TableRow key={review.id}>
                                        <TableCell className="font-medium">
                                            {review.guest_name}
                                            <div className="text-xs text-muted-foreground">{review.review_date}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-yellow-500">
                                                {review.rating} <Star className="h-3 w-3 ml-1 fill-current" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="line-clamp-2 text-sm">{review.review_text}</p>
                                            {review.ai_reply_draft && (
                                                <div className="mt-2 p-2 bg-muted rounded text-xs italic border-l-2 border-primary">
                                                    <strong>Draft:</strong> {review.ai_reply_draft}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{review.source}</Badge></TableCell>
                                        <TableCell>
                                            <Badge variant={review.status === 'REPLIED' ? 'default' : 'secondary'}>
                                                {review.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {review.status !== 'REPLIED' && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="ghost" onClick={() => handleGenerateReply(review.id)}>
                                                        <BrainCircuit className="h-4 w-4 mr-1" />
                                                        {review.ai_reply_draft ? 'Regenerate' : 'Draft Reply'}
                                                    </Button>
                                                    {review.ai_reply_draft && (
                                                        <Button size="sm" variant="default" onClick={() => {
                                                            const savedUrl = hotel?.settings?.mmt_review_url;
                                                            if (!savedUrl) {
                                                                toast({ variant: "destructive", title: "Setup Required", description: "Please save MMT URL in Settings first." });
                                                                return;
                                                            }
                                                            const target = new URL(savedUrl);
                                                            target.searchParams.set("auto_reply", "true");
                                                            target.searchParams.set("reply_text", review.ai_reply_draft!);
                                                            target.searchParams.set("guest_name", review.guest_name);
                                                            window.open(target.toString(), "_blank");
                                                        }}>
                                                            <MessageSquare className="h-4 w-4 mr-1" /> Post Reply
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReviewsPage;
