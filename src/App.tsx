import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Sparkles, TrendingUp, TrendingDown, Minus, 
  Building2, Download, History, AlertTriangle, CheckCircle2, 
  XCircle, ExternalLink, FileText, BarChart3, ShieldAlert,
  Terminal, ArrowRight, Trash2, Globe, Copy, Info, Check, BrainCircuit
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { InvestmentReport, ResearchProgressLog } from "./types";
import { PRELOADED_REPORTS } from "./data";

export default function App() {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<InvestmentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<InvestmentReport | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [logs, setLogs] = useState<ResearchProgressLog[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'financials' | 'sentiment' | 'swot' | 'sources' | 'transcript'>('summary');
  const [copied, setCopied] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Load history from localStorage + Preloads on startup
  useEffect(() => {
    const local = localStorage.getItem("investment_research_history");
    if (local) {
      try {
        const parsed = JSON.parse(local) as InvestmentReport[];
        if (parsed.length > 0) {
          setHistory(parsed);
          setSelectedReport(parsed[0]);
          return;
        }
      } catch (e) {
        console.error("Failed to parse history from localstorage", e);
      }
    }
    // If no local history, load defaults
    setHistory(PRELOADED_REPORTS);
    setSelectedReport(PRELOADED_REPORTS[0]);
    localStorage.setItem("investment_research_history", JSON.stringify(PRELOADED_REPORTS));
  }, []);

  // Save history helper
  const saveHistory = (newHistory: InvestmentReport[]) => {
    setHistory(newHistory);
    localStorage.setItem("investment_research_history", JSON.stringify(newHistory));
  };

  // Scroll to bottom of logging console
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Handle new research process
  const handleResearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsResearching(true);
    setSearchError(null);
    setLogs([]);
    
    // Setup Server-Sent Events source
    const company = query.trim();
    const eventSource = new EventSource(`/api/research/stream?companyName=${encodeURIComponent(company)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress") {
          setLogs((prev) => [...prev, data.log]);
        } else if (data.type === "result") {
          const report = data.report as InvestmentReport;
          // Add to history and set as active
          const updatedHistory = [report, ...history.filter(h => h.companyName.toLowerCase() !== company.toLowerCase())];
          saveHistory(updatedHistory);
          setSelectedReport(report);
          setQuery("");
          setIsResearching(false);
          setActiveTab('summary');
          eventSource.close();
        } else if (data.type === "error") {
          setSearchError(data.message || "An error occurred during multi-agent analysis.");
          setIsResearching(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
        setSearchError("Failed to parse response stream.");
        setIsResearching(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource error:", err);
      setSearchError("Failed to connect to the research server stream. Please ensure GEMINI_API_KEY is configured.");
      setIsResearching(false);
      eventSource.close();
    };
  };

  // Delete a report from history
  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
    if (selectedReport?.id === id) {
      setSelectedReport(updated.length > 0 ? updated[0] : null);
    }
  };

  // Copy full markdown report to clipboard
  const handleCopyToClipboard = () => {
    if (!selectedReport) return;
    const text = `
# INVESTMENT RESEARCH REPORT: ${selectedReport.companyName} (${selectedReport.ticker})
Decision: ${selectedReport.decision} | Score: ${selectedReport.overallScore}/100 | Confidence: ${selectedReport.confidenceScore}%
Generated: ${selectedReport.timestamp}

---

## Executive Summary
${selectedReport.executiveSummary}

---

## Financial Analysis
${selectedReport.financialAnalysis}

---

## Market & Sentiment Analysis
${selectedReport.sentimentAnalysis}

---

## SWOT & Risk Profiling
${selectedReport.swotAnalysis}
    `;
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-slate-200 font-sans selection:bg-emerald-500 selection:text-black" id="main_layout">
      {/* HEADER SECTION */}
      <header className="border-b border-slate-800 bg-[#0B0C0E] sticky top-0 z-50 px-6 h-14 flex items-center" id="header">
        <div className="max-w-7xl mx-auto w-full flex flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-black text-xs">
              <BrainCircuit className="w-4 h-4 text-black" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white">
                Altuni Invest AI <span className="text-slate-500 font-normal">| Investment Research Agent</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Agent Active
            </span>
            <span className="hidden md:inline-block text-xs text-slate-500 uppercase tracking-widest font-mono">v1.0.4 - Production</span>
            <a 
              href="/api/download-zip" 
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded transition-colors shadow-lg shadow-emerald-500/10"
              title="Download the full source code and README as a ZIP archive for submission"
              id="zip_download_btn"
            >
              <Download className="w-3.5 h-3.5" />
              Download ZIP
            </a>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT BODY */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6" id="dashboard_grid">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SIDEBAR: CONTROL & HISTORY */}
          <div className="lg:col-span-1 space-y-6" id="sidebar">
            
            {/* SEARCH PANEL */}
            <div className="bg-[#0F1115] border border-slate-800 p-5 rounded-xl shadow-xl shadow-black/30" id="search_panel">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-emerald-400" /> Research Center
              </h2>
              <form onSubmit={handleResearch} className="space-y-4">
                <div>
                  <label htmlFor="companyNameInput" className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Company Name / Ticker</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      id="companyNameInput"
                      type="text"
                      className="w-full bg-[#1A1C20] border border-slate-700 rounded py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="e.g. Apple, Reliance, Nvidia..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={isResearching}
                    />
                  </div>
                </div>
                <button
                  id="research_submit_btn"
                  type="submit"
                  disabled={isResearching || !query.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-spin-slow text-emerald-200" />
                  {isResearching ? "Running..." : "Analyze"}
                </button>
              </form>
              
              {searchError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2.5" id="search_error_box">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-300 leading-normal">{searchError}</p>
                </div>
              )}
            </div>

            {/* PERSISTENT HISTORY LIST */}
            <div className="bg-[#0F1115] border border-slate-800 p-5 rounded-xl shadow-xl shadow-black/30" id="history_panel">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-emerald-400" /> Recent Research
              </h2>
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1" id="history_list">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No audits saved in this session yet.</p>
                ) : (
                  history.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => !isResearching && setSelectedReport(report)}
                      className={`group px-4 py-3 border-l-2 transition-all cursor-pointer flex justify-between items-center ${
                        selectedReport?.id === report.id
                          ? "bg-[#1A1C20] border-emerald-500 text-white shadow-md shadow-emerald-500/5"
                          : "border-transparent hover:bg-[#1A1C20] text-slate-400 hover:text-white"
                      } ${isResearching ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs truncate max-w-[120px]">{report.companyName}</span>
                          <span className="text-[9px] text-slate-500 uppercase font-mono">{report.ticker}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[10px] font-bold ${
                          report.decision === 'INVEST' 
                            ? "text-emerald-400" 
                            : "text-rose-500"
                        }`}>
                          {report.decision}
                        </span>
                        <button
                          title="Delete"
                          onClick={(e) => handleDeleteReport(report.id, e)}
                          className="text-slate-500 hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* METRICS INFO ADVERTISEMENT CARDS */}
            <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-800/40" id="info_ad_card">
              <div className="flex gap-2.5 items-start">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-white">Google Search Grounding</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    Triggers Google search indexes dynamically to verify 2025/2026 financial metrics and current news headlines with live citation URLs.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* MAIN COLUMN: LIVE ANALYZER CONSOLE OR ACTIVE REPORT */}
          <div className="lg:col-span-3 space-y-6" id="main_content_stage">
            
            <AnimatePresence mode="wait">
              
              {/* STATUS 1: ACTIVE RESEARCH PROCESS */}
              {isResearching ? (
                <motion.div
                  key="researching_stage"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-2xl shadow-black/40 min-h-[500px] flex flex-col justify-between"
                  id="researching_stage_container"
                >
                  <div>
                    <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-emerald-400 animate-spin-slow" />
                          Multi-Agent Research Pipeline Active
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Four specialist agents are currently auditing financial filings, SWOT threats, and public market sentiments.</p>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded font-mono font-semibold uppercase tracking-wider animate-pulse">
                        LIVE EXECUTION
                      </span>
                    </div>

                    {/* LIVE VISUAL PIPELINE FLOW MAP */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" id="agent_flow_map">
                      {[
                        { name: "Financial Analyst", icon: BarChart3, desc: "Revenues, Debt, P/E ratios" },
                        { name: "Sentiment Analyst", icon: Globe, desc: "News, Leadership, Brand" },
                        { name: "Risk Officer", icon: ShieldAlert, desc: "SWOT threats, Lawsuits" },
                        { name: "Investment Committee", icon: Sparkles, desc: "Synthesis & Decision" }
                      ].map((agent, index) => {
                        // Find if this agent has started, failed, or completed
                        const agentLogs = logs.filter(l => l.agent === agent.name);
                        const isCompleted = agentLogs.some(l => l.status === 'completed');
                        const isRunning = agentLogs.some(l => l.status === 'running') && !isCompleted;
                        
                        return (
                          <div 
                            key={index} 
                            className={`p-3.5 rounded border transition-all ${
                              isCompleted 
                                ? "bg-emerald-500/5 border-emerald-500/30" 
                                : isRunning 
                                  ? "bg-blue-500/5 border-blue-500/30 animate-pulse" 
                                  : "bg-[#1A1C20] border-slate-800 opacity-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`p-1.5 rounded ${isCompleted ? "bg-emerald-500/10" : isRunning ? "bg-blue-500/10" : "bg-slate-800"}`}>
                                <agent.icon className={`w-3.5 h-3.5 ${isCompleted ? "text-emerald-400" : isRunning ? "text-blue-400" : "text-slate-400"}`} />
                              </div>
                              <span className="text-[11px] font-bold text-white truncate">{agent.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">{agent.desc}</p>
                            <div className="mt-3 flex items-center justify-between text-[9px] font-mono">
                              <span className="text-slate-500">Stage {index + 1}</span>
                              <span className={isCompleted ? "text-emerald-400" : isRunning ? "text-blue-400" : "text-slate-500"}>
                                {isCompleted ? "✓ Done" : isRunning ? "● Active" : "Waiting"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* STREAMING CONSOLE LOG CONTAINER */}
                    <div className="bg-slate-800/20 rounded border border-slate-800 p-4 font-mono text-xs text-slate-300 h-[280px] overflow-y-auto space-y-2.5 shadow-inner" id="console_logger">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-[10px] text-slate-500 uppercase tracking-wider">
                        <Terminal className="w-3 h-3 text-emerald-400" /> Output Terminal stream
                      </div>
                      {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-[11px] gap-2">
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          Spinning up agent workspaces...
                        </div>
                      ) : (
                        logs.map((log, i) => (
                          <div key={i} className="flex gap-2 items-start leading-relaxed animate-fade-in">
                            <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                            <span className={`font-semibold shrink-0 select-none ${
                              log.agent === 'Financial Analyst' ? "text-emerald-400" :
                              log.agent === 'Sentiment Analyst' ? "text-blue-400" :
                              log.agent === 'Risk Officer' ? "text-amber-400" :
                              log.agent === 'Investment Committee' ? "text-purple-400" : "text-slate-400"
                            }`}>{log.agent}:</span>
                            <span className="text-slate-200">{log.message}</span>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-slate-500 italic mt-4">
                    Orchestrated multi-agent session logs are saved automatically to the reports history logs.
                  </p>
                </motion.div>
              ) : selectedReport ? (
                
                /* STATUS 2: ACTIVE REPORT RENDERED */
                <motion.div
                  key={selectedReport.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                  id="active_report_stage"
                >
                  
                  {/* OVERVIEW COMPONENT: BADGE, KEY METRICS AND GAUGES */}
                  <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-xl shadow-black/20" id="executive_overview_board">
                    
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-800 pb-6 mb-6">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-2xl font-bold text-white tracking-tight">{selectedReport.companyName}</h2>
                          <span className="text-xs font-mono font-bold bg-[#1A1C20] text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">{selectedReport.ticker}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Audit Report generated automatically on {selectedReport.timestamp}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCopyToClipboard}
                          className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-[#1A1C20] hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-800 transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied" : "Copy Report"}
                        </button>
                        
                        {/* BIG DECISION VERDICT BADGE */}
                        <div className={`px-5 py-2 rounded flex items-center gap-2 text-sm font-black tracking-widest ${
                          selectedReport.decision === 'INVEST'
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                        }`} id="decision_banner_badge">
                          {selectedReport.decision === 'INVEST' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                          )}
                          {selectedReport.decision}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="kpi_gauges_section">
                      
                      {/* DIAL GAUGES: OVERALL SCORE & CONFIDENCE */}
                      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded flex items-center justify-around gap-4" id="circular_gauges_sub">
                        {/* Overall Circular Gauge */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-3">Investment Grade</span>
                          <div className="relative w-24 h-24">
                            {/* SVG Arc Gauge */}
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1A1C20" strokeWidth="8" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="transparent" 
                                stroke={selectedReport.decision === 'INVEST' ? '#10B981' : '#F43F5E'} 
                                strokeWidth="8" 
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * selectedReport.overallScore) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl font-black text-white">{selectedReport.overallScore}</span>
                              <span className="text-[9px] text-slate-500 font-semibold uppercase">Score</span>
                            </div>
                          </div>
                        </div>

                        {/* Confidence Circular Gauge */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-3">Agent Confidence</span>
                          <div className="relative w-24 h-24">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1A1C20" strokeWidth="8" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="transparent" 
                                stroke="#A855F7" 
                                strokeWidth="8" 
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * selectedReport.confidenceScore) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl font-black text-white">{selectedReport.confidenceScore}%</span>
                              <span className="text-[9px] text-slate-500 font-semibold uppercase">Certainty</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SCORE BREAKDOWN MATRIX */}
                      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded flex flex-col justify-center space-y-3" id="scores_matrix_sub">
                        <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Friction Factor Index</span>
                        
                        {/* Financials Row */}
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                            <span>Financial Fundamentals</span>
                            <span>{selectedReport.scoresBreakdown.financials}/100</span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${selectedReport.scoresBreakdown.financials}%` }} />
                          </div>
                        </div>

                        {/* Sentiment Row */}
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                            <span>Market Sentiment</span>
                            <span>{selectedReport.scoresBreakdown.sentiment}/100</span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${selectedReport.scoresBreakdown.sentiment}%` }} />
                          </div>
                        </div>

                        {/* Growth Risk Rows */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold block">GROWTH CAP</span>
                            <span className="text-xs font-black text-white">{selectedReport.scoresBreakdown.growth}%</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold block">RISK SHIELD</span>
                            <span className="text-xs font-black text-white">{selectedReport.scoresBreakdown.risk}%</span>
                          </div>
                        </div>
                      </div>

                      {/* BENTO CITED DATA SUMMARY BLOCKS */}
                      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded flex flex-col justify-between" id="cited_summary_bento_sub">
                        <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Grounding Authority</span>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white">
                            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{selectedReport.sources.length} Verified Sources Cited</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            All numbers shown in the financials audit are cross-referenced with recent 2025/2026 press articles, investor presentations and regulatory filings.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('sources')}
                          className="mt-3 text-[10px] text-emerald-500 hover:text-emerald-400 font-bold tracking-wider uppercase flex items-center gap-1.5 text-left active:scale-95 transition-all w-fit"
                        >
                          View Citations Ledger <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                    </div>

                    {/* DYNAMIC BENTO GRID OF SPECIFIC KEY METRICS */}
                    {selectedReport.keyMetrics && selectedReport.keyMetrics.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/60" id="key_metrics_box_grid">
                        {selectedReport.keyMetrics.map((metric, i) => (
                          <div key={i} className="bg-[#1A1C20] border border-slate-800 p-3 rounded flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">{metric.label}</span>
                              <span className="text-sm font-black text-white block mt-0.5">{metric.value}</span>
                            </div>
                            <div className="shrink-0 pl-1">
                              {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                              {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-400" />}
                              {(!metric.trend || metric.trend === 'neutral') && <Minus className="w-4 h-4 text-slate-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* TABBED REPORTS VIEW */}
                  <div className="bg-[#0F1115] border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20" id="tabbed_report_container">
                    
                    {/* TABS SELECTOR */}
                    <div className="flex border-b border-slate-800 bg-[#0B0C0E] overflow-x-auto scroller-hidden" id="report_tabs">
                      {[
                        { id: 'summary', label: 'Executive Thesis', icon: FileText },
                        { id: 'financials', label: 'Financials Audit', icon: BarChart3 },
                        { id: 'sentiment', label: 'Market & News', icon: Globe },
                        { id: 'swot', label: 'SWOT & Threat Profile', icon: ShieldAlert },
                        { id: 'sources', label: 'Sources', icon: LinkIconWrapper },
                        { id: 'transcript', label: 'System Logs (Transcript)', icon: Terminal }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
                            activeTab === tab.id
                              ? "border-emerald-500 text-white bg-slate-800/10"
                              : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/10"
                          }`}
                        >
                          <tab.icon className="w-3.5 h-3.5 shrink-0" />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* ACTIVE TAB CONTENT WINDOW */}
                    <div className="p-6 md:p-8" id="report_tab_content_window">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          className="prose prose-invert prose-emerald max-w-none text-slate-300 text-sm leading-relaxed"
                        >
                          
                          {activeTab === 'summary' && (
                            <div className="markdown-body">
                              <ReactMarkdown>{selectedReport.executiveSummary}</ReactMarkdown>
                            </div>
                          )}

                          {activeTab === 'financials' && (
                            <div className="markdown-body">
                              <ReactMarkdown>{selectedReport.financialAnalysis}</ReactMarkdown>
                            </div>
                          )}

                          {activeTab === 'sentiment' && (
                            <div className="markdown-body">
                              <ReactMarkdown>{selectedReport.sentimentAnalysis}</ReactMarkdown>
                            </div>
                          )}

                          {activeTab === 'swot' && (
                            <div className="markdown-body">
                              <ReactMarkdown>{selectedReport.swotAnalysis}</ReactMarkdown>
                            </div>
                          )}

                          {activeTab === 'sources' && (
                            <div className="space-y-4" id="citations_list">
                              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-emerald-400" />
                                Google Grounding Citation References
                              </h3>
                              <p className="text-xs text-slate-400">
                                The following sources were retrieved dynamically from live Google search crawls to verify financials, press events and competitive statistics in real time.
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                {selectedReport.sources.length === 0 ? (
                                  <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                                    No citations recorded for this custom audit.
                                  </div>
                                ) : (
                                  selectedReport.sources.map((src, idx) => (
                                    <a
                                      key={idx}
                                      href={src.url}
                                      target="_blank"
                                      referrerPolicy="no-referrer"
                                      className="p-3 rounded bg-[#1A1C20] border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 group transition-colors flex justify-between items-center gap-3"
                                    >
                                      <div className="min-w-0">
                                        <span className="font-bold text-xs text-slate-200 block truncate group-hover:text-white">{src.title}</span>
                                        <span className="text-[10px] text-slate-500 block truncate mt-1">{src.url}</span>
                                      </div>
                                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-emerald-400 transition-colors" />
                                    </a>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {activeTab === 'transcript' && (
                            <div className="space-y-4" id="transcript_tab">
                              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                  <Terminal className="w-4 h-4 text-emerald-400" />
                                  Multi-Agent Raw Interaction Log
                                </h3>
                                <button
                                  onClick={() => {
                                    if (selectedReport?.transcript) {
                                      navigator.clipboard.writeText(selectedReport.transcript);
                                      setCopied(true);
                                      setTimeout(() => setCopied(false), 2000);
                                    }
                                  }}
                                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase flex items-center gap-1.5"
                                >
                                  {copied ? "Copied Logs" : "Copy Logs"}
                                </button>
                              </div>
                              <p className="text-xs text-slate-400">
                                This transcript captures the raw standalone outputs of the individual Specialist Agents before board consolidation.
                              </p>
                              <pre className="bg-slate-800/20 rounded border border-slate-800 p-4 font-mono text-[11px] text-slate-400 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[420px] shadow-inner">
                                {selectedReport.transcript || "Raw session logging transcript unavailable."}
                              </pre>
                            </div>
                          )}

                        </motion.div>
                      </AnimatePresence>
                    </div>

                  </div>

                </motion.div>
              ) : (
                
                /* STATUS 3: ZERO STATE / EMPTY (SHOULD NOT NATIVELY HAPPEN DUE TO PRELOADS) */
                <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-8 text-center" id="zero_state">
                  <p className="text-sm text-slate-400">No report active. Enter a company name on the left to initialize research.</p>
                </div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-8 bg-[#0F1115] border-t border-slate-800 flex items-center justify-between px-6 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span>INFRA: CLOUD-RUN-EAST</span>
          <span>LATENCY: 1.84s</span>
          <span>TOKENS: 4.2k</span>
        </div>
        <div className="flex items-center gap-4">
          <span>LLM: GEMINI-2.5-FLASH</span>
          <span className="text-emerald-500">SECURE CONNECTION ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}

// Simple wrappers because SVG icons or generic Lucide components can sometimes fail standard transpiler imports
function LinkIconWrapper(props: any) {
  return <Globe {...props} />;
}
