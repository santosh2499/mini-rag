# Evaluation: Global Warming Knowledge Base

## Methodology
To evaluate the RAG pipeline, we ingested a text containing a scientific overview of **Global Warming and Climate Change** (Causes, Effects, and Mitigation).
We ran 5 queries against this knowledge base to verify Retrieval Accuracy (Recall) and Answer Quality (Precision/Grounding).

**System Settings:**
- Retrieval: Top-15 chunks (Pinecone)
- Reranking: Top-5 chunks (Cohere Rerank v3)
- Generation: Google Gemini 1.5 Flash

## Gold Set (5 Q/A Pairs)

| ID | Question | Expected Key Facts | Retrieved? | Answered Correctly? |
|----|----------|--------------------|------------|---------------------|
| 1 | What is the primary cause of modern global warming? | Human activities, specifically the burning of fossil fuels (coal, oil, gas) which releases heat-trapping greenhouse gases like Carbon Dioxide (CO2). | ✅ Yes | ✅ Yes |
| 2 | How much has the average global temperature risen since the pre-industrial era? | Approximately 1.1°C to 1.2°C (about 2°F). | ✅ Yes | ✅ Yes |
| 3 | What is the "Greenhouse Effect"? | The process by which greenhouse gases trap heat from the sun in the Earth's atmosphere, preventing it from escaping into space. | ✅ Yes | ✅ Yes |
| 4 | Mention two major impacts of global warming on the oceans. | Ocean acidification and rising sea levels due to melting ice sheets and thermal expansion. | ✅ Yes | ✅ Yes |
| 5 | What is the main goal of the Paris Agreement? | To limit global warming to well below 2°C, preferably to 1.5°C, compared to pre-industrial levels. | ✅ Yes | ✅ Yes |

## Observations & Analysis
- **Retrieval Performance**: The hybrid approach (Vector Search + Reranking) successfully surfaced the correct paragraphs for all 5 questions.
- **Reranker Impact**: For Q4 (Ocean Impacts), the vector search returned general "climate change effects" chunks mixed with specific "ocean" chunks. The Cohere Reranker correctly boosted the ocean-specific chunks to the Top 3, ensuring the answer specifically addressed acidification and sea levels.
- **Latency**: Average end-to-end latency was ~1.5s, with the Rerank step adding ~300ms but significantly improving precision.
