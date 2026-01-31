import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import pdf from 'pdf-parse-fork'; // CommonJS default import
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { getCohereClient, getPineconeClient, getGroqClient, CONFIG } from './clients.js';

dotenv.config({ path: './.env.local' });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// --- History Management ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE = path.join(__dirname, 'history.json');

async function getHistory() {
    try {
        const data = await fs.readFile(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function addToHistory(entry) {
    const history = await getHistory();
    history.unshift(entry); // Add to beginning
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
    return history;
}
// --------------------------

app.use(cors());
app.use(express.json());

app.get('/api/documents', async (req, res) => {
    try {
        const history = await getHistory();
        res.json(history);
    } catch (error) {
        console.error("Failed to fetch history:", error);
        res.status(500).json({ error: "Failed to fetch document history" });
    }
});

// Ingest Route
app.post('/api/ingest', upload.single('file'), async (req, res) => {
    try {
        const contentType = req.headers['content-type'] || "";
        let text = "";
        let sourceName = "";

        if (req.file) {
            sourceName = req.body.sourceName || req.file.originalname;
            const buffer = req.file.buffer;

            if (req.file.mimetype === "application/pdf" || req.file.originalname.endsWith(".pdf")) {
                const data = await pdf(buffer);
                text = data.text;
            } else {
                text = buffer.toString("utf-8");
            }
        } else {
            text = req.body.text;
            sourceName = req.body.sourceName;
        }

        if (!text) {
            return res.status(400).json({ error: "No text content found" });
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 4000,
            chunkOverlap: 400,
        });

        const chunks = await splitter.createDocuments([text]);
        const cohere = getCohereClient();
        const textsToEmbed = chunks.map((c) => c.pageContent.replace(/\n/g, " "));

        const embeddings = [];
        const BATCH_SIZE = 10; // Reduced from 90 to avoid timeouts/fetch errors

        console.log(`Processing ${textsToEmbed.length} chunks...`);

        for (let i = 0; i < textsToEmbed.length; i += BATCH_SIZE) {
            const batch = textsToEmbed.slice(i, i + BATCH_SIZE);
            if (batch.length === 0) continue;

            console.log(`Embedding batch ${i / BATCH_SIZE + 1}/${Math.ceil(textsToEmbed.length / BATCH_SIZE)} (Size: ${batch.length})`);

            try {
                const response = await cohere.embed({
                    texts: batch,
                    model: CONFIG.EMBEDDING_MODEL,
                    inputType: "search_document",
                });

                if (Array.isArray(response.embeddings)) {
                    embeddings.push(...response.embeddings);
                }
            } catch (batchError) {
                console.error(`Error in batch ${i}:`, batchError.message);
                throw batchError; // Re-throw to stop process or handle gracefully
            }
        }

        const vectors = chunks.map((chunk, i) => ({
            id: `${sourceName || "doc"}-${Date.now()}-${i}`,
            values: embeddings[i],
            metadata: {
                text: chunk.pageContent,
                source: sourceName || "Unknown",
                position: i,
                tokenEstimate: Math.round(chunk.pageContent.length / 4),
            },
        }));

        const pinecone = getPineconeClient();
        const index = pinecone.Index(CONFIG.PINECONE_INDEX);

        const upsertBatch = 50;
        for (let i = 0; i < vectors.length; i += upsertBatch) {
            const batch = vectors.slice(i, i + upsertBatch);
            await index.upsert(batch);
        }

        const historyEntry = {
            id: Date.now().toString(),
            name: sourceName,
            type: req.file ? (req.file.mimetype === "application/pdf" ? "PDF" : "File") : "Text",
            date: new Date().toISOString(),
            chunkCount: chunks.length
        };
        await addToHistory(historyEntry);

        res.json({
            success: true,
            count: chunks.length,
            message: `Successfully indexed ${vectors.length} chunks from ${sourceName} using Cohere.`,
        });

    } catch (error) {
        console.error("Ingest Error:", error);
        res.status(500).json({ error: error.message || "Failed to ingest data" });
    }
});


// Query Route
// Query Route with Streaming & History
app.post('/api/query', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "No messages provided" });
        }

        // 1. Get the latest user query
        const lastMessage = messages[messages.length - 1];
        const query = lastMessage.content;

        // 2. Retrieval (Pinecone)
        const cohere = getCohereClient();
        const embedResponse = await cohere.embed({
            texts: [query],
            model: CONFIG.EMBEDDING_MODEL,
            inputType: "search_query",
        });

        const queryEmbedding = embedResponse.embeddings[0];

        const pinecone = getPineconeClient();
        const index = pinecone.Index(CONFIG.PINECONE_INDEX);
        const searchResults = await index.query({
            vector: queryEmbedding,
            topK: 15,
            includeMetadata: true,
        });

        let contextText = "";
        let topChunks = [];

        if (searchResults.matches.length > 0) {
            const documents = searchResults.matches.map((match) => (match.metadata?.text) || "");
            const validDocs = documents.filter(d => d.length > 0);

            if (validDocs.length > 0) {
                // 3. Rerank (Cohere)
                const rerankResponse = await cohere.rerank({
                    documents: validDocs,
                    query: query,
                    topN: 5,
                    model: "rerank-english-v3.0",
                });

                topChunks = rerankResponse.results.map((result) => {
                    const originalMatch = searchResults.matches[result.index];
                    return {
                        ...originalMatch,
                        relevance_score: result.relevanceScore
                    };
                });

                contextText = topChunks
                    .map((chunk, i) => `[${i + 1}] Content: ${chunk.metadata?.text}\nSource: ${chunk.metadata?.source}`)
                    .join("\n\n");
            }
        }

        // 4. Construct System Prompt
        const systemPrompt = `
You are an intelligent assistant for a RAG application.
Your goal is to answer the user's question using the provided context.

**Instructions:**
1. **Context-Driven**: base your answer *primarily* on the provided context snippets.
2. **Conversation History**: The user may refer to previous messages. Use the conversation history to resolve pronouns or references (e.g., "it", "he", "that file").
3. **Citations**: REQUIRED. Use the reference numbers (e.g., [1]) to cite where you found information.
4. **Honesty**: If the context doesn't have the answer, say so. Do not make it up.

**Context from Documents:**
${contextText || "No relevant documents found."}
        `.trim();

        // 5. Setup LLM Messages (System + History)
        // We filter out the last message from 'messages' because we will re-add it with context if needed, 
        // OR we can just append the user message. 
        // Simplest strategy: Convert FE messages to LLM format, prepend System.
        // NOTE: We don't inject context into *every* past message, only the system prompt or the latest turn.

        const llmMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        ];

        // 6. Start Streaming Response
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Send citations metadata first as a special JSON line (optional protocol, or just let client handle it)
        // Ideally, we'd send a structured event, but for simple text streaming, we can just stream the text.
        // To handle citations on the frontend, we can send them as a JSON header line or just append them.
        // Let's send a JSON object first with citations, separated by a newline, then the text stream.

        const metadata = {
            citations: topChunks.map((chunk, i) => ({
                id: i + 1,
                text: chunk.metadata?.text,
                source: chunk.metadata?.source,
                score: chunk.relevance_score
            }))
        };

        res.write(JSON.stringify(metadata) + "\n__METADATA_END__\n");

        const groq = getGroqClient();
        const stream = await groq.chat.completions.create({
            messages: llmMessages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                res.write(content);
            }
        }

        res.end();

    } catch (error) {
        console.error("Query Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || "Failed to process query" });
        } else {
            res.end();
        }
    }
});


// Serve static files from the dist directory (one level up from server/)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle client-side routing by returning index.html for all non-API routes
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
