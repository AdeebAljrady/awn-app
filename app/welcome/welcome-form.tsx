"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Loader2Icon } from "lucide-react";
import { updateProfileName } from "@/app/actions/profile/update-profile";

export function WelcomeForm() {
  const [state, formAction, pending] = useActionState(updateProfileName, null);

  return (
    <Card>
      <CardContent className="p-6">
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="full_name">ما اسمك؟</FieldLabel>
              <Input
                id="full_name"
                name="full_name"
                type="text"
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
            
            <Field>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  "ابدأ الآن"
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
