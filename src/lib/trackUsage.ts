/**
 * Call this after any significant user action (video generation, analysis, etc.)
 * It increments the usage counter and triggers the UsageGate if limit is hit.
 *
 * Usage:
 *   import { trackUsage } from "@/lib/trackUsage";
 *   await trackUsage();
 */
export async function trackUsage(): Promise<{ limited: boolean }> {
  try {
    const res = await fetch("/api/usage", { method: "POST" });
    const data = await res.json();
    if (data.limited) {
      // Fire event so UsageGate in Shell picks it up
      window.dispatchEvent(new Event("vc:usage"));
    }
    return { limited: !!data.limited };
  } catch {
    return { limited: false };
  }
}
