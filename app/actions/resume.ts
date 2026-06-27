"use server";

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import PdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

export async function parseResumeWithAI(relativeFilePath: string) {
  try {
    const absolutePath = path.resolve(relativeFilePath);
    
    // 1. Read PDF file into binary buffer natively in Node
    const fileBuffer = await fs.readFile(absolutePath);
    
    // 2. Extract raw plain text from PDF structure
    const pdfData = await PdfParse(fileBuffer);
    const rawResumeText = pdfData.text;

    if (!rawResumeText.trim()) {
      throw new Error("PDF contains no readable text layers (scanned image).");
    }

    // 3. Leverage Vercel AI SDK to enforce structural schema compliance
    const { object } = await generateObject({
      model: google('gemini-2.0-flash'), // Blazing fast for text processing
      apiKey: process.env.GEMINI_API_KEY,
      schema: z.object({
        skills: z.array(z.string()).describe("List of engineering frameworks, databases, and programming languages found."),
        education: z.string().describe("A concise summary string of degrees, universities, and graduation status."),
        experience: z.string().describe("Paragraph summary or markdown bullets capturing prior projects and work roles.")
      }),
      prompt: `Analyze the following raw plain-text resume extraction. Isolate data accurately into structured properties:\n\n${rawResumeText}`,
    });

    return { success: true, data: object };

  } catch (error: any) {
    console.error("Node resume parsing exception:", error.message || error);
    return { success: false, error: error.message || "Failed extraction execution." };
  }
}