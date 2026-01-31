import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:3001';

async function testHistory() {
    console.log("Testing GET /api/documents...");
    try {
        const res = await fetch(`${BASE_URL}/api/documents`);
        if (res.ok) {
            const data = await res.json();
            console.log("History:", data);
        } else {
            console.error("Failed to fetch history:", res.status, res.statusText);
            const text = await res.text();
            console.error("Response:", text);
        }
    } catch (e) {
        console.error("Error fetching history:", e.message);
    }
}

async function testIngestText() {
    console.log("\nTesting POST /api/ingest (Text)...");
    try {
        const res = await fetch(`${BASE_URL}/api/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: "This is a test document content for debugging.",
                sourceName: "Debug Doc"
            })
        });

        if (res.ok) {
            const data = await res.json();
            console.log("Ingest Success:", data);
        } else {
            console.error("Ingest Failed:", res.status, res.statusText);
            const text = await res.text();
            console.error("Response:", text);
        }
    } catch (e) {
        console.error("Error ingesting text:", e.message);
    }
}

async function run() {
    await testHistory();
    await testIngestText();
    await testHistory();
}

run();
