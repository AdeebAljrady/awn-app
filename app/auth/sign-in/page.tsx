import { SigninForm } from "@/components/signin-form";
import { Suspense } from "react";
import { SigninToastHandler } from "@/components/signin-toast-handler";

function ToastHandlerWrapper() {
  return (
    <Suspense fallback={null}>
      <SigninToastHandler />
    </Suspense>
  );
}

export default function Page() {
  return (
    <>
      <ToastHandlerWrapper />
      <div className="flex min-h-svh  w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <SigninForm />
        </div>
      </div>
    </>
  );
}
