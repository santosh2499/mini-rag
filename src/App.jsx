import { Header } from "@/components/Header";
import { IngestPanel } from "@/components/IngestPanel";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Header />

      <main className="flex-1 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]">
        <div className="container max-w-screen-xl py-10 px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Left Column: Context / Ingest */}
            <div className="lg:col-span-4 space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                    Knowledge Base
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Paste text content here to feed the RAG system. This content will be chunked, embedded, and stored in the vector database for retrieval.
                  </p>
                </div>

                <IngestPanel />

                <div className="p-4 rounded-xl border border-border/50 bg-card/30 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground/80">System Specs:</p>
                  <ul className="space-y-1 list-disc list-inside opacity-80">
                    <li>Chunk: 4000 chars (~1000 tokens)</li>
                    <li>Overlap: 400 chars (10%)</li>
                    <li>Embedding: Cohere v3 (1024d)</li>
                    <li>Store: Pinecone</li>
                    <li>Reranker: Cohere v3</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Chat Interface */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Ask Anything
                </h2>
                <p className="text-muted-foreground text-sm">
                  Queries are converted to vectors, matched against the knowledge base, reranked for precision, and answered with citations.
                </p>
              </div>

              <ChatInterface />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
