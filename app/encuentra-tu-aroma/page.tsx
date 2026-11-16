import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { normalizeProduct } from "@/lib/normalize-product";
import { AromaQuiz } from "@/components/AromaQuiz";
import type { ProductDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Encontrá tu aroma — test de 4 preguntas",
  description:
    "Respondé cuatro preguntas sobre familia olfativa, ocasión e intensidad y te recomendamos tres perfumes de la tienda.",
  openGraph: {
    title: "Encontrá tu aroma",
    description: "4 preguntas, 1 minuto, 3 perfumes recomendados para vos.",
  },
};

export default async function EncuentraTuAromaPage() {
  const rows = await prisma.product
    .findMany({ where: { visible: true }, orderBy: { createdAt: "desc" } })
    .catch(() => []);

  const products = rows.map((p) => normalizeProduct(p) as unknown as ProductDTO);

  return (
    <main className="min-h-[60vh] bg-bg">
      <AromaQuiz products={products} />
    </main>
  );
}
