import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  order: z.number().int().min(0).max(999).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      order: c.order,
      productCount: c._count.products,
    })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const name = parsed.data.name.trim();
  const slug = slugify(name) || `cat-${Date.now()}`;
  const max = await prisma.category.aggregate({ _max: { order: true } });

  const category = await prisma.category
    .create({
      data: { name, slug, order: parsed.data.order ?? (max._max.order ?? 0) + 1 },
    })
    .catch(() => null);

  if (!category) {
    return NextResponse.json(
      { error: "Ya existe una categoría con ese nombre." },
      { status: 409 },
    );
  }
  return NextResponse.json({ category }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60).optional(),
  order: z.number().int().min(0).max(999).optional(),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const previous = await prisma.category.findUnique({ where: { id: parsed.data.id } });
  if (!previous) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }

  const name = parsed.data.name?.trim();
  const category = await prisma.category
    .update({
      where: { id: parsed.data.id },
      data: {
        ...(name ? { name, slug: slugify(name) } : {}),
        ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}),
      },
    })
    .catch(() => null);

  if (!category) {
    return NextResponse.json(
      { error: "Ya existe una categoría con ese nombre." },
      { status: 409 },
    );
  }

  // Mantiene el texto denormalizado de los productos alineado con el nombre nuevo.
  if (name && name !== previous.name) {
    await prisma.product.updateMany({
      where: { categoryId: category.id },
      data: { category: name },
    });
  }

  return NextResponse.json({ category });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const inUse = await prisma.product.count({ where: { categoryId: id } });
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: ${inUse} producto(s) usan esta categoría. Movelos a otra primero.`,
      },
      { status: 409 },
    );
  }

  const deleted = await prisma.category.delete({ where: { id } }).catch(() => null);
  if (!deleted) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
