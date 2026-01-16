import { BrainCircuit } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center px-4 md:px-8">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-primary animate-pulse" />
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                        MiniRAG
                    </h1>
                </div>

            </div>
        </header>
    );
}
