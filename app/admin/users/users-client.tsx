"use client";

import { useState, useEffect, useRef } from "react";
import { getAllUsers, setUserCredits, giftCredits } from "@/app/actions/admin/users";
import { useDebounce } from "@/hooks/use-debounce";
import {
    Users,
    Search,
    Coins,
    FileText,
    Brain,
    Gift,
    Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserWithStats {
    full_name: string | null;
    id: string;
    email: string;
    credits_balance: number;
    summaries_count: number;
    quizzes_count: number;
}

interface AdminUsersClientProps {
    initialUsers: UserWithStats[];
    initialTotal: number;
}

export function AdminUsersClient({ initialUsers, initialTotal }: AdminUsersClientProps) {
    const [users, setUsers] = useState<UserWithStats[]>(initialUsers);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(initialTotal);
    const [editingCredits, setEditingCredits] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<"set" | "gift">("gift");
    const [newCredits, setNewCredits] = useState("");
    const initialSearchRef = useRef(search);

    // Confirmation dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingData, setPendingData] = useState<{
        userId: string;
        oldBalance: number;
        newBalance: number;
        amount: number;
    } | null>(null);

    const debouncedSearch = useDebounce(search, 500);

    // Load users when debounced search changes
    useEffect(() => {
        // Skip initial load as it's handled by server component
        // But we want it to trigger on subsequent search changes
        if (debouncedSearch !== initialSearchRef.current) {
            loadUsers(1, debouncedSearch);
        }
    }, [debouncedSearch]);

    const loadUsers = async (newPage: number = page, newSearch: string = search) => {
        setLoading(true);
        const result = await getAllUsers(newPage, 20, newSearch);
        if (result.data) {
            setUsers(result.data.users);
            setTotal(result.data.total);
        }
        setLoading(false);
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
        // loadUsers is now triggered by the useEffect on debouncedSearch
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        loadUsers(newPage, search);
    };

    const handleSetCredits = async (userId: string) => {
        const amount = parseInt(newCredits);
        if (isNaN(amount) || amount < 0) {
            toast.error("أدخل رقم صحيح (0 أو أكثر)");
            return;
        }

        const user = users.find(u => u.id === userId);
        if (!user) return;

        const oldBalance = user.credits_balance;
        const newBalance = editMode === "gift" ? oldBalance + amount : amount;

        setPendingData({
            userId,
            oldBalance,
            newBalance,
            amount
        });
        setConfirmOpen(true);
    };

    const executeSetCredits = async () => {
        if (!pendingData) return;
        const { userId, amount } = pendingData;

        setLoading(true);
        const result = editMode === "gift"
            ? await giftCredits(userId, amount)
            : await setUserCredits(userId, amount);

        if (result.success) {
            toast.success(editMode === "gift" ? "تم إضافة الهدية" : "تم تعديل الرصيد");
            setEditingCredits(null);
            setConfirmOpen(false);
            setPendingData(null);
            loadUsers();
        } else {
            toast.error(result.error || "حدث خطأ");
        }
        setLoading(false);
    };

    return (
        <div>
            {/* Header - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-beige-900 flex items-center gap-3">
                    <Users className="w-6 h-6 lg:w-8 lg:h-8" />
                    إدارة المستخدمين
                </h1>

                <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-beige-400" />
                    <Input
                        placeholder="بحث..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pr-10 w-full sm:w-64"
                    />
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {/* Mobile Cards View */}
                    <div className="lg:hidden space-y-3">
                        {users.map((user) => (
                            <div key={user.id} className="bg-white rounded-xl p-4 border border-beige-200">
                                <div className="mb-3">
                                    <p className="font-medium text-beige-900 text-sm truncate">{user.email || "—"}</p>
                                    <p className="text-xs text-beige-400">{user.full_name || "—"}</p>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-xs">
                                            <FileText className="w-3 h-3 text-purple-500" />
                                            <span>{user.summaries_count}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                            <Brain className="w-3 h-3 text-green-500" />
                                            <span>{user.quizzes_count}</span>
                                        </div>
                                    </div>

                                    {editingCredits === user.id ? (
                                        <div className="flex flex-col gap-2 w-full mt-2">
                                            <div className="flex items-center gap-1 bg-beige-50 p-1 rounded-lg">
                                                <button
                                                    onClick={() => setEditMode("gift")}
                                                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs transition-colors ${editMode === "gift" ? "bg-white shadow-sm text-gold-600 font-bold" : "text-beige-400"}`}
                                                >
                                                    <Gift className="w-3 h-3" />
                                                    هدية
                                                </button>
                                                <button
                                                    onClick={() => setEditMode("set")}
                                                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs transition-colors ${editMode === "set" ? "bg-white shadow-sm text-beige-900 font-bold" : "text-beige-400"}`}
                                                >
                                                    <Settings className="w-3 h-3" />
                                                    تعديل
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={newCredits}
                                                    onChange={(e) => setNewCredits(e.target.value)}
                                                    placeholder={editMode === "gift" ? "الرصيد المضاف" : "الرصيد الجديد"}
                                                    className="w-full h-8 text-center text-sm"
                                                />
                                                <Button size="sm" className="h-8 px-4" onClick={() => handleSetCredits(user.id)}>حفظ</Button>
                                                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingCredits(null)}>✕</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            className="flex items-center gap-1 bg-gold-50 text-gold-600 px-3 py-1 rounded-lg text-sm font-bold"
                                            onClick={() => {
                                                setEditingCredits(user.id);
                                                setNewCredits(user.credits_balance.toString());
                                            }}
                                        >
                                            <Coins className="w-3 h-3" />
                                            {user.credits_balance}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white rounded-2xl border border-beige-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-beige-50 border-b border-beige-200">
                                <tr>
                                    <th className="text-right p-4 font-semibold text-beige-600">المستخدم</th>
                                    <th className="text-center p-4 font-semibold text-beige-600">
                                        <div className="flex items-center justify-center gap-1">
                                            <Coins className="w-4 h-4" />
                                            الرصيد
                                        </div>
                                    </th>
                                    <th className="text-center p-4 font-semibold text-beige-600">
                                        <div className="flex items-center justify-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            ملخصات
                                        </div>
                                    </th>
                                    <th className="text-center p-4 font-semibold text-beige-600">
                                        <div className="flex items-center justify-center gap-1">
                                            <Brain className="w-4 h-4" />
                                            اختبارات
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-beige-100 hover:bg-beige-50">
                                        <td className="p-4">
                                            <p className="font-medium text-beige-900">{user.email || "—"}</p>
                                            <p className="text-xs text-beige-400">{user.full_name || "—"}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            {editingCredits === user.id ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-center gap-1 bg-beige-50 p-1 rounded-lg w-40">
                                                        <button
                                                            onClick={() => setEditMode("gift")}
                                                            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs transition-colors ${editMode === "gift" ? "bg-white shadow-sm text-gold-600 font-bold" : "text-beige-400"}`}
                                                        >
                                                            <Gift className="w-3 h-3" />
                                                            هدية
                                                        </button>
                                                        <button
                                                            onClick={() => setEditMode("set")}
                                                            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs transition-colors ${editMode === "set" ? "bg-white shadow-sm text-beige-900 font-bold" : "text-beige-400"}`}
                                                        >
                                                            <Settings className="w-3 h-3" />
                                                            تعديل
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Input
                                                            type="number"
                                                            value={newCredits}
                                                            onChange={(e) => setNewCredits(e.target.value)}
                                                            placeholder={editMode === "gift" ? "المبلغ" : "الرصيد"}
                                                            className="w-24 text-center"
                                                        />
                                                        <Button size="sm" onClick={() => handleSetCredits(user.id)}>
                                                            حفظ
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingCredits(null)}>
                                                            إلغاء
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span
                                                    className="font-bold text-gold-600 cursor-pointer hover:underline flex items-center justify-center gap-1"
                                                    onClick={() => {
                                                        setEditingCredits(user.id);
                                                        setEditMode("gift");
                                                        setNewCredits("");
                                                    }}
                                                >
                                                    <Coins className="w-3 h-3" />
                                                    {user.credits_balance}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center text-beige-600">
                                            {user.summaries_count}
                                        </td>
                                        <td className="p-4 text-center text-beige-600">
                                            {user.quizzes_count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                        <p className="text-beige-500 text-sm">
                            عرض {users.length} من {total} مستخدم
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(Math.max(1, page - 1))}
                                disabled={page === 1}
                            >
                                السابق
                            </Button>
                            <span className="px-3 text-sm">{page}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(page + 1)}
                                disabled={users.length < 20}
                            >
                                التالي
                            </Button>
                        </div>
                    </div>
                </>
            )}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد العملية</AlertDialogTitle>
                        <AlertDialogDescription className="text-right">
                            هذا الإجراء سيجعل رصيد المستخدم{" "}
                            <span className="font-bold text-gold-600 text-lg mx-1">{pendingData?.newBalance}</span>
                            {" "}من{" "}
                            <span className="font-bold text-beige-400 mx-1">{pendingData?.oldBalance}</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-row gap-2 sm:justify-end">
                        <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={executeSetCredits} disabled={loading}>
                            {loading ? "جاري الحفظ..." : "تأكيد الحفظ"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
