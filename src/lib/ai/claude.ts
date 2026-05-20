import { env } from "@/env";

type ClaudeResponse = {
  content: Array<{ text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1000;

export type AiFeature =
  | "title"
  | "description"
  | "email"
  | "lessonOutline"
  | "lessonContent"
  | "campaignSubject"
  | "campaignBody";

const SYSTEM_PROMPTS: Record<AiFeature, string> = {
  title:
    "You are a copywriter for creator businesses. Generate a compelling, SEO-friendly title. Respond with only the title text, no quotes or extra formatting.",
  description:
    "You are a copywriter for creator businesses. Generate a compelling product or course description. Use markdown for formatting. Keep it under 300 words.",
  email:
    "You are an email marketer for a creator business. Write a promotional email. Use a conversational tone. Include a clear call to action. Keep it under 200 words.",
  lessonOutline:
    "You are a course content strategist. Create a detailed lesson outline with 4-6 key points. Format as a bullet list. Keep each point concise.",
  lessonContent:
    "You are an expert educator creating lesson content. Write comprehensive, engaging educational content. Use clear explanations and examples. Format with markdown headings and paragraphs.",
  campaignSubject:
    "You are an email marketer. Generate 3 compelling subject line options for a marketing campaign. Return them as a numbered list. Each under 60 characters.",
  campaignBody:
    "You are an email marketer for a creator business. Write an engaging campaign email body. Use HTML formatting with proper structure. Include a clear headline, body text, and call to action.",
};

export async function generateWithClaude(
  feature: AiFeature,
  context: string,
  options?: { maxTokens?: number }
): Promise<{ content: string; tokensIn: number; tokensOut: number } | null> {
  if (!env.ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(CLAUDE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: options?.maxTokens ?? MAX_TOKENS,
        system: SYSTEM_PROMPTS[feature],
        messages: [
          {
            role: "user",
            content: context,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API error (${response.status}): ${errorText}`);
      return null;
    }

    const data = (await response.json()) as ClaudeResponse;
    const content = data.content
      .map((c) => c.text)
      .join("\n")
      .trim();

    return {
      content,
      tokensIn: data.usage.input_tokens,
      tokensOut: data.usage.output_tokens,
    };
  } catch (error) {
    console.error("Claude API call failed:", error);
    return null;
  }
}