import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInitialCredits } from "@/app/actions/profile/update-profile";
import { WelcomeForm } from "./welcome-form";

export default async function WelcomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/auth/sign-in");
  }

  // Check if user already has a name set
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // If name is already set, redirect to home
  if (profile?.full_name) {
    redirect("/");
  }

  // Get initial credits from settings
  const initialCredits = await getInitialCredits();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          {/* Celebration Icon */}
          <div className="text-6xl mb-4">🎉</div>

          <h1 className="text-3xl font-bold mb-2">مرحباً بك!</h1>
          <p className="text-muted-foreground text-lg">
            لقد حصلت على{" "}
            <span className="text-primary font-bold">{initialCredits} نقطة</span>{" "}
            مجانية لاستخدام خدماتنا
          </p>
        </div>

        <WelcomeForm />

        <p className="text-center text-sm text-muted-foreground mt-6">
          يمكنك استخدام النقاط لإنشاء ملخصات واختبارات
        </p>
      </div>
    </div>
  );
}
