# Mini RAG - Track B Assessment

A minimal but mighty Retrieval-Augmented Generation (RAG) application built with **Vite**, **Express**, **Pinecone**, **Cohere** (Embeddings + Rerank), and **Google Gemini** (LLM).

## 🚀 Features

- **Ingestion Pipeline**: Takes raw text/PDFs, chunks it, embeds it using **Cohere English v3**, and stores it in Pinecone.
- **RAG Query Pipeline**:
  - **Retrieval**: Top-k vector search using Pinecone.
  - **Reranking**: Uses Cohere's Rerank v3.
  - **Generation**: Google Gemini 1.5 Flash generates answers with citations.
- **Modern UI**: Built with Tailwind CSS, Framer Motion, and Glassmorphism design principles.

## 🛠 Tech Stack

- **Frontend**: Vite + React
- **Backend**: Node.js + Express
- **Vector DB**: Pinecone (Serverless)
- **LLM**: Google Gemini 1.5 Flash
- **Embeddings**: Cohere `embed-english-v3.0` (1024 dim)
- **Reranker**: Cohere `rerank-english-v3.0`

## ⚙️ Configuration

### Embedding & Chunking
- **Model**: Cohere `embed-english-v3.0`
- **Dimension**: 1024
- **Chunk Size**: ~4000 characters 

## 🏃 Quick Start

1. **Install**
\`\`\`bash
npm install
\`\`\`

2. **Set Environment Variables**
Create a `.env.local` file:
\`\`\`bash
GOOGLE_API_KEY=AIz...
PINECONE_API_KEY=pc-...
COHERE_API_KEY=...
PINECONE_INDEX=mini-rag-index
PORT=3000
\`\`\`

⚠️ **Important**: Your Pinecone Index must be created with **1024 dimensions** (metric: cosine).

3. **Run (Development)**
\`\`\`bash
npm run dev
\`\`\`
Runs frontend (Vite) and backend (Express) concurrently.

4. **Build & Start (Production)**
\`\`\`bash
npm run build
npm run start
\`\`\`
Builds the frontend to `dist/` and serves it via the Express backend.

## 🏗 Architecture

\`\`\`mermaid
graph TD
    A[User Frontend] -->|Text/File| B(Ingest API)
    B -->|Chunk & Embed| C[Cohere Embed v3]
    C -->|Vectors| D[(Pinecone DB)]
    
    A -->|Query| E(Query API)
    E -->|Embed Query| C
    E -->|Vector Search| D
    D -->|Top-K Chunks| E
    E -->|Rerank| F[Cohere Rerank v3]
    F -->|Top-N Context| G[Gemini 1.5 Flash]
    G -->|Answer + Citations| A
\`\`\`

## 📝 Remarks & Trade-offs

-   **Provider Limits**: 
    -   Used **Google Gemini** (Free Tier) and **Cohere** (Trial) to avoid costs. 
    -   API Rate limits may apply (e.g., Gemini has a request-per-minute cap).
-   **Chunking Strategy**: 
    -   Used a simple `RecursiveCharacterTextSplitter` (~1000 tokens). 
    -   *Trade-off*: Does not respect semantic boundaries as well as semantic chunking, but is faster and cheaper.
-   **Persistence**: 
    -   Vector DB (Pinecone) is persistent, but this demo app does not implement user accounts or separation of namespaces for different users.
-   **Cost Estimation**: 
    -   Tokenizer is estimated (Char count / 4). Real tokenization would require a tokenizer library which adds bundle size.
