/**
 * Daily.co room management utilities.
 *
 * Requires DAILY_API_KEY env variable. Get a free key at https://dashboard.daily.co
 */

import { CircuitBreaker } from './circuit-breaker';

const DAILY_API_URL = "https://api.daily.co/v1";

const dailyBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  requestTimeoutMs: 5000,
  maxConcurrency: 30
});

function getDailyApiKey(): string | null {
  return process.env.DAILY_API_KEY ?? null;
}

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config: Record<string, unknown>;
}

/**
 * Create a new Daily.co room for a live class.
 * Returns the room URL, or null if API key is not configured.
 */
export async function createDailyRoom(options: {
  roomName: string;
  expiresInMinutes?: number;
}): Promise<DailyRoom | null> {
  const apiKey = getDailyApiKey();
  if (!apiKey) return null;

  const { roomName, expiresInMinutes = 120 } = options;

  const exp = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;

  try {
    const response = await dailyBreaker.fire(() => fetch(`${DAILY_API_URL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp,
          enable_screenshare: true,
          enable_chat: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          enable_recording: "local",
        },
      }),
    }));

    if (!response.ok) {
      const error = await response.text();
      console.error("[DAILY_CREATE_ROOM_ERROR]", response.status, error);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("[DAILY_CIRCUIT_BREAKER_ERROR]", error);
    return null;
  }
}

/**
 * Delete a Daily.co room.
 */
export async function deleteDailyRoom(roomName: string): Promise<boolean> {
  const apiKey = getDailyApiKey();
  if (!apiKey) return false;

  try {
    const response = await dailyBreaker.fire(() => fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }));

    return response.ok;
  } catch (error) {
    console.error("[DAILY_CIRCUIT_BREAKER_ERROR]", error);
    return false;
  }
}

/**
 * Check if Daily.co is configured.
 */
export function isDailyConfigured(): boolean {
  return Boolean(getDailyApiKey());
}
