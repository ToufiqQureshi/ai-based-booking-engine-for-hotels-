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
    // ... existing code ...
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am the hotel concierge AI. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const [isVisible, setIsVisible] = useState(true);

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
            // Prepare history (excluding system logic for simplicity, just passed messages)
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
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            className="fixed bottom-4 right-4 z-50 flex flex-col items-end"
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-80 md:w-96 shadow-2xl rounded-xl overflow-hidden"
                        onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when interacting with chat
                    >
                        <Card className="border border-gray-200 shadow-2xl h-[550px] flex flex-col bg-white overflow-hidden rounded-xl">
                            <CardHeader
                                className="p-4 flex flex-row items-center justify-between cursor-move shadow-md relative z-10"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                                    <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span>Concierge AI</span>
                                        <span className="text-[10px] font-normal text-white/80 leading-none">Always here to help</span>
                                    </div>
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsOpen(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-gray-50/50">
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-6">
                                        {messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[85%] px-5 py-3 text-sm shadow-sm prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 transition-all duration-200 hover:shadow-md ${msg.role === 'user'
                                                        ? 'bg-primary text-white rounded-2xl rounded-tr-none'
                                                        : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none'
                                                        }`}
                                                    style={msg.role === 'user' ? { backgroundColor: primaryColor, color: getContrastText(primaryColor) } : {}}
                                                >
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="mb-2 list-disc pl-4" {...props} />,
                                                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                            strong: ({ node, ...props }) => <strong className="font-bold" {...props} />
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                                                    <div className="flex gap-1.5">
                                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={scrollRef} />
                                    </div>
                                </ScrollArea>
                                <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                        className="flex gap-3 items-center"
                                    >
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask about rooms..."
                                            className="focus-visible:ring-0 focus:ring-2 focus:ring-primary/20 border-gray-200 rounded-full px-5 py-5 text-gray-900 bg-gray-50 hover:bg-white transition-colors placeholder:text-gray-400 shadow-inner"
                                            style={{ '--tw-ring-color': primaryColor } as any}
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={isLoading || !input.trim()}
                                            className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105 shrink-0"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Send className="w-5 h-5 text-white ml-0.5" />
                                        </Button>
                                    </form>
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
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(!isOpen)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-3 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 hover:shadow-xl transition-all border border-purple-100"
                        style={{ padding: isOpen ? '1rem' : '0.75rem 1.25rem' }}
                    >
                        {isOpen ? (
                            <div className="bg-primary/10 p-2 rounded-full">
                                <X className="w-6 h-6 text-primary" />
                            </div>
                        ) : (
                            <>
                                <div className="relative w-10 h-10">
                                    <img src="/webmerito-icon.png" alt="Chat" className="w-full h-full object-contain" />
                                </div>
                                <div className="hidden md:block">
                                    <span style={{
                                        fontFamily: 'Lato, sans-serif',
                                        background: 'linear-gradient(to left, #824BC4, #5735B8)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent',
                                        fontWeight: 900,
                                        fontSize: '16px'
                                    }}>
                                        I m saaraa ai !
                                    </span>
                                </div>
                            </>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
