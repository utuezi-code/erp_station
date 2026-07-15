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

/**
 * Circuit de validation 3 niveaux :
 *  1. Gérant → crée la DA (EN_ATTENTE)
 *  2. Direction Financière → 1ère validation (EN_ATTENTE → VALIDE_DF)
 *  3. Direction Générale → validation finale (VALIDE_DF → VALIDE)
 *
 * Seul ADMIN peut valider à n'importe quel niveau.
 * Un rejet à n'importe quel niveau → REJETE.
 */
export async function validatePurchaseRequest(
  id: string,
  approved: boolean,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
    const role = (session.user as any).role as string;

    const pr = await db.purchaseRequest.findUnique({ where: { id }, select: { status: true } });
    if (!pr) return { success: false, error: "Demande introuvable." };

    if (!approved) {
      await db.purchaseRequest.update({ where: { id }, data: { status: "REJETE" } });
      revalidatePath("/dashboard/achats/demandes");
      revalidatePath(`/dashboard/achats/demandes/${id}`);
      return { success: true };
    }

    // Étape 1 : DF valide en premier (EN_ATTENTE → VALIDE_DF)
    if (pr.status === "EN_ATTENTE") {
      if (!["ADMIN", "DIRECTION_FINANCIERE"].includes(role)) {
        return { success: false, error: "Seule la Direction Financière peut effectuer la 1ère validation." };
      }
      await db.purchaseRequest.update({ where: { id }, data: { status: "VALIDE_DF" as any } });
      revalidatePath("/dashboard/achats/demandes");
      revalidatePath(`/dashboard/achats/demandes/${id}`);
      return { success: true };
    }

    // Étape 2 : DG valide en dernier (VALIDE_DF → VALIDE)
    if ((pr.status as string) === "VALIDE_DF") {
      if (!["ADMIN", "DIRECTION_GENERALE"].includes(role)) {
        return { success: false, error: "Seule la Direction Générale peut effectuer la validation finale." };
      }
      await db.purchaseRequest.update({ where: { id }, data: { status: "VALIDE" } });
      revalidatePath("/dashboard/achats/demandes");
      revalidatePath(`/dashboard/achats/demandes/${id}`);
      return { success: true };
    }

    return { success: false, error: `Cette demande ne peut pas être validée depuis son statut actuel.` };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}
