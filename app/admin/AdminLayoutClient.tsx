"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Coins,
    ArrowRight,
    Menu,
    X,
} from "lucide-react";

const navLinks = [
    { href: "/admin/dashboard", label: "الإحصائيات", icon: LayoutDashboard },
    { href: "/admin/users", label: "المستخدمين", icon: Users },
    { href: "/admin/credits", label: "الرصيد والكوبونات", icon: Coins },
];

export default function AdminLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-beige-50" dir="rtl">
            {/* Mobile Header */}
            <header className="lg:hidden bg-beige-900  p-4 flex items-center justify-between ">
                <h1 className="text-lg font-bold">لوحة الأدمن</h1>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 hover:bg-beige-800 rounded-lg transition-colors"
                >
                    {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            <div className="flex">
                {/* Sidebar - Hidden on mobile, shown on lg+ */}
                <aside
                    className={`
            fixed lg:static inset-0 z-40 bg-beige-900 
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0 bg-white" : "translate-x-full lg:translate-x-0"}
            w-64 lg:min-h-screen
            pt-4 lg:pt-6 px-4 lg:px-6
          `}
                >

                    <nav className="space-y-2">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? "bg-gold-600 "
                                        : "hover:bg-beige-800"
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="absolute bottom-6 left-6 right-6">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-beige-400  transition-colors"
                        >
                            <ArrowRight className="w-4 h-4" />
                            <span>العودة للموقع</span>
                        </Link>
                    </div>
                </aside>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-8 min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}
