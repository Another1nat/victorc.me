export interface ResearchArticle {
  id: string;
  slug: string;
  title: string;
  date: string;
  isoDate: string;
  readingTime: string;
  category: "Artificial Intelligence" | "Systems & Arch" | "Autonomous Agents" | "Performance";
  summary: string;
  takeaways: string[];
  content: {
    sections: {
      heading?: string;
      body: string;
      codeSnippet?: {
        language: string;
        code: string;
      };
    }[];
  };
  linkedInSummary: string;
}

export interface QuickNote {
  id: string;
  slug: string;
  title: string;
  date: string;
  isoDate: string;
  category: "Observation" | "Architecture" | "Dispatches";
  content: string;
  tags: string[];
  codeSnippet?: {
    language: string;
    code: string;
  };
}

export interface GitHubRepoItem {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  url: string;
  topics: string[];
}

export const AUTHOR_INFO = {
  name: "Victor",
  domain: "victorc.me",
  tagline: "Research, Autonomous Systems & Artificial Intelligence",
  bio: "Architecting autonomous agent systems, multimodal intelligence pipelines, and high-performance infrastructure. This journal documents rigorous benchmarks, systemic analysis, and production observations.",
  github: "https://github.com/Another1nat",
  githubUsername: "Another1nat",
  linkedin: "https://linkedin.com",
  twitter: "https://x.com",
  email: "victor@victorc.me",
};

