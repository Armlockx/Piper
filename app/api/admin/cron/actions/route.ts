import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/isAdmin";
import {
  createSupabaseCronReportStore,
  cronReportTimeZone,
  listCronDayActions,
  parseActionsQuery,
} from "@/lib/cron/adminReport";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(request.url).searchParams;
  const parsed = parseActionsQuery({
    date: q.get("date"),
    status: q.get("status"),
    action_type: q.get("action_type"),
    cursor: q.get("cursor"),
    limit: q.get("limit"),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await listCronDayActions({
      date: parsed.date,
      timeZone: cronReportTimeZone(),
      store: createSupabaseCronReportStore(),
      status: parsed.status,
      action_type: parsed.action_type,
      cursor: parsed.cursor,
      limit: parsed.limit,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load actions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
