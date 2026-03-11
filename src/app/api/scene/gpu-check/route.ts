export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { checkProviderAvailability } from "@/lib/video-providers";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await checkProviderAvailability();

  // Map to legacy format for client compatibility
  const canvasProvider = status.freeProviders.find(p => p.name === "canvas");
  const pexelsProvider = status.freeProviders.find(p => p.name === "pexels");
  const pixabayProvider = status.freeProviders.find(p => p.name === "pixabay");
  const localProvider = status.freeProviders.find(p => p.name === "local");

  return NextResponse.json({
    ok: true,
    freeMode: {
      available: status.hasAnyFree, // Canvas is always available
      hasGpu: localProvider?.available || false,
      comfyUiRunning: localProvider?.available || false,
      cudaDevices: 0,
      message: status.hasAnyFree
        ? `Free mode available via ${status.freeProviders.filter(p => p.available).map(p => p.label).join(", ")}`
        : "No free providers available",
      stack: [
        canvasProvider?.available ? "✅ Canvas Slideshow (always free)" : "Canvas Slideshow",
        pexelsProvider?.available ? "✅ Pexels Stock Video (free API)" : "⚙️ Pexels (add PEXELS_API_KEY)",
        pixabayProvider?.available ? "✅ Pixabay Stock Video (free API)" : "⚙️ Pixabay (add PIXABAY_API_KEY)",
        localProvider?.available ? "✅ Local AI (GPU detected)" : "⚙️ ComfyUI (optional GPU setup)",
      ],
      setupUrl: "https://www.pexels.com/api/",
      providers: status.freeProviders,
    },
    premiumMode: {
      available: status.hasAnyPremium,
      providers: status.premiumProviders,
    },
    recommendation: status.recommendation,
    // New detailed status
    allProviders: [...status.freeProviders, ...status.premiumProviders],
  });
}
