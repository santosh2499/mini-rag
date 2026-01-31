import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:3001';

async function testIngestFile() {
    console.log("\nTesting POST /api/ingest (File)...");
    try {
        // Create a dummy file
        fs.writeFileSync('test_upload.txt', 'This is a test file content.');

        const form = new FormData();
        form.append('file', fs.createReadStream('test_upload.txt'));
        form.append('sourceName', 'Test File.txt');

        const res = await fetch(`${BASE_URL}/api/ingest`, {
            method: 'POST',
            body: form
        });

        if (res.ok) {
            const data = await res.json();
            console.log("File Ingest Success:", data);
        } else {
            console.error("File Ingest Failed:", res.status, res.statusText);
            const text = await res.text();
            console.error("Response:", text);
        }

        // Cleanup
        fs.unlinkSync('test_upload.txt');

    } catch (e) {
        console.error("Error ingesting file:", e.message);
    }
}

async function run() {
    await testIngestFile();
}

run();
