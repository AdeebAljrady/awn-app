"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Loader2Icon, CheckCircle2Icon } from "lucide-react";
import { updateProfile } from "@/app/actions/profile/update-profile";

interface ProfileFormProps {
  currentName: string;
  email: string;
}

export function ProfileForm({ currentName, email }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success]);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-muted text-right"
            dir="ltr"
          />
          <FieldDescription>لا يمكن تغيير البريد الإلكتروني</FieldDescription>
        </Field>
        
        <Field>
          <FieldLabel htmlFor="full_name">الاسم الكامل</FieldLabel>
          <Input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={currentName}
            placeholder="أدخل اسمك الكامل"
            required
            minLength={2}
            className="text-right"
            dir="rtl"
          />
        </Field>
        
        {state?.error && (
          <FieldDescription className="text-destructive text-right">
            {state.error}
          </FieldDescription>
        )}
        
        {showSuccess && (
          <FieldDescription className="text-green-600 text-right flex items-center gap-2 justify-end">
            <span>تم حفظ التغييرات بنجاح</span>
            <CheckCircle2Icon className="w-4 h-4" />
          </FieldDescription>
        )}
        
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              "حفظ التغييرات"
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
