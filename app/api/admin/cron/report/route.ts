import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/isAdmin";
import {
  createSupabaseCronReportStore,
  cronReportTimeZone,
  listCronReport,
  parseReportQuery,
} from "@/lib/cron/adminReport";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(request.url).searchParams;
  const parsed = parseReportQuery({ from: q.get("from"), to: q.get("to") });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await listCronReport({
      from: parsed.from,
      to: parsed.to,
      timeZone: cronReportTimeZone(),
      store: createSupabaseCronReportStore(),
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
