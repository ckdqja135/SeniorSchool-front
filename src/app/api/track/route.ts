import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { path, referrer } = await req.json();
    if (!path) return NextResponse.json({ success: false }, { status: 400 });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/pageview/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
        "user-agent": req.headers.get("user-agent") || "",
      },
      body: JSON.stringify({ path, referrer }),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
