import { NextRequest, NextResponse } from "next/server";
import { sendEmailAlert } from "@/lib/alerts";

export async function POST(request: NextRequest) {
  try {
    const { email, fullName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Send email notification to admin
    const adminEmail =
      process.env.ADMIN_EMAILS?.split(",")[0] || "rick@highlyeducated.com";

    await sendEmailAlert(
      "New User Access Request",
      `A new user has requested access to Highly Educated:

Name: ${fullName || "Not provided"}
Email: ${email}

Please review and approve/reject at: https://data.highlyeducated.com/admin/users

This is an automated notification.`,
      `access-request-${email}` // Dedup key
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to notify admin:", error);
    // Don't fail the signup if notification fails
    return NextResponse.json({ success: true });
  }
}
