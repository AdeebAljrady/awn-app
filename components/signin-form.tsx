"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/app/actions/auth/sign-in";
import { signInWithGoogle } from "@/app/actions/auth/sign-in-google";
import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

export function SigninForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction, pending] = useActionState(signIn, null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} dir="rtl" {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <form action={formAction} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">تسجيل الدخول إلى حسابك</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  أدخل بريدك الإلكتروني أدناه لتسجيل الدخول
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">كلمة المرور</FieldLabel>
                <Input id="password" name="password" type="password" required />
              </Field>
              {state?.error && (
                <FieldDescription className="text-destructive text-right">
                  {state.error}
                </FieldDescription>
              )}
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                  ) : (
                    "تسجيل الدخول"
                  )}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                أو المتابعة مع
              </FieldSeparator>
              <Field>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                  <span>تسجيل الدخول مع Google</span>
                </Button>
              </Field>
              <FieldDescription className="text-center">
                ليس لديك حساب؟ <a href="/auth/sign-up">سجل الآن</a>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
