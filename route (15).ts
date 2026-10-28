import { NextResponse } from "next/server";
import { getAuthedUser, jsonError } from "@/lib/api";
import { getWallet } from "@/lib/wallet";

export async function GET() {
  const { user } = await getAuthedUser();
  if (!user) return jsonError("Please log in.", 401);
  try {
    return NextResponse.json({ wallet: await getWallet(user.id) });
  } catch {
    return jsonError("Could not read your wallet.", 500);
  }
}
