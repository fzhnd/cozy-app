import { EventEmitter } from "events";

declare global {
  // Use global to ensure single EventEmitter across Next.js API routes and server reloads
  var __cozyRealtimeBus: EventEmitter | undefined;
}

export const realtimeBus: EventEmitter =
  global.__cozyRealtimeBus || (global.__cozyRealtimeBus = new EventEmitter());

// Support high number of concurrent listeners across multiple browser tabs and windows
realtimeBus.setMaxListeners(1000);

export interface RealtimeEventPayload {
  type: string;
  sender?: string;
  senderName?: string;
  receiverName?: string;
  receiverEmail?: string;
  partnerName?: string;
  target?: string;
  targetName?: string;
  activity?: string;
  status?: string;
  action?: string;
  invitation?: any;
  timestamp?: number;
  [key: string]: any;
}

export function broadcastRealtime(payload: RealtimeEventPayload) {
  try {
    const fullPayload: RealtimeEventPayload = {
      ...payload,
      timestamp: Date.now()
    };
    realtimeBus.emit("realtime_event", fullPayload);
  } catch (err) {
    console.error("broadcastRealtime error:", err);
  }
}
