import { NextResponse } from "next/server";

export function apiError(error: unknown, fallback: string, status = 400) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallback,
    },
    { status },
  );
}

export function apiCreated<T>(payload: T) {
  return NextResponse.json(payload, { status: 201 });
}
