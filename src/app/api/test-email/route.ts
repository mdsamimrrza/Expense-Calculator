import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to") || "mdsamimrrza@gmail.com";

    const user = process.env.EMAIL_SERVER_USER || "sahakarisip.app@gmail.com";
    const pass = process.env.EMAIL_SERVER_PASSWORD;

    if (!pass || pass.includes("REPLACE_WITH")) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_SERVER_PASSWORD is not configured in .env",
          hint: "Generate a 16-character Google App Password for sahakarisip.app@gmail.com and set it in .env as EMAIL_SERVER_PASSWORD",
        },
        { status: 400 }
      );
    }

    const transport = createTransport({
      host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_SERVER_PORT) || 587,
      auth: { user, pass },
    });

    const fromAddress = process.env.EMAIL_FROM || `"SahakariSIP" <${user}>`;

    const info = await transport.sendMail({
      from: fromAddress,
      to,
      subject: "Hello from SahakariSIP! 🎉",
      html: "<p>Congrats! Your <strong>sahakarisip.app@gmail.com</strong> email delivery is working perfectly!</p>",
      text: "Congrats! Your sahakarisip.app@gmail.com email delivery is working perfectly!",
    });

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${to}!`,
      from: fromAddress,
      messageId: info.messageId,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to send email",
        hint: "Make sure 2-Step Verification is enabled on sahakarisip.app@gmail.com and you generated a 16-character App Password.",
      },
      { status: 500 }
    );
  }
}
