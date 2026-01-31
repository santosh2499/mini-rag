"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Send, User, Bot, StopCircle, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const abortControllerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streaming]);

    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);
        setStreaming(true);

        const currentHistory = [...messages, userMessage];
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: currentHistory }),
                signal: abortControllerRef.current.signal,
            });

            if (!res.ok) throw new Error("Failed to search");
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            // Create placeholder for assistant response
            const botMessageId = Date.now();
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "", citations: [], id: botMessageId }
            ]);

            let buffer = "";
            let isMetadataParsed = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                if (!isMetadataParsed) {
                    const splitIndex = buffer.indexOf("\n__METADATA_END__\n");
                    if (splitIndex !== -1) {
                        const metadataStr = buffer.slice(0, splitIndex);
                        const remaining = buffer.slice(splitIndex + "\n__METADATA_END__\n".length);

                        try {
                            const metadata = JSON.parse(metadataStr);
                            setMessages((prev) => prev.map(msg =>
                                msg.id === botMessageId ? { ...msg, citations: metadata.citations } : msg
                            ));
                        } catch (e) {
                            console.error("Failed to parse metadata", e);
                        }

                        buffer = remaining;
                        isMetadataParsed = true;
                    }
                }

                if (isMetadataParsed && buffer.length > 0) {
                    // Update content with whatever is in the buffer (streaming text)
                    // We consume the buffer here
                    const newContent = buffer;
                    setMessages((prev) => prev.map(msg =>
                        msg.id === botMessageId ? { ...msg, content: msg.content + newContent } : msg
                    ));
                    buffer = ""; // Clear buffer after consuming
                }
            }

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong.", isError: true }]);
            }
        } finally {
            setLoading(false);
            setStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setLoading(false);
            setStreaming(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] lg:h-[700px] w-full max-w-4xl mx-auto rounded-2xl glass border border-white/20 overflow-hidden shadow-2xl">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                        <Sparkles className="h-12 w-12 text-primary mb-4 animate-pulse" />
                        <h3 className="text-xl font-bold text-foreground">Ready to Chat</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                            Ask questions about your documents. I can remember context and cite sources.
                        </p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex gap-4 max-w-3xl",
                                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg",
                                msg.role === "user" ? "bg-primary text-white" : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
                            )}>
                                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>

                            <div className={cn(
                                "flex flex-col gap-2 min-w-0 md:max-w-[80%]",
                                msg.role === "user" ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "p-4 rounded-2xl shadow-md whitespace-pre-wrap text-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                        : "bg-card/80 backdrop-blur-md border border-white/10 text-foreground rounded-tl-sm"
                                )}>
                                    {msg.content}
                                    {msg.role === "assistant" && msg.content === "" && (
                                        <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1" />
                                    )}
                                </div>

                                {/* Citations Section for Assistant */}
                                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                                    <Citations citations={msg.citations} />
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/10 backdrop-blur-md border-t border-white/10">
                <form onSubmit={handleSearch} className="relative flex items-center gap-2">
                    <input
                        className="flex-1 bg-white/5 border border-white/10 hover:border-white/20 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl px-4 py-3 outline-none transition-all"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading && !streaming}
                    />

                    {streaming ? (
                        <button
                            type="button"
                            onClick={stopGeneration}
                            className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors border border-red-500/20"
                        >
                            <StopCircle className="h-5 w-5" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="p-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg transition-all"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

function Citations({ citations }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="w-full max-w-md mt-1">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
            >
                <BookOpen className="h-3 w-3" />
                <span>{citations.length} Sources</span>
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-primary/20">
                            {citations.map((cite) => (
                                <div key={cite.id} className="text-xs space-y-1">
                                    <div className="flex justify-between text-muted-foreground/70">
                                        <span className="font-bold text-foreground">[{cite.id}] {cite.source}</span>
                                        <span>{Math.round(cite.score * 100)}% Match</span>
                                    </div>
                                    <p className="text-muted-foreground line-clamp-2 opacity-80 italic">
                                        "{cite.text}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
