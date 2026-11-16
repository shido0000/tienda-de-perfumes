import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
};

/**
 * Estado vacío: dice por qué no hay nada y ofrece el siguiente paso.
 * Se usa en el catálogo (base recién sembrada / sin resultados) y en listas.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-14 text-center shadow-sm">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg text-primary">
          {icon}
        </div>
      )}
      <h2 className="text-h3">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-accent"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
