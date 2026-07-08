import { SearchClient } from "@/components/search/SearchClient";
import { createClient } from "@/lib/supabase/server";

export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 font-pixel text-xs text-neon-amber tracking-widest">SEARCH</h1>
      <SearchClient currentUserId={user?.id} />
    </div>
  );
}
