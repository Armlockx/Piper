import { NextResponse } from "next/server";
import { z } from "zod";
import { processBotReplyJob } from "@/lib/bots/processReply";

const schema = z.object({
  jobId: z.string().uuid(),
});

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-piper-cron-key");
  const isInternal = apiKey === process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16);

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isInternal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await processBotReplyJob(parsed.data.jobId);
  return NextResponse.json({ ok: true });
}
