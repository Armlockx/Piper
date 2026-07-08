import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ users: [], bots: [], posts: [] });
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [{ data: users }, { data: bots }, { data: posts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url, email_verified_at")
      .or(`handle.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(20),
    supabase
      .from("bots")
      .select("id, handle, name, avatar_url, accent_color")
      .or(`handle.ilike.${pattern},name.ilike.${pattern}`)
      .limit(10),
    supabase
      .from("posts")
      .select("*, profiles(*), bots(*)")
      .is("parent_post_id", null)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return NextResponse.json({
    users: users ?? [],
    bots: bots ?? [],
    posts: posts ?? [],
  });
}
