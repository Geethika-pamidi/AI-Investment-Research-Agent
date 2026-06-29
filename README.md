# AI Investment Research Agent (Take-Home Assignment)

An intelligent, multi-agent investment research platform built for the **InsideIIM × Altuni AI Labs** AI Product Development Engineer (Intern) role. This application leverages Google Gemini models and real-time **Google Search Grounding** to perform comprehensive financial, sentiment, and SWOT analyses on any public or private company, delivering a rigorous, board-room-ready Investment vs. Pass verdict.

---

## 🚀 Live Demo & ZIP Export
- **Live Preview URL**: In the AI Studio Preview panel or new tab.
- **Instant Project ZIP Download**: Accessible via the "Download Assignment ZIP" button directly in the application's header, or from `/api/download-zip`.

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [How It Works (Architecture)](#-how-it-works-architecture)
3. [Key Decisions & Trade-Offs](#-key-decisions--trade-offs)
4. [Example runs](#-example-runs)
5. [How to Run It (Setup)](#-how-to-run-it-setup)
6. [Future Enhancements](#-future-enhancements)
7. [Appendix: Multi-Agent Chat Logs & Transcript](#-appendix-multi-agent-chat-logs--transcript)

---

## 🌟 Overview
The **AI Investment Research Agent** solves the problem of information latency and prompt-engineering fatigue for investment professionals. Instead of spending hours scouring quarterly transcripts, news articles, and risk disclosures, this agent orchestrates a **Four-Agent Virtual Task Force** to:
1. **Search & Audit Financials**: Pull real-time 2025/2026 revenue, cash flow, debt, margins, and valuation.
2. **Scan Market & Sentiment**: Assess product-market fit, competitor actions, leadership shifts, and headline sentiments.
3. **Map Risks & SWOT**: Establish critical weaknesses, lawsuit exposure, regulatory hurdles, and macro threats.
4. **Synthesize & Decide**: Conduct an Investment Committee review, calculate index scores, compile key metrics, and declare an **INVEST** or **PASS** decision.

The interface presents a responsive dashboard with visual meters, key metric cards, structured tabbed views of reports, real-time research progress tracking logs, and a history database.

---

## 🛠️ How It Works (Architecture)

### 1. Multi-Agent Orchestration Flow
We designed a sequential, message-passing multi-agent pipeline on the Express server:
```
[User Input] 
     │
     ▼
[Research Initialization] ────► Stream Progress Logs (SSE) to Frontend
     │
     ├──────────────────────────┬──────────────────────────┐
     ▼                          ▼                          ▼
[Agent 1: Financials]      [Agent 2: Sentiment]       [Agent 3: SWOT & Risk]
(Gemini 3.5-Flash +        (Gemini 3.5-Flash +        (Gemini 3.5-Flash +
 Google Search Grounding)   Google Search Grounding)   Google Search Grounding)
     │                          │                          │
     ▼                          ▼                          ▼
[Financial Report]         [Sentiment Report]         [SWOT Report]
     │                          │                          │
     └──────────────────────────┼──────────────────────────┘
                                │
                                ▼
                   [Agent 4: Investment Committee]
                   (Gemini 3.5-Flash + Structured JSON Schema)
                                │
                                ▼
                  [Consolidated Research Report] ────► Store in History / UI Render
```

- **Server-Sent Events (SSE)**: We use SSE (`/api/research/stream`) to stream live progress from our back-end agents to the React frontend. This allows the user to see exactly what each virtual agent is researching in real-time (e.g. "Risk Officer is searching for active lawsuits...").
- **Google Search Grounding**: Standard static knowledge LLMs fail at investment analysis because they lack live financial numbers and current headlines. By integrating Gemini's native Google Search Grounding, our agents search the actual web, pull accurate 2025/2026 data, and return **fully cited URLs** that we list as source hyperlinks in the UI.
- **Boardroom Synthesis**: The final Investment Committee agent takes the outputs of the previous three specialists as text context, balances the factors, and formats them into a strict, validated JSON structure.

---

## ⚖️ Key Decisions & Trade-Offs

### 1. Sequential Multi-Agent Framework vs. LangChain/LangGraph
- **Decision**: Implemented a custom lightweight Node.js multi-agent orchestration rather than heavy external graph frameworks (like LangChain.js / LangGraph.js).
- **Reasoning**: A custom-made pipeline gives us micro-level control over Server-Sent Events logging, decreases the Cold-Start times of Cloud Run containers significantly, reduces dependencies, and guarantees type-safe outputs using Gemini's native JSON schema parsing. 
- **Trade-Off**: Designing complex feedback loops (where agents argue back and forth) takes more effort in a custom pipeline than using pre-built LangGraph nodes. For our current structured 4-step pipeline, the custom implementation is much faster, cleaner, and more robust.

### 2. Live Web Crawling vs. Pre-indexed Financial APIs
- **Decision**: Leveraged Gemini's **Google Search Grounding** instead of connecting to a rigid financial API (like SEC Edgar or AlphaVantage).
- **Reasoning**: Standard stock APIs are limited to public stock tickers on major Western exchanges. Search Grounding works flawlessly for international conglomerates (e.g., Reliance Industries), private startups, and brand-new companies, as long as there is press coverage, in addition to giving us recent 2026 news headlines.
- **Trade-Off**: Real-time web searching can take 15–25 seconds to run the entire multi-agent loop, which is slower than fetching a database API. We countered this trade-off by building a gorgeous live-progress logger showing the research steps, which keeps the user highly engaged.

### 3. Local Browser History Cache over Cloud Database
- **Decision**: Reports are saved using standard browser `localStorage` in the frontend client.
- **Reasoning**: Investment reports can be large (each containing extensive markdown sections). Storing them locally ensures the application remains zero-friction, requires no complex database user logins, runs at high speed, and avoids database-access latency.
- **Trade-Off**: Users cannot sync reports across devices natively. However, we included an "Export Markdown Report" and "Download Assignment ZIP" button to allow quick saving of work.

---

## 📊 Example Runs

### Case 1: Nvidia Corporation (NVDA)
*   **Recommendation**: **INVEST** (Overall Score: 92/100, Confidence: 95%)
*   **Financials**: Strong operating margins (~60%), rapid revenue growth driven by Blackwell GPU demand, massive cash reserves.
*   **Sentiment**: Extremely high bullishness. Leadership under Jensen Huang remains legendary. Some concerns around supply chain bottlenecks are the only dampeners.
*   **SWOT Highlights**:
    *   *Strength*: Absolute dominance in AI chips (85%+ market share), deep CUDA developer ecosystem.
    *   *Weakness*: Dependence on TSMC for semiconductor foundry services.
    *   *Threats*: Growing custom silicon from hyperscalers (Google TPU, AWS Trainium), rising geopolitical risks in Taiwan.
*   **Verdict**: An asymmetric market leader. The high valuation is justified by its compound earnings trajectory.

### Case 2: Tesla, Inc. (TSLA)
*   **Recommendation**: **PASS** (Overall Score: 58/100, Confidence: 88%)
*   **Financials**: Margins under pressure due to global price cuts, stabilizing but slowed EV sales growth, high dependency on carbon credits.
*   **Sentiment**: Highly volatile. Public split over Elon Musk's brand distractions and delayed robotaxi commercialization.
*   **SWOT Highlights**:
    *   *Strength*: Unmatched charging network, highly integrated gigafactories, strong balance sheet with $26B+ in cash.
    *   *Weakness*: Inconsistent automotive gross margins, aging vehicle lineup.
    *   *Threats*: Intractable competition from BYD and Xiaomi in China, slowing global EV demand.
*   **Verdict**: The company is currently valued as an autonomous-driving and robotics software company, but its cash flow is still bound to a cyclical hardware EV market. Pass until FSD licensing or Robotaxi revenue becomes material.

---

## 🚀 How to Run It (Setup)

### Prerequisites
1. **Node.js** (v18 or higher recommended)
2. **Gemini API Key** (Set as `GEMINI_API_KEY` in environment variables)

### Installation & Run Steps
1. **Clone or unzip** the assignment folder.
2. Create a `.env` file in the root folder (or copy from `.env.example`):
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   NODE_ENV="development"
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Run in Development Mode**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:3000`.
5. **Build & Start for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔮 Future Enhancements
With more development time, we would build:
1. **Voice Briefings**: Translate the Investment Committee report into a concise 1-minute audio executive summary briefing using Gemini's native text-to-speech engine (`gemini-3.1-flash-tts-preview`).
2. **Inter-Agent Dialogues**: Introduce a debate stage where the Risk Officer and Financial Analyst challenge the Investment Committee's initial drafts before publishing.
3. **PDF Export**: Implement server-side PDF compilation to export professional financial pitch-sheets.

---

## 📝 Appendix: Multi-Agent Chat Logs & Transcript
Every analysis session automatically generates a full raw transcript (accessible in the "System Log" tab in the UI). This transcript logs the individual reports produced by each agent (Financial, Sentiment, Risk) and the final board synthesis, documenting the entire backend reasoning of the AI.
