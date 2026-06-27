// test-parser.ts
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import PdfParse from 'pdf-parse';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 1. Manually load environment variables since Next.js isn't running
dotenv.config({ path: '.env.local' });

async function runStandaloneParserTest() {
  // Target a sample resume file in your root folder
  const TARGET_RESUME = "./test_resume.pdf"; 

  try {
    console.log(`\x1b[36m[TechPath Node Test] Target File:\x1b[0m ${TARGET_RESUME}`);

    // Check if the file exists before processing
    const absolutePath = path.resolve(TARGET_RESUME);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found at ${absolutePath}. Please place a test PDF there.`);
    }

    // 2. Read the local PDF file into a binary buffer
    console.log(`\x1b[33m[TechPath Node Test] Extracting text layers from PDF...\x1b[0m`);
    const fileBuffer = await fs.readFile(absolutePath);
    const pdfData = await PdfParse(fileBuffer);
    const rawResumeText = pdfData.text;

    if (!rawResumeText.trim()) {
      throw new Error("PDF contains no readable text layers (it might be a scanned image/image-only PDF).");
    }

    console.log(`\x1b[33m[TechPath Node Test] Streaming text to Gemini for structured extraction...\x1b[0m`);

    // 3. Fire a single structured call to Gemini 2.0
    const { object } = await generateObject({
      model: google('gemini-2.0-flash'),
      apiKey: process.env.GEMINI_API_KEY,
      schema: z.object({
        name: z.string().describe("Candidate's full name"),
        email: z.string().describe("Candidate's email address"),
        skills: z.array(z.string()).describe("Array of specific technologies, programming languages, databases, or frameworks found."),
        education: z.string().describe("Summary text of degrees, majors, and universities attended."),
        experience: z.string().describe("Text overview or markdown bullet compilation of prior roles and projects.")
      }),
      prompt: `Analyze this raw plain-text resume extraction. Isolate data accurately into the structured properties required:\n\n${rawResumeText}`,
    });

    // 4. Output the beautiful, fully parsed JSON result straight to your console terminal
    console.log(`\n\x1b[32m[TechPath Node Test] SUCCESS! Parsed Structured JSON Result:\x1b[0m`);
    console.log(JSON.stringify(object, null, 2));

  } catch (error: any) {
    console.error(`\n\x1b[31m[TechPath Node Test] Execution Crashed:\x1b[0m`, error.message || error);
  }
}

runStandaloneParserTest();