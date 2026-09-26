import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  console.log("Debug: Client ID loaded:", clientId ? `${clientId.substring(0, 3)}***` : "MISSING");
  console.log("Debug: Client Secret loaded:", clientSecret ? `${clientSecret.substring(0, 3)}***` : "MISSING");

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Naver API credentials are not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": clientId,
          "X-NCP-APIGW-API-KEY": clientSecret,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Naver Geocode API Error:", errorData);
      // Do not return 401 to client to prevent auto-logout
      return NextResponse.json(
        { error: "Failed to fetch address data", details: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
