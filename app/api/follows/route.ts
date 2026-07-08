import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profiles/ensureProfile";
import {
  isFollowing,
  resolveFollowTarget,
  toggleFollow,
} from "@/lib/follows/queries";

const followSchema = z.object({
  handle: z.string().min(2),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);

  const body = await request.json();
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  const target = await resolveFollowTarget(supabase, parsed.data.handle);
  if (!target) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const following = await toggleFollow(supabase, user.id, target);
    return NextResponse.json({ following, targetType: target.type });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Follow failed" },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ following: false, targetType: null });
  }

  const target = await resolveFollowTarget(supabase, handle);
  if (!target) {
    return NextResponse.json({ following: false, targetType: null });
  }

  const following = await isFollowing(supabase, user.id, target);
  return NextResponse.json({ following, targetType: target.type });
}
