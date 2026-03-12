export const runtime = "nodejs";

/**
 * /api/publish — Upload video to YouTube via YouTube Data API v3
 *
 * POST body:
 *   videoData: string     — base64 encoded video or public URL
 *   title: string
 *   description: string
 *   tags: string[]
 *   privacy: "public"|"private"|"unlisted"
 *   accessToken: string   — YouTube OAuth2 token from client
 *
 * NOTE: Requires user OAuth2 flow for YouTube.
 * This route handles the upload once the client has an access token.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    videoUrl, // public URL or blob URL
    videoBase64, // base64 data
    title = "My Short",
    description = "Created with ViralCut AI 🎬",
    tags = ["shorts", "viral"],
    privacy = "private",
    accessToken, // YouTube OAuth2 token
    scheduledAt, // ISO date string for scheduling
  } = await req.json();

  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      requiresAuth: true,
      authUrl: getYouTubeAuthUrl(),
      message: "YouTube OAuth2 required. Click 'Connect YouTube' to authorize.",
    });
  }

  try {
    // Build metadata
    const metadata = {
      snippet: {
        title: title.slice(0, 100),
        description: `${description}\n\n#shorts #viral`,
        tags: [...tags, "shorts"].slice(0, 30),
        categoryId: "22", // People & Blogs
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
        ...(scheduledAt ? { publishAt: scheduledAt } : {}),
      },
    };

    // Get video as buffer
    let videoBuffer: Buffer;
    if (videoBase64) {
      const b64 = videoBase64.replace(/^data:video\/[^;]+;base64,/, "");
      videoBuffer = Buffer.from(b64, "base64");
    } else if (videoUrl) {
      const res = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
      videoBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: "videoUrl or videoBase64 required" },
        { status: 400 },
      );
    }

    // Upload to YouTube using resumable upload
    const mimeType = "video/webm";
    const metadataStr = JSON.stringify(metadata);

    // Initiate resumable upload
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(videoBuffer.length),
        },
        body: metadataStr,
      },
    );

    if (!initRes.ok) {
      const err = await initRes.text();
      if (initRes.status === 401) {
        return NextResponse.json({
          ok: false,
          error: "Token expired",
          requiresReauth: true,
        });
      }
      return NextResponse.json(
        { ok: false, error: `YouTube API error: ${err.slice(0, 200)}` },
        { status: initRes.status },
      );
    }

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl)
      return NextResponse.json(
        { ok: false, error: "No upload URL from YouTube" },
        { status: 500 },
      );

    // Upload video bytes
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(videoBuffer.length),
      },
      body: new Uint8Array(videoBuffer),
    });

    if (!uploadRes.ok && uploadRes.status !== 201) {
      const err = await uploadRes.text();
      return NextResponse.json(
        { ok: false, error: `Upload failed: ${err.slice(0, 200)}` },
        { status: 500 },
      );
    }

    const video = (await uploadRes.json()) as {
      id: string;
      snippet?: { title: string };
      status?: { uploadStatus: string };
    };

    return NextResponse.json({
      ok: true,
      videoId: video.id,
      youtubeUrl: `https://youtube.com/watch?v=${video.id}`,
      shortsUrl: `https://youtube.com/shorts/${video.id}`,
      title: video.snippet?.title,
      status: video.status?.uploadStatus,
    });
  } catch (err) {
    console.error("[publish]", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

function getYouTubeAuthUrl(): string {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID || "";
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/publish/callback`;
  const scope =
    "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube";

  if (!clientId) return "";

  return `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline`;
}

// GET: Generate YouTube OAuth URL
export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUrl = getYouTubeAuthUrl();
  return NextResponse.json({
    ok: true,
    authUrl,
    hasClientId: !!process.env.YOUTUBE_OAUTH_CLIENT_ID,
    instructions:
      "Add YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET to .env.local to enable direct YouTube upload",
  });
}
