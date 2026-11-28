import { Suspense } from "react";
import { PasswordResetForm } from "@/components/PasswordResetForm";

export default function NuevaPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-20 text-sm text-muted">Cargando…</div>}>
      <PasswordResetForm />
    </Suspense>
  );
}
