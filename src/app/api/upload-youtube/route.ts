export const runtime = "nodejs";

/**
 * /api/upload-youtube — Upload a Short directly to YouTube
 * Uses YouTube Data API v3 videos.insert endpoint
 * 
 * POST: { videoPath, title, description, tags, category, privacyStatus }
 * Returns: { ok, videoId, url }
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    videoUrl,         // URL to the video file or local path
    title,
    description = "#Shorts",
    tags = [],
    category = "22", // People & Blogs
    privacyStatus = "private", // start private for safety
    accessToken,      // YouTube OAuth access token from user
  } = await req.json();

  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      error: "YouTube OAuth access token required",
      setup: "Users must authenticate with YouTube OAuth to upload. See: https://developers.google.com/youtube/v3/guides/uploading_a_video",
      mock: true,
      mockUrl: `https://studio.youtube.com`,
    }, { status: 422 });
  }

  if (!videoUrl || !title) {
    return NextResponse.json({ error: "videoUrl and title required" }, { status: 400 });
  }

  try {
    // Step 1: Initialize resumable upload
    const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: tags.slice(0, 30),
          categoryId: category,
          defaultLanguage: "en",
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      return NextResponse.json({ ok: false, error: `YouTube API error: ${err.slice(0, 300)}` }, { status: 500 });
    }

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) {
      return NextResponse.json({ ok: false, error: "No upload URL returned" }, { status: 500 });
    }

    // Step 2: Fetch the video and upload
    const videoRes = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
    if (!videoRes.ok) return NextResponse.json({ ok: false, error: "Could not fetch video file" }, { status: 400 });

    const videoBuffer = await videoRes.arrayBuffer();

    // Step 3: Upload video bytes
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoBuffer.byteLength),
      },
      body: videoBuffer,
      signal: AbortSignal.timeout(300000), // 5 min timeout
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ ok: false, error: `Upload failed: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const data = await uploadRes.json();
    const videoId = data.id;

    return NextResponse.json({
      ok: true,
      videoId,
      url: `https://youtube.com/watch?v=${videoId}`,
      studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
      status: privacyStatus,
      title,
    });
  } catch (err) {
    console.error("[upload-youtube]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/upload-youtube",
    description: "Upload Shorts to YouTube via Data API v3",
    requires: "YouTube OAuth 2.0 access token with youtube.upload scope",
    guide: "https://developers.google.com/youtube/v3/guides/uploading_a_video",
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
  });
}
