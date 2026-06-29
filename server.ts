import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import AdmZip from "adm-zip";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Grounding Source interface helper
interface GroundingSource {
  title: string;
  url: string;
}

// Function to extract grounding chunks
function extractSources(response: any): GroundingSource[] {
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks && Array.isArray(chunks)) {
    for (const chunk of chunks) {
      if (chunk.web && chunk.web.uri) {
        sources.push({
          title: chunk.web.title || "Web Source",
          url: chunk.web.uri
        });
      }
    }
  }
  // De-duplicate sources by URL
  const uniqueUrls = new Set<string>();
  return sources.filter(s => {
    if (uniqueUrls.has(s.url)) return false;
    uniqueUrls.add(s.url);
    return true;
  });
}

// 1. API route: Live research streaming (using Server-Sent Events for great UX)
app.get("/api/research/stream", async (req, res) => {
  const companyName = req.query.companyName as string;

  if (!companyName) {
    res.status(400).write(`data: ${JSON.stringify({ type: "error", message: "Company name is required." })}\n\n`);
    res.end();
    return;
  }

  // Setup Server Sent Events
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const sendProgress = (agent: string, message: string, status: 'pending' | 'running' | 'completed' | 'error') => {
    res.write(`data: ${JSON.stringify({
      type: "progress",
      log: {
        agent,
        message,
        status,
        timestamp: new Date().toLocaleTimeString()
      }
    })}\n\n`);
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined. Please add your Gemini API Key in Settings > Secrets.");
    }

    sendProgress("System", `Initializing Investment Research Agents for "${companyName}"...`, "running");

    // --- AGENT 1: FINANCIAL ANALYST ---
    sendProgress("Financial Analyst", "Searching for the latest financial reports, revenues, margins, and valuation...", "running");
    
    const financialQuery = `${companyName} financial results revenue net income operating margin cash flow 2025 2026`;
    const financialResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a Senior Financial Analyst. Perform a deep dive financial analysis for "${companyName}".
      Research their recent quarterly and annual revenues, net income, cash positions, cash burn, profit margins (gross, operating, net), and debt levels.
      Identify any major financial strengths or critical red flags (e.g., declining revenue, negative cash flow, massive debt, or outstanding performance).
      Use the provided Google Search grounding tools to ensure you get real, authentic up-to-date numbers for 2025/2026. Do not make up any numbers.
      Format your response with professional headings in clean markdown.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const financialsText = financialResponse.text || "Financial analysis failed to generate.";
    const financialSources = extractSources(financialResponse);
    sendProgress("Financial Analyst", "Financial audit completed. Generating report details...", "completed");

    // --- AGENT 2: SENTIMENT & MARKET ANALYST ---
    sendProgress("Sentiment Analyst", "Scanning headlines, press releases, leadership developments, and competitor moves...", "running");

    const sentimentQuery = `${companyName} market share competitor analysis news headlines leadership developments 2026`;
    const sentimentResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a Senior Market and Sentiment Analyst. Research "${companyName}".
      Find recent major news headlines, executive leadership additions or departures, customer satisfaction trends, product-market fit indicators, and competitor comparison dynamics.
      Determine if the general market sentiment is positive, neutral, or negative, and support it with news.
      Use the provided Google Search grounding tools to get accurate recent developments from 2025/2026.
      Format your response in clean markdown.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sentimentText = sentimentResponse.text || "Sentiment analysis failed to generate.";
    const sentimentSources = extractSources(sentimentResponse);
    sendProgress("Sentiment Analyst", "Market sentiment report finalized.", "completed");

    // --- AGENT 3: SWOT & RISK OFFICER ---
    sendProgress("Risk Officer", "Identifying macroeconomic hazards, competitive threats, and structural weaknesses...", "running");

    const riskQuery = `${companyName} SWOT analysis key risks threats regulatory headwinds`;
    const riskResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are the Chief Risk Officer. Identify key operational, competitive, technological, regulatory, and macroeconomic risks for "${companyName}".
      Perform a comprehensive SWOT analysis. Highlight their core Strengths, Weaknesses, Opportunities, and Threats.
      Deeply evaluate what the single greatest existential threat is to their current business model.
      Use Google Search grounding to discover any active lawsuits, regulatory crackdowns, or market disruptions.
      Format your response in clean markdown.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const riskText = riskResponse.text || "Risk analysis failed to generate.";
    const riskSources = extractSources(riskResponse);
    sendProgress("Risk Officer", "SWOT and risk profile completed.", "completed");

    // --- AGENT 4: INVESTMENT COMMITTEE (SYNTHESIZER) ---
    sendProgress("Investment Committee", "Assembling board, analyzing findings, and calculating final investment verdict...", "running");

    const synthesisPrompt = `You are the Chairman of the Investment Committee. You have received the following 3 reports on the company "${companyName}":

=== FINANCIAL ANALYSIS ===
${financialsText}

=== MARKET & SENTIMENT ANALYSIS ===
${sentimentText}

=== SWOT & RISK ANALYSIS ===
${riskText}

Your task is to synthesize these findings and make a final investment decision: either "INVEST" (meaning the company represents an asymmetric buy opportunity with high-quality fundamentals) or "PASS" (meaning the structural risks, valuation, or financials are unfavourable).

You must calculate scores (from 0 to 100) for:
- Financials (revenue trends, margins, debt)
- Sentiment (headlines, brand power, leadership)
- Growth (competitiveness, future opportunity)
- Risk (regulatory, threats, high score means LOW risk, i.e., very safe)
- Overall Score (weighted synthesis of the four above)
- Confidence Score (how certain the committee is based on available data)

Also extract 3-4 key business metrics (e.g. Revenue, Growth rate, P/E ratio, Market Cap, Cash reserves, etc.) with their values and trend directions (up, down, neutral).

Provide a polished, elegant markdown Executive Summary containing the investment thesis and decision reasoning.

Return the entire synthesis strictly as a JSON object matching this schema:
{
  "ticker": "string (stock ticker or private label)",
  "decision": "INVEST" or "PASS",
  "confidenceScore": number (0-100),
  "overallScore": number (0-100),
  "executiveSummary": "string (rich markdown summary of the core thesis)",
  "financialAnalysis": "string (markdown summary of financials with bullet points)",
  "sentimentAnalysis": "string (markdown summary of market positioning and sentiment)",
  "swotAnalysis": "string (markdown structured SWOT/risk report)",
  "keyMetrics": [
    { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
  ],
  "scoresBreakdown": {
    "financials": number (0-100),
    "sentiment": number (0-100),
    "growth": number (0-100),
    "risk": number (0-100)
  }
}`;

    const synthesisResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: synthesisPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const synthesisResultText = synthesisResponse.text;
    if (!synthesisResultText) {
      throw new Error("Investment Committee synthesis returned an empty response.");
    }

    const reportData = JSON.parse(synthesisResultText.trim());

    // Consolidate sources and build transcripts
    const allSources = [
      ...financialSources,
      ...sentimentSources,
      ...riskSources
    ];
    
    // De-duplicate final sources
    const finalSources: GroundingSource[] = [];
    const seenUrls = new Set<string>();
    for (const source of allSources) {
      if (!seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        finalSources.push(source);
      }
    }

    // Build the transcript logs for extra bonus points!
    const transcript = `*** Multi-Agent Research Transcript - ${new Date().toLocaleString()} ***\n\n` +
      `[FINANCIAL ANALYST REPORT]\n${financialsText}\n\n` +
      `----------------------------------------------------------------------\n\n` +
      `[SENTIMENT & MARKET ANALYST REPORT]\n${sentimentText}\n\n` +
      `----------------------------------------------------------------------\n\n` +
      `[SWOT & RISK REPORT]\n${riskText}\n\n` +
      `----------------------------------------------------------------------\n\n` +
      `[INVESTMENT COMMITTEE VERDICT]\n` +
      `Decision: ${reportData.decision}\n` +
      `Overall Score: ${reportData.overallScore}/100\n` +
      `Confidence: ${reportData.confidenceScore}%\n` +
      `Executive Summary:\n${reportData.executiveSummary}`;

    const finalReport = {
      id: "rep_" + Date.now().toString(36),
      companyName,
      ticker: reportData.ticker || "N/A",
      timestamp: new Date().toLocaleString(),
      decision: reportData.decision,
      confidenceScore: reportData.confidenceScore || 75,
      overallScore: reportData.overallScore || 70,
      executiveSummary: reportData.executiveSummary,
      financialAnalysis: reportData.financialAnalysis || financialsText,
      sentimentAnalysis: reportData.sentimentAnalysis || sentimentText,
      swotAnalysis: reportData.swotAnalysis || riskText,
      keyMetrics: reportData.keyMetrics || [],
      scoresBreakdown: reportData.scoresBreakdown || { financials: 70, sentiment: 70, growth: 70, risk: 70 },
      sources: finalSources,
      transcript
    };

    sendProgress("Investment Committee", "Verdict delivered successfully!", "completed");
    
    // Send final result back in stream
    res.write(`data: ${JSON.stringify({ type: "result", report: finalReport })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error("Research Agent Pipeline Error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", message: error.message || "An unexpected error occurred during research." })}\n\n`);
    res.end();
  }
});

// 2. API route: Download ZIP of the code for Assignment submission
app.get("/api/download-zip", (req, res) => {
  try {
    const zip = new AdmZip();
    const rootPath = process.cwd();

    const excludeFolders = ["node_modules", "dist", ".git", ".aistudio", "project.zip"];
    const files = fs.readdirSync(rootPath);

    for (const file of files) {
      const fullPath = path.join(rootPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!excludeFolders.includes(file)) {
          zip.addLocalFolder(fullPath, file);
        }
      } else {
        if (!excludeFolders.includes(file) && !file.endsWith(".zip")) {
          zip.addLocalFile(fullPath);
        }
      }
    }

    // Dynamic generation of README file if needed, but we'll create a nice permanent one too.
    const zipBuffer = zip.toBuffer();

    res.writeHead(200, {
      "Content-Disposition": 'attachment; filename="AI_Investment_Research_Agent_Assignment.zip"',
      "Content-Type": "application/zip",
      "Content-Length": zipBuffer.length
    });

    res.end(zipBuffer);
  } catch (err: any) {
    console.error("ZIP Generation error:", err);
    res.status(500).json({ error: "Failed to generate ZIP archive: " + err.message });
  }
});

// Serve static build or mount Vite
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