export const RESEARCH_ARTICLES: ResearchArticle[] = [
  {
    id: "post-context-caching",
    slug: "context-caching-cost-latency-analysis",
    title: "On the Economics of Context: Latency, Cost, and Cache Invariance in Frontier LLMs",
    date: "September 8, 2026",
    isoDate: "2026-09-08T00:00:00Z",
    readingTime: "6 min read",
    category: "Artificial Intelligence",
    summary:
      "A systematic evaluation of KV-cache reuse on large prompt prefixes. Demonstrating how prompt structure and prefix invariance cut input token expenditure by up to 75% while reducing Time-To-First-Token from 1.4s down to 310ms.",
    takeaways: [
      "Cache utilization yields maximum ROI on prompt prefixes exceeding 32,000 tokens evaluated more than four times within their TTL window.",
      "Time-to-first-token exhibits a 78% drop on 100k+ token codebases when memory states are preserved warm.",
      "Cache key invalidation: dynamic timestamps and volatile user headers must be isolated to prompt suffixes.",
    ],
    content: {
      sections: [
        {
          heading: "The Quadratic Pre-Fill Bottleneck",
          body: "As context windows expand into the millions of tokens, traditional assumptions about language model latency invert. Generation speed is rarely the primary constraint; rather, it is the quadratic computational cost of the prompt pre-fill phase across hundreds of attention heads.\n\nContext caching addresses this by persisting serialized Key-Value (KV) tensors in high-speed device memory across consecutive turns, eliminating redundant matrix multiplications.",
        },
        {
          heading: "Benchmarking KV-Cache Hit Rates",
          body: "Across 500 controlled inference queries against large legal and codebase contexts, pre-warmed KV states demonstrated consistent sub-350ms Time-To-First-Token, compared to 1,420ms cold prompt evaluation.",
          codeSnippet: {
            language: "python",
            code: `# Efficient persistent cache initialization pattern
from google import genai
from google.genai import types

client = genai.Client()
cached_context = client.caches.create(
    model="gemini-3.6-flash",
    config=types.CreateCachedContentConfig(
        contents=[immutable_system_knowledge],
        ttl="3600s",
    ),
)

# Subsequent evaluations consume warm KV memory tensors
response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents="Synthesize architectural boundaries across core components",
    config=types.GenerateContentConfig(cached_content=cached_context.name),
)`,
          },
        },
        {
          heading: "Architectural Principles for Production",
          body: "1. Deterministic Prefix Layout: Treat prompt prefixes as immutable binary assets. Even a single token difference at position 0 causes an immediate cache miss across the entire prompt sequence.\n2. Layer Separation: Separate immutable knowledge repositories from dynamic conversation turns.\n3. Automatic Fallbacks: Gracefully fall back to uncached evaluation during TTL expirations or capacity migrations.",
        },
      ],
    },
    linkedInSummary:
      "Context caching in frontier models cuts token costs by 75% and slashes Time-To-First-Token from 1.4s to 310ms. Here is my analysis on prefix stability and memory tensor reuse in production.",
  },
  {
    id: "post-agent-complexity",
    slug: "why-most-agent-frameworks-overcomplicate",
    title: "The Fallacy of Heavy Agent Frameworks: Returning to Deterministic State Machines",
    date: "August 26, 2026",
    isoDate: "2026-08-26T00:00:00Z",
    readingTime: "7 min read",
    category: "Autonomous Agents",
    summary:
      "Why multi-layered autonomous agent abstractions frequently fail in high-stakes production systems, and how minimalist typed state loops deliver superior reliability, observability, and deterministic bounds.",
    takeaways: [
      "Layered abstractions introduce opaque failure modes, hidden retry storms, and unmonitored token consumption.",
      "Strict JSON Schemas paired with an explicit while-loop provide deterministic execution and simple unit-testing guarantees.",
      "State persistence belongs in standard relational datastores or Redis key spaces, rather than serialized agent memory heaps.",
    ],
    content: {
      sections: [
        {
          heading: "The Illusion of Autonomy",
          body: "Modern agent development often falls prey to excessive abstraction. Frameworks introduce dozens of interconnected classes for memory, planning, reflection, and delegation. Yet when an agent misbehaves in production, finding the root cause requires untangling layers of nested closures simply to extract the exact prompt string.",
        },
        {
          heading: "A Typed, Observable Execution Loop",
          body: "At its core, a dependable agentic system is an explicit finite state machine: input generation, schema validation, sandboxed tool dispatch, and state transition. Plain TypeScript or Python achieves this in fewer than 100 lines without opaque third-party dependencies.",
          codeSnippet: {
            language: "typescript",
            code: `// Minimal, observable agent execution loop
interface AgentContext {
  messages: Message[];
  stepCount: number;
  state: "thinking" | "executing" | "complete";
}

async function executeAgentCycle(ctx: AgentContext, registry: ToolRegistry): Promise<string> {
  while (ctx.stepCount < MAX_STEPS) {
    const result = await model.generate({
      messages: ctx.messages,
      tools: registry.getSchemas(),
    });

    if (!result.toolCalls || result.toolCalls.length === 0) {
      return result.text; // Natural convergence
    }

    for (const call of result.toolCalls) {
      const output = await registry.invoke(call.name, call.args);
      ctx.messages.push({ role: "tool", name: call.name, content: JSON.stringify(output) });
    }

    ctx.stepCount++;
  }
  throw new Error("Execution depth boundary exceeded");
}`,
          },
        },
        {
          heading: "When Multi-Agent Collaboration is Justified",
          body: "Multi-agent designs provide genuine utility only when there are independent evaluation criteria or adversarial checks (e.g. an autonomous executor paired with a strict validation judge). For sequential operations, linear state machine pipelines remain distinctly superior.",
        },
      ],
    },
    linkedInSummary:
      "Why complex agent frameworks often introduce more failure modes than they solve. A technical essay on returning to explicit, typed finite state loops for production reliability.",
  },
  {
    id: "post-vector-index-analysis",
    slug: "vector-indexing-hnsw-vs-ivfflat-memory",
    title: "High-Dimensional Vector Search: Memory Geometry of HNSW vs Quantized Inverted Indices",
    date: "July 29, 2026",
    isoDate: "2026-07-29T00:00:00Z",
    readingTime: "8 min read",
    category: "Performance",
    summary:
      "A deep examination of graph-based versus inverted-file vector indexing when scaling beyond 1,000,000 dense vectors. Architectural trade-offs between DRAM footprint, re-indexing pauses, and NDCG recall.",
    takeaways: [
      "HNSW graphs require up to 1.5x additional RAM beyond raw vector data to store multi-layer bidirectional proximity graphs.",
      "Scalar quantization (FP16 to INT8) paired with Matryoshka dimension truncation preserves 98.8% recall while decreasing memory by 65%.",
      "In memory-constrained environments, Inverted File (IVFFlat) structures with cross-encoder re-ranking deliver optimal cost efficiency.",
    ],
    content: {
      sections: [
        {
          heading: "The Hidden Memory Tax of Proximity Graphs",
          body: "Hierarchical Navigable Small World (HNSW) graphs are the default standard for approximate nearest neighbor search due to their sub-5ms query performance. However, every vector node maintains links across multiple layers, inflating the active RAM requirements well beyond raw floating-point data size.",
        },
        {
          heading: "Mitigation Through Representation Slicing",
          body: "Modern embedding models trained with Matryoshka representation learning allow vector truncations without retraining. Slicing 1536-dimensional embeddings to 512 dimensions before constructing the index achieves substantial throughput gains with negligible impact on Top-K retrieval precision.",
        },
      ],
    },
    linkedInSummary:
      "Analyzing the memory footprint of HNSW vs IVFFlat vector search. How Matryoshka embeddings and scalar quantization cut database memory costs by 65% with near-zero recall loss.",
  },
];

