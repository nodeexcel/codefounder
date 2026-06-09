import { NextResponse } from "next/server";
import { google } from "googleapis";

interface BookingRequest {
  callerName: string;
  callerPhone: string;
  startTime: string;
  endTime?: string;
  reason: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BookingRequest;
    const { callerName, callerPhone, startTime, endTime, reason } = body;

    if (!callerName || !callerPhone || !startTime || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: callerName, callerPhone, startTime, reason" },
        { status: 400 }
      );
    }

    const resolvedEndTime = endTime
      ? endTime
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const calendar = google.calendar({ version: "v3", auth });

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
      requestBody: {
        summary: `Appointment - ${callerName}`,
        description: `Caller: ${callerName}\nPhone: ${callerPhone}\nReason: ${reason}`,
        start: {
          dateTime: startTime,
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: resolvedEndTime,
          timeZone: "Asia/Kolkata",
        },
      },
    });

    return NextResponse.json({ success: true, eventId: event.data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create calendar event";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
