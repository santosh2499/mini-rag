import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    return new CohereClient({ token: apiKey });
};

export const getGeminiClient = () => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY is not set");
    }
    return new GoogleGenerativeAI(apiKey);
};

export const CONFIG = {
    PINECONE_INDEX: process.env.PINECONE_INDEX || "mini-rag-index",
    EMBEDDING_MODEL: "embed-english-v3.0",
    EMBEDDING_DIM: 1024, // Cohere v3 dimension
};
