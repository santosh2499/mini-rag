"use client";

import { useState } from "react";
import { Search, Sparkles, Clock, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function ChatInterface() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [expandedSources, setExpandedSources] = useState(false);

    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const res = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to search");

            setResult(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-primary rounded-xl opacity-20 blur-md group-hover:opacity-30 transition-opacity" />
                <div className="relative flex items-center glass rounded-xl overflow-hidden">
                    <input
                        className="flex-1 bg-transparent px-6 py-4 text-lg outline-none placeholder:text-muted-foreground"
                        placeholder="Ask a question..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="px-6 py-4 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="h-5 w-5 block animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Search className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </form>

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">
                    {error}
                </div>
            )}

            {/* Results */}
            <AnimatePresence mode="wait">
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Answer Card */}
                        <div className="rounded-xl glass p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-400" />

                            <div className="flex items-center gap-2 mb-4 text-primary font-medium">
                                <Sparkles className="h-4 w-4" />
                                <span>AI Answer</span>
                            </div>

                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                {result.answer}
                            </div>

                            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{result.timing}ms</span>
                                    <span className="text-border">|</span>
                                    <span>~{Math.round(result.answer.length / 4)} tokens</span>
                                </div>
                                <div>
                                    Groq Llama 3.3
                                </div>
                            </div>
                        </div>

                        {/* Citations / Sources */}
                        {result.citations.length > 0 && (
                            <div className="rounded-xl glass">
                                <button
                                    onClick={() => setExpandedSources(!expandedSources)}
                                    className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-card/80 transition-colors rounded-xl"
                                >
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-blue-500" />
                                        <span className="font-bold">References & Sources ({result.citations.length})</span>
                                    </div>
                                    {expandedSources ? (
                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {expandedSources && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 space-y-3">
                                                {result.citations.map((cite) => (
                                                    <div
                                                        key={cite.id}
                                                        className="p-3 rounded-lg bg-background border border-border/50 text-sm"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-bold text-primary text-xs uppercase tracking-wider">
                                                                Citation [{cite.id}]
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                Score: {(cite.score * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <p className="text-muted-foreground line-clamp-3 italic">
                                                            &quot;{cite.text}&quot;
                                                        </p>
                                                        <div className="mt-2 text-xs font-medium text-foreground/70">
                                                            Source: {cite.source}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
