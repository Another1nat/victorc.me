import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// In-memory rate limit tracker (Per IP: 5 requests every 5 minutes)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

const ALLOWED_ORIGINS = [
  "https://victorc.me",
  "https://www.victorc.me",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : "https://victorc.me";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count };
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Reject cross-origin requests from unauthorized foreign domains
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      { error: "Unauthorized cross-origin request." },
      { status: 403, headers: corsHeaders }
    );
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const { allowed, remaining } = checkRateLimit(ip);

    const rateLimitHeaders = {
      ...corsHeaders,
      "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
      "X-RateLimit-Remaining": String(remaining),
    };

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Rate limit reached (5 requests per 5 minutes to prevent abuse). Please try again in a few minutes.",
        },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const body = await req.json();
    let prompt = body?.prompt;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Valid text prompt is required." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Sanitize: strip non-printable/control ASCII characters
    prompt = prompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

    if (prompt.length > 500) {
      return NextResponse.json(
        { error: "Prompt exceeds maximum demo length (500 characters)." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback demonstration if GEMINI_API_KEY is not yet added to environment
    if (!apiKey) {
      return NextResponse.json(
        {
          text: `[Demonstration Mode - Set GEMINI_API_KEY to activate live inference]\n\nYou asked: "${prompt}"\n\nIn live production, this route dispatches to Gemini 3.6 Flash with low-latency streaming and strict token bounds (500 max tokens). Set your GEMINI_API_KEY in your Firebase App Hosting secrets or .env.local to enable live model outputs.`,
          model: "gemini-3.6-flash (simulated)",
          remainingQuota: remaining,
        },
        { headers: rateLimitHeaders }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 450,
        temperature: 0.7,
        systemInstruction:
          "You are Victor's AI Research Concierge on victorc.me. Answer questions concisely, professionally, and technically regarding artificial intelligence, autonomous agent loops, context caching, vector search, and Victor's open source tools (watchduck, lazyduck, ECC). Keep answers to 2-3 focused paragraphs max.",
      },
    });

    return NextResponse.json(
      {
        text: response.text || "No response generated.",
        model: "gemini-3.6-flash",
        remainingQuota: remaining,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate AI response." },
      { status: 500, headers: corsHeaders }
    );
  }
}
