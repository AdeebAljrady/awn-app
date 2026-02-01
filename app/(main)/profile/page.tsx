import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { User } from "lucide-react";
import { getProfileWithCredits } from "@/app/actions/profile/update-profile";

export default async function ProfilePage() {
  const { profile, user } = await getProfileWithCredits();

  if (!user) {
    redirect("/auth/sign-in");
  }
  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">الملف الشخصي</h1>
      </div>

      <div >
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {profile?.full_name || "مستخدم جديد"}
                </h2>
                <p className="text-sm text-muted-foreground" dir="ltr">
                  {profile?.email || user.email}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">تعديل المعلومات</h3>
              <ProfileForm
                currentName={profile?.full_name || ""}
                email={profile?.email || user.email || ""}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

