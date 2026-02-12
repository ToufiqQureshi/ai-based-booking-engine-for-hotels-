import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatWidgetProps {
    hotelSlug: string;
    primaryColor?: string;
}

// Helper to determine text color based on background
function getContrastText(hexcolor: string) {
    if (!hexcolor || !hexcolor.startsWith('#')) return '#fff';
    try {
        const r = parseInt(hexcolor.substr(1, 2), 16);
        const g = parseInt(hexcolor.substr(3, 2), 16);
        const b = parseInt(hexcolor.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1f2937' : '#ffffff'; // Dark Gray or White
    } catch (e) {
        return '#fff';
    }
}

export function ChatWidget({ hotelSlug, primaryColor = '#3B82F6' }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am your concierge. How can I assist you with your stay today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    // Notify parent window about state changes for resizing
    useEffect(() => {
        const message = isOpen ? 'CHAT_OPEN' : 'CHAT_CLOSE';
        window.parent.postMessage({ type: message, hotelSlug }, '*');
    }, [isOpen, hotelSlug]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'}/public/chat/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hotel_slug: hotelSlug,
                    message: userMsg,
                    history: history
                })
            });

            if (!res.ok) throw new Error('Failed to fetch');

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again or reach out directly!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-80 md:w-96 shadow-2xl rounded-xl overflow-hidden"
                    >
                        <Card className="border border-gray-200 shadow-2xl h-[550px] flex flex-col bg-white overflow-hidden rounded-xl">
                            <CardHeader
                                className="p-4 flex flex-row items-center justify-between cursor-move shadow-md relative z-10"
                                style={{ backgroundColor: '#1f2937' }}
                            >
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                                    <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="leading-none">Concierge AI</span>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-normal text-white/60 uppercase tracking-wider">Online</span>
                                        </div>
                                    </div>
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10 rounded-full" onClick={() => setIsOpen(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-gray-50/50">
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                            >
                                                {msg.role === 'assistant' && (
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 shadow-sm mb-1 bg-white"
                                                    >
                                                        <Bot className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[80%] px-4 py-2.5 text-[14px] relative ${msg.role === 'user'
                                                        ? 'bg-primary text-white rounded-2xl rounded-tr-none shadow-md'
                                                        : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none shadow-sm'
                                                        }`}
                                                    style={msg.role === 'user' ? { backgroundColor: primaryColor, color: getContrastText(primaryColor) } : {}}
                                                >
                                                    <div className="prose prose-sm max-w-none break-words">
                                                        <ReactMarkdown
                                                            components={{
                                                                p: ({ children }) => <p className="m-0 mb-1 last:mb-0">{children}</p>,
                                                                a: ({ href, children }) => (
                                                                    <a href={href} className="text-primary font-bold hover:underline" target="_blank" rel="noopener noreferrer">
                                                                        {children}
                                                                    </a>
                                                                ),
                                                                ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
                                                                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                                            }}
                                                        >
                                                            {msg.content.split("ACTION:BOOKING_LINK|")[0]}
                                                        </ReactMarkdown>
                                                    </div>

                                                    {/* Booking Button Injection */}
                                                    {msg.role === 'assistant' && msg.content.includes("ACTION:BOOKING_LINK|") && (
                                                        <div className="mt-3 pt-2 border-t border-black/5">
                                                            <Button
                                                                onClick={() => {
                                                                    const parts = msg.content.split("ACTION:BOOKING_LINK|");
                                                                    if (parts.length > 1) {
                                                                        try {
                                                                            const data = JSON.parse(parts[1]);
                                                                            window.parent.postMessage({ type: 'CHECKOUT_REDIRECT', data }, '*');
                                                                        } catch (e) { console.error(e); }
                                                                    }
                                                                }}
                                                                className="w-full bg-black text-white hover:bg-black/90 rounded-xl font-bold py-5 shadow-lg flex items-center justify-center gap-2 group transition-all"
                                                            >
                                                                Confirm & Book Now
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {isLoading && (
                                            <div className="flex items-end gap-2 justify-start mb-4">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 shadow-sm mb-1 bg-white"
                                                >
                                                    <Bot className="w-5 h-5 text-gray-500" />
                                                </div>
                                                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                                                    <div className="flex gap-1.5 px-0.5 py-1">
                                                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={scrollRef} />
                                    </div>
                                </ScrollArea>
                                <div className="p-3.5 bg-white border-t border-gray-100">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSend();
                                        }}
                                        className="relative flex items-center gap-2"
                                    >
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Message Concierge..."
                                            disabled={isLoading}
                                            className="focus-visible:ring-0 focus-visible:ring-offset-0 border-gray-200 rounded-2xl px-4 py-5 text-[14px] bg-white shadow-sm hover:shadow-md placeholder:text-gray-400 pr-10 h-11"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={isLoading || !input.trim()}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl active:scale-95 shrink-0 border"
                                            style={!isLoading && input.trim() ? { backgroundColor: primaryColor, color: getContrastText(primaryColor) } : {}}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </form>
                                    <p className="text-[9px] text-center text-gray-500/60 mt-2 font-bold uppercase tracking-wider">Powered by Gadget4me AI</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isVisible && (
                    <motion.button
                        key="chat-button"
                        layout
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        onClick={() => setIsOpen(!isOpen)}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-3 bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-5 py-2.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all border border-gray-100 group"
                        style={{ padding: isOpen ? '0.75rem' : '0.6rem 1.4rem' }}
                    >
                        {isOpen ? (
                            <div
                                className="p-2.5 rounded-full shadow-inner"
                                style={{ backgroundColor: `${primaryColor}20` }}
                            >
                                <X className="w-6 h-6" style={{ color: primaryColor }} />
                            </div>
                        ) : (
                            <>
                                <div className="relative w-11 h-11 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping scale-150 opacity-20" style={{ backgroundColor: primaryColor }} />
                                    <img src="/webmerito-icon.png" alt="Chat" className="w-full h-full object-contain relative z-10 drop-shadow-md group-hover:rotate-12 transition-transform" />
                                </div>
                                <div className="hidden md:flex flex-col items-start pr-2">
                                    <span className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest leading-none mb-1">Live Concierge</span>
                                    <span className="text-[17px] font-black tracking-tight" style={{
                                        fontFamily: 'Inter, sans-serif, system-ui',
                                        background: `linear-gradient(to right, ${primaryColor}, #5735B8)`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent'
                                    }}>
                                        I'm Saaraa!
                                    </span>
                                </div>
                            </>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
