// parse-resume.ts
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { extractText, getDocumentProxy } from 'unpdf';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 1. Load environment parameters from .env.local
dotenv.config({ path: '.env.local' });

async function runResumeParserTest() {
  const TARGET_FILE = "./test.pdf";

  try {
    console.log(`\x1b[36m[TechPath] Target File:\x1b[0m ${TARGET_FILE}`);

    // Verify file existence
    const absolutePath = path.resolve(TARGET_FILE);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found at ${absolutePath}. Please drop 'test.pdf' here.`);
    }

    // 2. Pure ESM Text Extraction using Mozilla PDFJS engine
    console.log(`\x1b[33m[TechPath] Parsing text layers with unpdf...\x1b[0m`);
    const fileBuffer = await fs.readFile(absolutePath);
    
    // Initialize the proxy structure using a safe binary Uint8Array
    const pdfProxy = await getDocumentProxy(new Uint8Array(fileBuffer));
    const { text: rawResumeText } = await extractText(pdfProxy, { mergePages: true });

    // Handle string results or array returns from the parser safely
    const unifiedText = Array.isArray(rawResumeText) ? rawResumeText.join("\n") : rawResumeText;

    if (!unifiedText || !unifiedText.trim()) {
      throw new Error("PDF layout contains no discoverable text characters.");
    }

    // --- NEW: PRINTING THE EXTRACTED RESUME TEXT HERE ---
    console.log(`\n\x1b[34m==================================================`);
    console.log(`[EXTRACTED RESUME RAW TEXT START]`);
    console.log(`==================================================\x1b[0m\n`);
    
    console.log(unifiedText);
    
    console.log(`\n\x1b[34m==================================================`);
    console.log(`[EXTRACTED RESUME RAW TEXT END]`);
    console.log(`==================================================\x1b[0m\n`);
    // ---------------------------------------------------

    console.log(`\x1b[33m[TechPath] Transmitting data to Gemini 2.5...\x1b[0m`);

    // 3. Leverage Vercel AI SDK to pull clean structural schemas
    const { object } = await generateObject({
      // Swapped to the fresh production model tier to clear quota blocks
      model: google('gemini-2.5-flash'), 
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
      schema: z.object({
        name: z.string().describe("Candidate full name"),
        email: z.string().describe("Candidate primary email address"),
        skills: z.array(z.string()).describe("List of code frameworks, languages, systems, and hard skills found."),
        education: z.string().describe("Academic summaries including majors, years, and schools."),
        experience: z.string().describe("Markdown list summary mapping employment tracking history.")
      }),
      prompt: `Extract structural criteria fields out of this plain-text resume:\n\n${unifiedText}`,
    });

    // 4. Output the beautiful final object
    console.log(`\n\x1b[32m[TechPath] SUCCESS! Structured Profile Output:\x1b[0m`);
    console.log(JSON.stringify(object, null, 2));

  } catch (error: any) {
    console.error(`\n\x1b[31m[TechPath] Execution Dropped:\x1b[0m`, error.message || error);
  }
}

runResumeParserTest();