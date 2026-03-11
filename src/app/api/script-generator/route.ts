export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { aiText } from "@/lib/ai";
import { loadUserKeys } from "@/lib/userKeys";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await loadUserKeys(user.id);

  const {
    topic, style = "educational", platform = "youtube",
    duration = 60, tone = "engaging", outline,
    seriesMode = false, previousTopics = [] as string[],
    niche = "general",
  } = await req.json();

  if (!topic?.trim()) return NextResponse.json({ error: "Topic required" }, { status: 400 });

  // Niche-specific prompt adjustments
  const nicheContext: Record<string, string> = {
    finance:     "Use finance terminology naturally. Reference real numbers and percentages. Include disclaimer.",
    fitness:     "Include specific exercises, sets/reps if applicable. Use energetic, motivating tone.",
    tech:        "Explain technical concepts simply. Use analogies. Focus on practical applications.",
    mindset:     "Use psychological insights. Reference studies if possible. Include personal story.",
    cooking:     "Be sensory — describe tastes, textures. Include specific measurements and timings.",
    travel:      "Paint vivid visual pictures. Include specific tips locals know. Create wanderlust.",
    general:     "",
  };

  const nicheHint = nicheContext[niche] || "";
  const seriesHint = seriesMode && previousTopics.length > 0
    ? `\n\nThis is part of a series. Previous episodes covered: ${previousTopics.join(", ")}. Reference continuity naturally — make callbacks without requiring viewers to have seen previous episodes.`
    : "";

  const script = await aiText(
    `You are a viral content script writer. Write compelling scripts optimized for ${platform}. ${nicheHint}`,
    `Write a ${duration}-second viral video script about: "${topic}"
Style: ${style} | Tone: ${tone} | Platform: ${platform} | Niche: ${niche}
${outline ? `Follow this outline:\n${outline}` : ""}${seriesHint}

Format with clear markers:
[HOOK] — First 3-5 seconds. Pattern interrupt. No context yet.
[HOOK VISUAL] — What viewers see on screen during the hook
[BRIDGE] — Establish credibility/context (5-10s)
[SCENE 1] — First main point with story/example
[SCENE 2] — Second point with surprising insight
[SCENE 3] — Third point or climactic moment
[CTA] — Call to action (last 5s, natural not salesy)

Rules:
- Hook MUST be a pattern interrupt — shock, curiosity gap, or bold claim
- Every sentence should be short and punchy (avg 8 words)
- Include B-roll suggestions in [brackets] after scene markers
- End with a cliffhanger or promise that makes them follow
- Total word count: ~${Math.round(duration * 2.3)} words`
  );

  return NextResponse.json({ ok: true, script, wordCount: script.split(/\s+/).length });
}
