import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Summary from "@/components/awn/Summary";
import { getUserSummaries } from "@/app/actions/db/summaries";
import { BookOpen } from "lucide-react";

// Loading fallback component
function SummaryLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-beige-600 text-lg">جاري تحميل الملخصات...</p>
      </div>
    </div>
  );
}

// Wrapper function to get just the data array from the action
async function fetchSummaries() {
  const { data } = await getUserSummaries();
  return data;
}

export default async function SummaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Create the promise but don't await it - pass to client for streaming
  const summariesPromise = fetchSummaries();

  return (
    <Suspense fallback={<SummaryLoading />}>
      <Summary summariesPromise={summariesPromise} />
    </Suspense>
  );
}
