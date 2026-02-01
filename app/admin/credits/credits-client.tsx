"use client";

import { useState } from "react";
import {
    getCreditSettings,
    updateCreditSetting,
    getAllCoupons,
    createCouponAdmin,
    toggleCouponStatus,
    createBulkCouponsAdmin
} from "@/app/actions/admin/credits";
import {
    Coins,
    Settings,
    Gift,
    Plus,
    Check,
    X,
    Loader2,
    Copy,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface CreditSetting {
    action_key: string;
    credit_cost: number;
    description: string;
}

interface Coupon {
    id: string;
    code: string;
    credit_amount: number;
    max_uses: number;
    current_uses: number;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}

interface AdminCreditsClientProps {
    initialSettings: CreditSetting[];
    initialCoupons: Coupon[];
}

export function AdminCreditsClient({ initialSettings, initialCoupons }: AdminCreditsClientProps) {
    const [settings, setSettings] = useState<CreditSetting[]>(initialSettings);
    const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
    const [loading, setLoading] = useState(false);

    const [editingSetting, setEditingSetting] = useState<string | null>(null);
    const [newCost, setNewCost] = useState("");

    // Single coupon form
    const [showNewCoupon, setShowNewCoupon] = useState(false);
    const [newCouponCode, setNewCouponCode] = useState("");
    const [newCouponAmount, setNewCouponAmount] = useState("");
    const [newCouponMaxUses, setNewCouponMaxUses] = useState("1");
    const [creatingCoupon, setCreatingCoupon] = useState(false);

    // Bulk coupon form
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [bulkCount, setBulkCount] = useState("10");
    const [bulkAmount, setBulkAmount] = useState("50");
    const [bulkMaxUses, setBulkMaxUses] = useState("1");
    const [creatingBulk, setCreatingBulk] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
    const [showCodesDialog, setShowCodesDialog] = useState(false);

    const refreshData = async () => {
        setLoading(true);
        const [settingsResult, couponsResult] = await Promise.all([
            getCreditSettings(),
            getAllCoupons(),
        ]);
        if (settingsResult.data) setSettings(settingsResult.data);
        if (couponsResult.data) setCoupons(couponsResult.data);
        setLoading(false);
    };

    const handleUpdateSetting = async (actionKey: string) => {
        const cost = parseInt(newCost);
        if (isNaN(cost) || cost < 0) {
            toast.error("أدخل رقم صحيح");
            return;
        }
        const result = await updateCreditSetting(actionKey, cost);
        if (result.success) {
            toast.success("تم تحديث الإعداد");
            setEditingSetting(null);
            refreshData();
        } else {
            toast.error(result.error || "حدث خطأ");
        }
    };

    const handleCreateCoupon = async () => {
        if (!newCouponCode || !newCouponAmount) {
            toast.error("أدخل الكود والقيمة");
            return;
        }
        setCreatingCoupon(true);
        const result = await createCouponAdmin(
            newCouponCode,
            parseInt(newCouponAmount),
            parseInt(newCouponMaxUses) || 1
        );
        if (result.success) {
            toast.success("تم إنشاء الكوبون");
            setShowNewCoupon(false);
            setNewCouponCode("");
            setNewCouponAmount("");
            setNewCouponMaxUses("1");
            refreshData();
        } else {
            toast.error(result.error || "حدث خطأ");
        }
        setCreatingCoupon(false);
    };

    const handleCreateBulkCoupons = async () => {
        const count = parseInt(bulkCount);
        const amount = parseInt(bulkAmount);
        const maxUses = parseInt(bulkMaxUses) || 1;

        if (isNaN(count) || count < 1 || count > 1000) {
            toast.error("العدد يجب أن يكون بين 1 و 1000");
            return;
        }
        if (isNaN(amount) || amount < 1) {
            toast.error("أدخل قيمة الرصيد");
            return;
        }

        setCreatingBulk(true);
        const result = await createBulkCouponsAdmin(count, amount, maxUses);

        if (result.success) {
            toast.success(`تم إنشاء ${result.codes.length} كوبون بنجاح`);
            setGeneratedCodes(result.codes);
            setShowCodesDialog(true);
            setShowBulkForm(false);
            refreshData();
        } else {
            toast.error(result.error || "حدث خطأ");
        }
        setCreatingBulk(false);
    };

    const copyAllCodes = () => {
        const text = generatedCodes.join("\n");
        navigator.clipboard.writeText(text);
        toast.success("تم نسخ جميع الأكواد");
    };

    const handleToggleCoupon = async (couponId: string, isActive: boolean) => {
        const result = await toggleCouponStatus(couponId, !isActive);
        if (result.success) {
            refreshData();
        } else {
            toast.error(result.error || "حدث خطأ");
        }
    };

    const settingLabels: Record<string, string> = {
        summary: "تكلفة التلخيص",
        quiz: "تكلفة الاختبار",
        initial_credits: "الرصيد الأولي للمستخدمين الجدد",
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-beige-900 flex items-center gap-3 mb-6 lg:mb-8">
                <Coins className="w-6 h-6 lg:w-8 lg:h-8" />
                إدارة الرصيد والكوبونات
            </h1>

            {/* Credit Settings */}
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-beige-200 mb-6 lg:mb-8">
                <h2 className="text-lg lg:text-xl font-bold text-beige-900 flex items-center gap-2 mb-4 lg:mb-6">
                    <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
                    إعدادات الرصيد
                </h2>
                <div className="space-y-3 lg:space-y-4">
                    {settings.map((setting) => (
                        <div key={setting.action_key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-beige-50 rounded-xl">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-beige-900 text-sm lg:text-base">{settingLabels[setting.action_key] || setting.action_key}</p>
                                <p className="text-xs lg:text-sm text-beige-500 truncate">{setting.description}</p>
                            </div>
                            {editingSetting === setting.action_key ? (
                                <div className="flex items-center gap-2">
                                    <Input type="number" value={newCost} onChange={(e) => setNewCost(e.target.value)} className="w-20 text-center" />
                                    <Button size="sm" onClick={() => handleUpdateSetting(setting.action_key)}><Check className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}><X className="w-4 h-4" /></Button>
                                </div>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => { setEditingSetting(setting.action_key); setNewCost(setting.credit_cost.toString()); }}>
                                    <Coins className="w-4 h-4 ml-2" />{setting.credit_cost}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Coupons */}
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-beige-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
                    <h2 className="text-lg lg:text-xl font-bold text-beige-900 flex items-center gap-2">
                        <Gift className="w-4 h-4 lg:w-5 lg:h-5" />
                        الكوبونات
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setShowBulkForm(true); setShowNewCoupon(false); }}>
                            <Sparkles className="w-4 h-4 ml-1" />
                            <span className="hidden sm:inline">إنشاء متعدد</span>
                            <span className="sm:hidden">متعدد</span>
                        </Button>
                        <Button size="sm" onClick={() => { setShowNewCoupon(true); setShowBulkForm(false); }}>
                            <Plus className="w-4 h-4 ml-1" />
                            <span className="hidden sm:inline">كوبون واحد</span>
                            <span className="sm:hidden">واحد</span>
                        </Button>
                    </div>
                </div>

                {/* Single Coupon Form */}
                {showNewCoupon && (
                    <div className="p-3 lg:p-4 bg-beige-50 rounded-xl mb-4 lg:mb-6">
                        <p className="text-xs lg:text-sm font-medium text-beige-600 mb-3">إنشاء كوبون بكود مخصص</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="col-span-2 lg:col-span-1">
                                <label className="block text-xs font-medium text-beige-500 mb-1">الكود</label>
                                <Input placeholder="WELCOME50" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-beige-500 mb-1">القيمة</label>
                                <Input type="number" placeholder="50" value={newCouponAmount} onChange={(e) => setNewCouponAmount(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-beige-500 mb-1">الحد</label>
                                <Input type="number" placeholder="1" value={newCouponMaxUses} onChange={(e) => setNewCouponMaxUses(e.target.value)} />
                            </div>
                            <div className="col-span-2 lg:col-span-4 flex gap-2">
                                <Button onClick={handleCreateCoupon} disabled={creatingCoupon} className="flex-1 lg:flex-none">
                                    {creatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء"}
                                </Button>
                                <Button variant="ghost" onClick={() => setShowNewCoupon(false)}>إلغاء</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Coupon Form */}
                {showBulkForm && (
                    <div className="p-3 lg:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl mb-4 lg:mb-6 border border-purple-200">
                        <p className="text-xs lg:text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            إنشاء كوبونات بأكواد عشوائية
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-purple-600 mb-1">العدد</label>
                                <Input type="number" placeholder="10" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-purple-600 mb-1">القيمة</label>
                                <Input type="number" placeholder="50" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-purple-600 mb-1">الحد</label>
                                <Input type="number" placeholder="1" value={bulkMaxUses} onChange={(e) => setBulkMaxUses(e.target.value)} />
                            </div>
                            <div className="col-span-2 lg:col-span-1 flex items-end gap-2">
                                <Button onClick={handleCreateBulkCoupons} disabled={creatingBulk} className="bg-purple-600 hover:bg-purple-700 flex-1 lg:flex-none">
                                    {creatingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء"}
                                </Button>
                                <Button variant="ghost" onClick={() => setShowBulkForm(false)}>إلغاء</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Generated Codes Dialog */}
                {showCodesDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCodesDialog(false)}>
                        <div className="bg-white rounded-2xl p-4 lg:p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-beige-900">تم إنشاء {generatedCodes.length} كوبون</h3>
                                <Button onClick={copyAllCodes} variant="outline" size="sm" className="gap-2">
                                    <Copy className="w-4 h-4" />
                                    نسخ الكل
                                </Button>
                            </div>
                            <div className="bg-beige-50 rounded-xl p-4 max-h-64 lg:max-h-96 overflow-y-auto font-mono text-xs lg:text-sm">
                                {generatedCodes.map((code, i) => (
                                    <div key={i} className="py-1 border-b border-beige-100 last:border-0">
                                        {code}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={() => setShowCodesDialog(false)}>إغلاق</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Cards View */}
                <div className="lg:hidden space-y-3">
                    {coupons.map((coupon) => (
                        <div key={coupon.id} className="p-3 bg-beige-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono font-bold text-beige-900 text-sm">{coupon.code}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${coupon.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {coupon.is_active ? "نشط" : "معطل"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-beige-600">
                                    <span className="text-gold-600 font-bold">{coupon.credit_amount} رصيد</span>
                                    <span>{coupon.current_uses}/{coupon.max_uses}</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}>
                                    {coupon.is_active ? "تعطيل" : "تفعيل"}
                                </Button>
                            </div>
                        </div>
                    ))}
                    {coupons.length === 0 && (
                        <p className="p-8 text-center text-beige-400">لا توجد كوبونات بعد</p>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block">
                    <table className="w-full">
                        <thead className="bg-beige-50 border-b border-beige-200">
                            <tr>
                                <th className="text-right p-3 font-semibold text-beige-600">الكود</th>
                                <th className="text-center p-3 font-semibold text-beige-600">القيمة</th>
                                <th className="text-center p-3 font-semibold text-beige-600">الاستخدام</th>
                                <th className="text-center p-3 font-semibold text-beige-600">الحالة</th>
                                <th className="text-center p-3 font-semibold text-beige-600">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map((coupon) => (
                                <tr key={coupon.id} className="border-b border-beige-100">
                                    <td className="p-3 font-mono font-bold text-beige-900">{coupon.code}</td>
                                    <td className="p-3 text-center text-gold-600 font-bold">{coupon.credit_amount}</td>
                                    <td className="p-3 text-center">{coupon.current_uses} / {coupon.max_uses}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${coupon.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                            {coupon.is_active ? "نشط" : "معطل"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <Button variant="ghost" size="sm" onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}>
                                            {coupon.is_active ? "تعطيل" : "تفعيل"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {coupons.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-beige-400">لا توجد كوبونات بعد</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
