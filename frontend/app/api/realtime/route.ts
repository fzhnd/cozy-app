import { NextRequest } from "next/server";
import { realtimeBus, RealtimeEventPayload } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection acknowledgement
      try {
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: Date.now() })}\n\n`)
        );
      } catch (e) {}

      // 2. Real-time event listener
      const onEvent = (payload: RealtimeEventPayload) => {
        try {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch (e) {
          // Connection likely closed by client
        }
      };

      realtimeBus.on("realtime_event", onEvent);

      // 3. Heartbeat every 15s to keep connection alive through proxies & prevent idle timeouts
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 15000);

      cleanup = () => {
        realtimeBus.off("realtime_event", onEvent);
        clearInterval(heartbeat);
      };
    },
    cancel() {
      if (cleanup) cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    realtimeBus.emit("realtime_event", payload);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

