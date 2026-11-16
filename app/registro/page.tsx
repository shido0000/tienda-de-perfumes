import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-20 text-sm text-muted">Cargando…</div>}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
