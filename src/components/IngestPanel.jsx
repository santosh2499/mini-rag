"use client";

import { useState, useRef } from "react";
import { Database, Upload, CheckCircle, AlertCircle, FileText, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function IngestPanel() {
    const [activeTab, setActiveTab] = useState("text");
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [sourceName, setSourceName] = useState("");
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");
    const fileInputRef = useRef(null);

    const handleIngest = async () => {
        if (activeTab === "text" && !text.trim()) return;
        if (activeTab === "file" && !file) return;

        setStatus("loading");
        setMessage("");

        try {
            let res;

            if (activeTab === "file" && file) {
                const formData = new FormData();
                formData.append("file", file);
                if (sourceName) formData.append("sourceName", sourceName);

                res = await fetch("/api/ingest", {
                    method: "POST",
                    body: formData, // Auto-sets Content-Type to multipart/form-data
                });
            } else {
                res = await fetch("/api/ingest", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text,
                        sourceName: sourceName || `Paste-${new Date().toLocaleTimeString()}`
                    }),
                });
            }

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to ingest");

            setStatus("success");
            setMessage(data.message);

            // Reset fields
            if (activeTab === "text") setText("");
            if (activeTab === "file") {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }

        } catch (err) {
            setStatus("error");
            if (err instanceof Error) {
                setMessage(err.message);
            } else {
                setMessage("An unknown error occurred");
            }
        }
    };

    return (
        <div className="rounded-xl glass p-6">
            <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Knowledge Base</h2>
            </div>

            <div className="flex gap-4 border-b border-border/50 mb-4">
                <button
                    onClick={() => { setActiveTab("text"); setStatus("idle"); }}
                    className={cn(
                        "pb-2 text-sm font-medium transition-colors border-b-2",
                        activeTab === "text"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Paste Text
                </button>
                <button
                    onClick={() => { setActiveTab("file"); setStatus("idle"); }}
                    className={cn(
                        "pb-2 text-sm font-medium transition-colors border-b-2",
                        activeTab === "file"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Upload File
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Source Name (Optional)</label>
                    <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="e.g. My Document"
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                    />
                </div>

                {activeTab === "text" ? (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
                        <textarea
                            className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                            placeholder="Paste text here to train your RAG..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Document (PDF, TXT, MD)</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,.md,.json,.pdf"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-2 text-primary">
                                    <FileText className="h-8 w-8" />
                                    <span className="font-medium text-sm">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <FileIcon className="h-8 w-8 opacity-50" />
                                    <span className="text-sm">Click to browse files</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleIngest}
                    disabled={status === "loading" || (activeTab === "text" && !text.trim()) || (activeTab === "file" && !file)}
                    className={cn(
                        "inline-flex w-full items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2",
                        status === "loading"
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                >
                    {status === "loading" ? (
                        <span className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Indexing...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Add to Knowledge Base
                        </span>
                    )}
                </button>

                {status === "success" && (
                    <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        {message}
                    </div>
                )}

                {status === "error" && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
