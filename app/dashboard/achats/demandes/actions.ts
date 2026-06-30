"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const itemSchema = z.object({
  description: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.string().default("unité"),
  estimatedCost: z.coerce.number().nonnegative().optional(),
});

export async function createPurchaseRequest(formData: FormData) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT"]);
  const user = session.user as any;

  const stationId = formData.get("stationId") as string;

  // IDOR guard: GERANT can only create purchase requests for their own station
  if (user.role === "GERANT" && stationId !== user.stationId) {
    throw new Error("Accès refusé : vous ne pouvez créer des demandes que pour votre propre station.");
  }
  const service = formData.get("service") as string;
  const justification = formData.get("justification") as string;
  const priority = (formData.get("priority") as string) || "NORMAL";

  const itemsJson = formData.get("items") as string;
  const items = z.array(itemSchema).parse(JSON.parse(itemsJson || "[]"));
  if (items.length === 0) throw new Error("Ajoutez au moins un article.");

  // Auto-generate number
  const count = await db.purchaseRequest.count();
  const number = `DA-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const pr = await db.purchaseRequest.create({
    data: {
      number,
      userId: user.id,
      stationId,
      service,
      justification,
      priority: priority as any,
      status: "EN_ATTENTE",
      items: {
        create: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit: i.unit,
          estimatedCost: i.estimatedCost || null,
        })),
      },
    },
  });

  revalidatePath("/dashboard/achats/demandes");
  return { id: pr.id };
}

export async function validatePurchaseRequest(id: string, approved: boolean, comment?: string) {
  const session = await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const user = session.user as any;

  await db.purchaseRequest.update({
    where: { id },
    data: { status: approved ? "VALIDE" : "REJETE" },
  });

  revalidatePath("/dashboard/achats/demandes");
  revalidatePath(`/dashboard/achats/demandes/${id}`);
}
