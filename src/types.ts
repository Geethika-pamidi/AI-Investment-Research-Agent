export type InvestmentDecision = 'INVEST' | 'PASS';

export interface GroundingSource {
  title: string;
  url: string;
}

export interface MetricItem {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ScoresBreakdown {
  financials: number; // 0-100
  sentiment: number;  // 0-100
  growth: number;     // 0-100
  risk: number;       // 0-100 (high score = lower risk/safer)
}

export interface ResearchProgressLog {
  agent: 'Financial Analyst' | 'Sentiment Analyst' | 'Risk Officer' | 'Investment Committee' | 'System';
  message: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: string;
}

export interface InvestmentReport {
  id: string;
  companyName: string;
  ticker: string;
  timestamp: string;
  decision: InvestmentDecision;
  confidenceScore: number; // 0-100
  overallScore: number;    // 0-100
  executiveSummary: string;
  financialAnalysis: string;
  sentimentAnalysis: string;
  swotAnalysis: string;
  keyMetrics: MetricItem[];
  scoresBreakdown: ScoresBreakdown;
  sources: GroundingSource[];
  transcript?: string; // Logs of the AI agent chat session transcript
}
