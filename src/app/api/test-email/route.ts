import { NextResponse } from "next/server";
import { DEFAULT_FROM_EMAIL, sendTestEmail } from "@/lib/resend";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to") || "mdsamimrrza@gmail.com";

    const { data, error } = await sendTestEmail(to);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: "Make sure you replaced 're_xxxxxxxxx' with your valid Resend API key in .env. When sending from onboarding@resend.dev, the recipient must be the account owner email on free tier.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${to}!`,
      from: DEFAULT_FROM_EMAIL,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to send email",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let to = "mdsamimrrza@gmail.com";
    try {
      const body = await request.json();
      if (body?.to) to = body.to;
    } catch {
      // Use default if body not provided
    }

    const { data, error } = await sendTestEmail(to);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      from: DEFAULT_FROM_EMAIL,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to send email",
      },
      { status: 500 }
    );
  }
}
