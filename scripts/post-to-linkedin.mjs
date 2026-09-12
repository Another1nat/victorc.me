#!/usr/bin/env node

/**
 * 100% Free LinkedIn Auto-Post Script
 *
 * This script runs in GitHub Actions on push to main (or manually).
 * It extracts your latest published research article or note, formats a clean LinkedIn post,
 * and publishes it using the official LinkedIn REST API.
 *
 * Requirements:
 * - LINKEDIN_ACCESS_TOKEN (GitHub Secret)
 * - LINKEDIN_PERSON_URN (GitHub Secret, e.g. "urn:li:person:abcdef1234")
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🔍 Checking for latest research article...");

  const blogDataPath = resolve(process.cwd(), "src/data/blog.ts");
  const fileContent = readFileSync(blogDataPath, "utf-8");

  // Simple extraction of the first research article
  const titleMatch = fileContent.match(/title:\s*["']([^"']+)["']/);
  const slugMatch = fileContent.match(/slug:\s*["']([^"']+)["']/);
  const summaryMatch = fileContent.match(/linkedInSummary:\s*["']([^"']+)["']/);

  if (!titleMatch || !slugMatch) {
    console.error("❌ Could not parse latest post from src/data/blog.ts");
    process.exit(1);
  }

  const title = titleMatch[1];
  const slug = slugMatch[1];
  const summary = summaryMatch ? summaryMatch[1] : title;
  const articleUrl = `https://victorc.me/research/${slug}`;

  const postCommentary = `🔬 New Technical Research: ${title}\n\n${summary}\n\nRead the full analysis, benchmarks & code: ${articleUrl}\n\n#AI #SystemsEngineering #MachineLearning #TechBlog`;

  console.log("📝 Prepared LinkedIn Post Content:");
  console.log("-----------------------------------------");
  console.log(postCommentary);
  console.log("-----------------------------------------");

  if (isDryRun) {
    console.log("✅ Dry run complete. No API call made.");
    return;
  }

  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    console.warn(
      "⚠️ Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN environment variables.\n" +
        "Add them to your GitHub Repository Secrets to enable automatic publishing."
    );
    process.exit(0);
  }

  console.log("🚀 Publishing to LinkedIn REST API...");

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: postCommentary,
          },
          shareMediaCategory: "ARTICLE",
          media: [
            {
              status: "READY",
              description: {
                text: summary,
              },
              originalUrl: articleUrl,
              title: {
                text: title,
              },
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Failed to publish to LinkedIn: ${response.status} ${response.statusText}`);
    console.error(errorText);
    process.exit(1);
  }

  const result = await response.json();
  console.log("🎉 Successfully published to LinkedIn!", result.id);
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
