import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import pdf from 'pdf-parse-fork'; // CommonJS default import
import path from 'path';
import { fileURLToPath } from 'url';
import { getCohereClient, getPineconeClient, getGeminiClient, CONFIG } from './clients.js';

dotenv.config({ path: './.env.local' });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

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
        const BATCH_SIZE = 90;

        for (let i = 0; i < textsToEmbed.length; i += BATCH_SIZE) {
            const batch = textsToEmbed.slice(i, i + BATCH_SIZE);
            if (batch.length === 0) continue;

            const response = await cohere.embed({
                texts: batch,
                model: CONFIG.EMBEDDING_MODEL,
                inputType: "search_document",
            });

            if (Array.isArray(response.embeddings)) {
                embeddings.push(...response.embeddings);
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
app.post('/api/query', async (req, res) => {
    const startTime = Date.now();
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: "No query provided" });
        }

        const cohere = getCohereClient();
        const embedResponse = await cohere.embed({
            texts: [query],
            model: CONFIG.EMBEDDING_MODEL,
            inputType: "search_query",
        });

        if (!embedResponse.embeddings || !Array.isArray(embedResponse.embeddings)) {
            throw new Error("Failed to generate embedding");
        }
        const queryEmbedding = embedResponse.embeddings[0];

        const pinecone = getPineconeClient();
        const index = pinecone.Index(CONFIG.PINECONE_INDEX);
        const searchResults = await index.query({
            vector: queryEmbedding,
            topK: 15,
            includeMetadata: true,
        });

        if (searchResults.matches.length === 0) {
            return res.json({ answer: "No relevant information found.", citations: [] });
        }

        const documents = searchResults.matches.map((match) => (match.metadata?.text) || "");
        const validDocs = documents.filter(d => d.length > 0);

        if (validDocs.length === 0) {
            return res.json({ answer: "No relevant information found.", citations: [] });
        }

        const rerankResponse = await cohere.rerank({
            documents: validDocs,
            query: query,
            topN: 5,
            model: "rerank-english-v3.0",
        });

        const topChunks = rerankResponse.results.map((result) => {
            const originalMatch = searchResults.matches[result.index];
            return {
                ...originalMatch,
                relevance_score: result.relevanceScore
            };
        });

        const contextText = topChunks
            .map((chunk, i) => `[${i + 1}] Content: ${chunk.metadata?.text}\nSource: ${chunk.metadata?.source}`)
            .join("\n\n");

        const systemPrompt = `
You are an intelligent assistant. Your task is to synthesize an answer to the user's question using the provided context.

**Rules:**
1. **Abstractive Generation**: Do not just copy-paste snippets. Synthesize and rephrase the information into a cohesive, well-written answer.
2. **Strict Grounding**: Use ONLY the information in the provided context. Do not use outside knowledge.
3. **Citations**: You MUST cite your sources using the reference numbers (e.g., [1]) provided in the context. Every distinct claim must be cited.
4. **No Hallucination**: If the answer is not in the context, explicitly state: "I cannot answer this based on the provided context."

Example: "Artificial Intelligence was coined by John McCarthy in 1956 [1], marking the beginning of the field as an academic discipline [2]."
        `.trim();

        const userMessage = `
Context:
${contextText}

Question: 
${query}
        `.trim();

        const gemini = getGeminiClient();
        const prompt = `${systemPrompt}\n\n${userMessage}`;

        const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        res.json({
            answer,
            citations: topChunks.map((chunk, i) => ({
                id: i + 1,
                text: chunk.metadata?.text,
                source: chunk.metadata?.source,
                score: chunk.relevance_score
            })),
            timing: Date.now() - startTime,
        });

    } catch (error) {
        console.error("Query Error:", error);
        res.status(500).json({ error: error.message || "Failed to process query" });
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the dist directory (one level up from server/)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle client-side routing by returning index.html for all non-API routes
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
