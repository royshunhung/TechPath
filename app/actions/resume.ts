"use server";

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function testResumeParser(filePath: string) {
    try {
        // Enforce fallback key matching the system path requirement
        const env = { 
            ...process.env, 
            GOOGLE_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY 
        };

        const safePath = path.resolve(filePath);
        const venvCliPath = path.resolve("./.venv/bin/cvinsight");

        console.log(`[TEST] Running parser on path: ${safePath}`);

        // Execute the CLI tool
        const { stdout } = await execAsync(`"${venvCliPath}" --resume "${safePath}" --json`, { env });

        // Parse Python's stdout string directly into a JSON object
        const rawJsonOutput = JSON.parse(stdout);

        console.log("[TEST] Raw parser output received successfully!");

        return {
            success: true,
            extractedFields: {
                skills: rawJsonOutput.skills || [],
                education: rawJsonOutput.educations || rawJsonOutput.education || [],
                experience: rawJsonOutput.work_experience || rawJsonOutput.experience || []
            }
        };
    } catch (error) {
        console.error("[TEST] Parser crashed:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown extraction failure" 
        };
    }
}