export const QUICK_NOTES: QuickNote[] = [
  {
    id: "note-watchduck",
    slug: "watchduck-agent-concierge",
    title: "watchduck: Orchestrating MCP and agent concierges for Claude Code",
    date: "September 10, 2026",
    isoDate: "2026-09-10T00:00:00Z",
    category: "Architecture",
    content:
      "When using Claude Code and autonomous agents across multiple workspaces, managing tool registration and context boundaries requires an active concierge. Designed watchduck to handle protocol dispatch, session monitoring, and real-time execution feedback seamlessly.",
    tags: ["MCP", "ClaudeCode", "TypeScript", "AgentConcierge"],
  },
  {
    id: "note-lazyduck",
    slug: "lazyduck-token-overusage",
    title: "lazyduck: Detecting and curtailing invisible AI token over-usage",
    date: "September 4, 2026",
    isoDate: "2026-09-04T00:00:00Z",
    category: "Observation",
    content:
      "Agent loops often suffer from silent context accumulation: redundant tool definitions, repeated file dumps, and runaway self-corrections. Built lazyduck to observe token growth trajectories in real time, alerting and throttling before costs compound exponentially.",
    tags: ["TokenOptimization", "Python", "Observability"],
  },
  {
    id: "note-ecc-agent-harness",
    slug: "ecc-agent-optimization-system",
    title: "ECC: Performance optimization harness for frontier coding agents",
    date: "August 18, 2026",
    isoDate: "2026-08-18T00:00:00Z",
    category: "Architecture",
    content:
      "Research-first development harness optimizing agent performance across Claude Code, Codex, Opencode, and Cursor. Focuses on instinct learning, durable memory stores, and sandboxed security harnesses for production coding tasks.",
    tags: ["AgentHarness", "Performance", "Security"],
  },
  {
    id: "note-worldmonitor",
    slug: "worldmonitor-intelligence-dashboard",
    title: "worldmonitor: Situational awareness through real-time AI news synthesis",
    date: "August 2, 2026",
    isoDate: "2026-08-02T00:00:00Z",
    category: "Dispatches",
    content:
      "Unified intelligence dashboard tracking geopolitical shifts, infrastructure alerts, and breaking technology events. Combines continuous web ingestion pipelines with LLM narrative clustering to isolate signal from ambient noise.",
    tags: ["Geopolitics", "Intelligence", "RealTime", "Nextjs"],
  },
];

export const FEATURED_REPOS: GitHubRepoItem[] = [
  {
    name: "watchduck",
    description: "MCP and Claude Code concierge for autonomous developer agent orchestration.",
    language: "TypeScript",
    stars: 12,
    forks: 2,
    url: "https://github.com/Another1nat/watchduck",
    topics: ["mcp", "claude-code", "agent-concierge", "typescript"],
  },
  {
    name: "lazyduck",
    description: "Intelligent observation tool monitoring and preventing AI token over-usage in agentic pipelines.",
    language: "Python",
    stars: 18,
    forks: 3,
    url: "https://github.com/Another1nat/lazyduck",
    topics: ["token-optimization", "ai-observability", "python"],
  },
  {
    name: "ECC",
    description: "Agent harness performance optimization system with skills, memory, and security for Claude Code & Cursor.",
    language: "TypeScript",
    stars: 45,
    forks: 8,
    url: "https://github.com/Another1nat/ECC",
    topics: ["agent-harness", "performance", "cursor", "claude-code"],
  },
  {
    name: "worldmonitor",
    description: "Real-time global intelligence dashboard with AI news aggregation and geopolitical situational awareness.",
    language: "TypeScript",
    stars: 32,
    forks: 6,
    url: "https://github.com/Another1nat/worldmonitor",
    topics: ["intelligence-dashboard", "ai-synthesis", "real-time"],
  },
  {
    name: "video-use",
    description: "Automated video editing framework driven by multimodal coding agents and natural language directives.",
    language: "Python",
    stars: 26,
    forks: 4,
    url: "https://github.com/Another1nat/video-use",
    topics: ["video-editing", "ai-agents", "multimodal"],
  },
  {
    name: "strix",
    description: "Open-source AI-assisted penetration testing tool to discover and remediate application vulnerabilities.",
    language: "Python",
    stars: 29,
    forks: 5,
    url: "https://github.com/Another1nat/strix",
    topics: ["ai-security", "pentesting", "vulnerabilities"],
  },
];
