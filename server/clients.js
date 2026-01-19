import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";
import Groq from "groq-sdk";

export const getPineconeClient = () => {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        throw new Error("PINECONE_API_KEY is not set");
    }
    return new Pinecone({ apiKey });
};

export const getCohereClient = () => {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
        throw new Error("COHERE_API_KEY is not set");
    }
    return new CohereClient({
        token: apiKey,
        clientConfig: {
            timeout: 60000, // 60 seconds timeout
        }
    });
};

export const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not set");
    }
    return new Groq({ apiKey });
};

export const CONFIG = {
    PINECONE_INDEX: process.env.PINECONE_INDEX || "mini-rag-index",
    EMBEDDING_MODEL: "embed-english-v3.0",
    EMBEDDING_DIM: 1024, // Cohere v3 dimension
};
