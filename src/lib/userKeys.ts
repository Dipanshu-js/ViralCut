/**
 * userKeys.ts — Load user's API keys from DB and inject into providers
 * Call this at the start of any route that uses AI/video APIs
 */
import { prisma } from "./prisma";
import { setExtraGroqKeys } from "./ai";

export async function loadUserKeys(userId: string): Promise<{
  groqKeys: string[];
  elevenLabsKey?: string;
  geminiKey?: string;
  xaiKey?: string;
  runwayKey?: string;
  pikaKey?: string;
  lumaKey?: string;
  pexelsKey?: string;
  pixabayKey?: string;
  youtubeApiKey?: string;
}> {
  try {
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) return { groqKeys: [] };

    // Inject user's Groq keys into the AI rotation
    if (settings.groqKeys?.length) {
      setExtraGroqKeys(settings.groqKeys);
    }

    return {
      groqKeys: settings.groqKeys || [],
      elevenLabsKey: settings.elevenLabsKey ?? undefined,
      geminiKey: settings.geminiKey ?? undefined,
      xaiKey: settings.xaiKey ?? undefined,
      runwayKey: settings.runwayKey ?? undefined,
      pikaKey: settings.pikaKey ?? undefined,
      lumaKey: settings.lumaKey ?? undefined,
      pexelsKey: settings.pexelsKey ?? undefined,
      pixabayKey: settings.pixabayKey ?? undefined,
      youtubeApiKey: settings.youtubeApiKey ?? undefined,
    };
  } catch {
    return { groqKeys: [] };
  }
}
