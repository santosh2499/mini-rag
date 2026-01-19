# Mini RAG - Track B Assessment

A minimal but mighty Retrieval-Augmented Generation (RAG) application built with **Vite**, **Express**, **Pinecone**, **Cohere** (Embeddings + Rerank), and **Groq** (LLM - Llama 3.3).

## 🚀 Features

- **Ingestion Pipeline**: Takes raw text/PDFs, chunks it, embeds it using **Cohere English v3**, and stores it in Pinecone.
- **RAG Query Pipeline**:
  - **Retrieval**: Top-k vector search using Pinecone.
  - **Reranking**: Uses Cohere's Rerank v3.
  - **Generation**: Groq (Llama 3.3 70B) generates answers with citations.
- **Modern UI**: Built with Tailwind CSS, Framer Motion, and Glassmorphism design principles.

## 🛠 Tech Stack

- **Frontend**: Vite + React
- **Backend**: Node.js + Express
- **Vector DB**: Pinecone (Serverless)
- **LLM**: Groq (Llama 3.3 70B Versatile)
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
GROQ_API_KEY=gsk_...
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
flowchart TD
    %% Nodes
    User[User Frontend\n(Vite + React)]
    
    subgraph Backend [Backend Server (Express)]
        IngestAPI[Ingest API]
        QueryAPI[Query API]
    end
    
    subgraph AI_Services [AI & Storage Providers]
        CohereEmbed[Cohere Embed v3\n(Embedding)]
        CohereRerank[Cohere Rerank v3\n(Refining)]
        Pinecone[(Pinecone DB)\n(Vector Store)]
        Groq[Groq Llama 3.3\n(Generation)]
    end

    %% Flows
    
    %% Ingestion Flow
    User -- "1. Uploads Text/PDF" --> IngestAPI
    IngestAPI -- "2. Chunk & Embed" --> CohereEmbed
    CohereEmbed -- "3. Store Vectors" --> Pinecone

    %% Query Flow
    User -- "4. Asks Question" --> QueryAPI
    QueryAPI -- "5. Embed Query" --> CohereEmbed
    CohereEmbed -.-> Pinecone
    Pinecone -- "6. Retrieve Top-K" --> QueryAPI
    QueryAPI -- "7. Rerank Candidates" --> CohereRerank
    Groq -- "9. Answer + Citations" --> User

    %% Styling
    style User fill:#3b82f6,stroke:#1d4ed8,color:white
    style Pinecone fill:#10b981,stroke:#047857,color:white
    style Groq fill:#f59e0b,stroke:#d97706,color:white
\`\`\`

## 📝 Remarks & Trade-offs

-   **Provider Limits**: 
    -   Used **Groq** (Llama 3.3) and **Cohere** (Trial) to keep the project cost-free. 
    -   **Note**: The free version of the LLM has strict daily/minute **API call limits**. Application may hit `429 Too Many Requests` if used heavily.
-   **Chunking Strategy**: 
    -   Used a simple `RecursiveCharacterTextSplitter` (~1000 tokens). 
    -   *Trade-off*: Does not respect semantic boundaries as well as semantic chunking, but is faster and cheaper.
-   **Persistence**: 
    -   Vector DB (Pinecone) is persistent, but this demo app does not implement user accounts or separation of namespaces for different users.
-   **Cost Estimation**: 
    -   Tokenizer is estimated (Char count / 4). Real tokenization would require a tokenizer library which adds bundle size.
