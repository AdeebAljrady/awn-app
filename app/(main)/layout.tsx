"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, FileText, BookOpen, Brain, LogOut, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import CreditDisplay from "@/components/awn/CreditDisplay";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;

      // 1. Update state only if component is still mounted
      if (isMounted) setUser(currentUser);

      // 2. Only check profile if we have a user and it's a "SignIn" or "Initial" event
      if (currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", currentUser.id)
          .single();

        if (!profile && isMounted) {
          window.location.href = "/welcome";
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/sign-in";
  };

  const navLinks = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/files", label: "ملفاتي", icon: FileText },
    { href: "/summary", label: "ملخصاتي", icon: BookOpen },
    { href: "/quiz", label: "كويزاتي", icon: Brain },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-beige-50">
      {/* Navbar */}
      <header className="bg-white border-b border-beige-200 sticky top-0 z-50">
        <div className="py-4 px-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <Link
            href="/"
            className="text-2xl font-serif font-bold text-beige-900 tracking-wide"
          >
            عَون
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isActive
                    ? "bg-gold-100 text-gold-700 font-bold"
                    : "text-beige-600 hover:text-beige-900 hover:bg-beige-100"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Credits + User Profile */}
          <div className="flex items-center gap-4">
            {/* Credit Display */}
            {<CreditDisplay />}

            {/* User Profile Dropdown */}
            {(
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 bg-beige-50 border border-beige-200 px-4 py-2 rounded-xl hover:border-gold-500 hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gold-600" />
                  </div>

                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">
                          {user?.email?.split("@")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />

                  {/* Mobile Navigation */}
                  <div className="md:hidden">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <DropdownMenuItem key={link.href} className="cursor-pointer gap-3">
                          <Link href={link.href} className="flex items-center gap-3 w-full">
                            <Icon className="w-4 h-4" />
                            <span>{link.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>

                  {/* Profile Link */}
                  <DropdownMenuItem className="cursor-pointer gap-3">
                    <Link href="/profile" className="flex items-center gap-3 w-full">
                      <User className="w-4 h-4" />
                      <span>الملف الشخصي</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer gap-3 text-red-600 focus:text-red-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="grow container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-beige-200 py-12 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8">
            <h2 className="font-serif text-xl md:text-3xl text-beige-900 mb-2">
              سبحان الله وبحمده، سبحان الله العظيم
            </h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto rounded-full mt-4"></div>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-beige-800">


            <div className="text-center">
              <p className="font-bold">للدعم الفني</p>
              <a
                href="https://t.me/HNHv1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-600 hover:text-gold-700 font-mono mt-1 block dir-ltr"
              >
                @HNHv1
              </a>
            </div>
          </div>

          <div className="mt-8 text-xs text-beige-400">
            © {new Date().getFullYear()} منصة عَون التعليمية
          </div>
        </div>
      </footer>
    </div>
  );
}
