// "use client";

// import { useState, useEffect } from "react";
// import { ViewState, FileData } from "@/lib/types/awn";
// import FileUpload from "./FileUpload";
// import Quiz from "./Quiz";
// import Summary from "./Summary";
// import { Scroll, Library, User, FileText, BookOpen, Brain, LogOut } from "lucide-react";
// import { createClient } from "@/lib/supabase/client";
// import {
//   DropdownMenu,
//   DropdownMenuTrigger,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuLabel,
// } from "@/components/ui/dropdown-menu";
// import type { User as SupabaseUser } from "@supabase/supabase-js";

// export default function AwnApp() {
//   const [view, setView] = useState<ViewState>(ViewState.HOME);
//   const [file, setFile] = useState<FileData | null>(null);
//   const [user, setUser] = useState<SupabaseUser | null>(null);

//   const supabase = createClient();

//   useEffect(() => {
//     const getUser = async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       setUser(user);
//     };
//     getUser();

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null);
//     });

//     return () => subscription.unsubscribe();
//   }, [supabase.auth]);

//   const handleFileSelect = (selectedFile: FileData) => {
//     setFile(selectedFile);
//   };

//   const handleSignOut = async () => {
//     await supabase.auth.signOut();
//     setView(ViewState.HOME);
//   };

//   const renderContent = () => {
//     switch (view) {
//       case ViewState.QUIZ_ACTIVE:
//         if (!file)
//           return <div className="text-center p-10">الرجاء تحميل ملف أولاً</div>;
//         return <Quiz file={file} onExit={() => setView(ViewState.HOME)} />;

//       case ViewState.SUMMARY:
//         return <Summary file={file} onBack={() => setView(ViewState.HOME)} />;

//       case ViewState.HOME:
//       default:
//         return (
//           <div className="max-w-4xl mx-auto animate-fade-in-up">
//             {/* Hero Section */}
//             <div className="text-center mb-12">
//               <h1 className="text-5xl md:text-7xl font-serif font-bold text-beige-900 mb-6">
//                 عَون
//               </h1>
//               <p className="text-xl md:text-2xl text-beige-800 font-medium leading-relaxed max-w-2xl mx-auto">
//                 &quot;وما نيلُ المطالبِ بالتمني... ولكن تُؤخذُ الدُنيا
//                 غِلابا&quot;
//                 <br />
//                 <span className="text-gold-600 text-lg mt-2 block font-normal">
//                   رحلة الاجتهاد تبدأ بخطوة، والاستمرار هو سر الوصول.
//                 </span>
//               </p>
//             </div>

//             {/* Main Action Card */}
//             <div className="bg-white rounded-3xl shadow-xl p-8 border border-beige-200 mb-12 relative overflow-hidden">
//               <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500 opacity-5 rounded-bl-full"></div>

//               <div className="flex flex-col gap-8">
//                 <FileUpload
//                   onFileSelect={handleFileSelect}
//                   onQuizClick={() => setView(ViewState.QUIZ_ACTIVE)}
//                   onSummaryClick={() => setView(ViewState.SUMMARY)}
//                 />

//                 {/* Saved Library Button */}
//                 {!file && (
//                   <div className="flex justify-center border-t border-beige-100 pt-8">
//                     <button
//                       onClick={() => setView(ViewState.SUMMARY)}
//                       className="flex items-center gap-4 bg-beige-50 border-2 border-beige-200 px-8 py-4 rounded-2xl  hover:border-gold-500 hover:shadow-md transition-all group w-full max-w-xl"
//                     >
//                       <div className="p-3 bg-white rounded-xl text-gold-600 shadow-sm group-hover:bg-gold-500  transition-colors">
//                         <Library className="w-8 h-8" />
//                       </div>
//                       <div className="text-right flex-1">
//                         <span className="block font-bold text-xl text-beige-900 mb-1">
//                           المكتبة المحفوظة
//                         </span>
//                         <span className="text-sm text-beige-500">
//                           استعرض ملخصاتك ومذكراتك السابقة
//                         </span>
//                       </div>
//                       <div className="text-beige-300 group-hover:text-gold-500 transition-colors">
//                         <Scroll className="w-6 h-6" />
//                       </div>
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="min-h-screen flex flex-col font-sans bg-beige-50">
//       {/* Navbar */}
//       <header className="py-6 px-8 flex justify-between items-center max-w-7xl mx-auto w-full">
//         <div
//           className="text-2xl font-serif font-bold text-beige-900 tracking-wide cursor-pointer"
//           onClick={() => setView(ViewState.HOME)}
//         >
//           عَون
//         </div>

//         {/* User Profile Dropdown */}
//         {user && (
//           <DropdownMenu>
//             <DropdownMenuTrigger className="flex items-center gap-2 bg-white border border-beige-200 px-4 py-2 rounded-xl hover:border-gold-500 hover:shadow-sm transition-all cursor-pointer">
//               <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center">
//                 <User className="w-4 h-4 text-gold-600" />
//               </div>
//               <span className="text-sm font-medium text-beige-800 hidden sm:block">
//                 {user.email?.split("@")[0] || "المستخدم"}
//               </span>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end" className="w-56">
//               <DropdownMenuLabel className="font-normal">
//                 <div className="flex flex-col gap-1">
//                   <p className="text-sm font-medium">{user.email?.split("@")[0]}</p>
//                   <p className="text-xs text-muted-foreground truncate">{user.email}</p>
//                 </div>
//               </DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem className="cursor-pointer gap-3">
//                 <FileText className="w-4 h-4" />
//                 <span>ملفاتي</span>
//               </DropdownMenuItem>
//               <DropdownMenuItem 
//                 className="cursor-pointer gap-3"
//                 onClick={() => setView(ViewState.SUMMARY)}
//               >
//                 <BookOpen className="w-4 h-4" />
//                 <span>ملخصاتي</span>
//               </DropdownMenuItem>
//               <DropdownMenuItem className="cursor-pointer gap-3">
//                 <Brain className="w-4 h-4" />
//                 <span>كويزاتي</span>
//               </DropdownMenuItem>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem 
//                 className="cursor-pointer gap-3 text-red-600 focus:text-red-600"
//                 onClick={handleSignOut}
//               >
//                 <LogOut className="w-4 h-4" />
//                 <span>تسجيل الخروج</span>
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         )}
//       </header>

//       {/* Main Content */}
//       <main className="grow container mx-auto px-4 py-8">
//         {renderContent()}
//       </main>

//       {/* Footer */}
//       <footer className="bg-white border-t border-beige-200 py-12 mt-12">
//         <div className="container mx-auto px-4 text-center">
//           <div className="mb-8">
//             <h2 className="font-serif text-3xl text-beige-900 mb-2">
//               سبحان الله وبحمده، سبحان الله العظيم
//             </h2>
//             <div className="w-24 h-1 bg-gold-500 mx-auto rounded-full mt-4"></div>
//           </div>

//           <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-beige-800">
//             <div className="text-center">
//               <p className="font-bold text-lg">بإشراف: حنين رجاالله اللهيبي</p>
//               <p className="text-sm text-beige-500 mt-1">إدارة الأعمال</p>
//             </div>

//             <div className="hidden md:block w-px h-10 bg-beige-200"></div>

//             <div className="text-center">
//               <p className="font-bold">للتواصل</p>
//               <a
//                 href="https://t.me/HNHv1"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-gold-600 hover:text-gold-700 font-mono mt-1 block dir-ltr"
//               >
//                 @HNHv1
//               </a>
//             </div>
//           </div>

//           <div className="mt-8 text-xs text-beige-400">
//             © {new Date().getFullYear()} منصة عَون التعليمية
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
