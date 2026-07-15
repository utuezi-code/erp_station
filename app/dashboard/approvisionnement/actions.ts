"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

// ─── Achat SIR ───────────────────────────────────────────────────────────────

export async function createSIRPurchase(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

    const fuelId = formData.get("fuelId") as string;
    const purchaseDate = formData.get("purchaseDate") as string;
    const quantity = parseFloat(formData.get("quantity") as string);
    const unitPrice = parseFloat(formData.get("unitPrice") as string);
    const invoiceNumber = (formData.get("invoiceNumber") as string) || null;
    const status = (formData.get("status") as string) || "COMMANDE";
    const note = (formData.get("note") as string) || null;

    const count = await db.sIRPurchase.count();
    const reference = `SIR-${new Date(purchaseDate).getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const totalAmount = quantity * unitPrice;

    const purchase = await db.sIRPurchase.create({
      data: {
        reference,
        purchaseDate: new Date(purchaseDate),
        fuelId,
        quantity,
        unitPrice,
        totalAmount,
        invoiceNumber,
        status,
        note,
      },
    });

    // Si statut LIVRE → créer un mouvement GESTOCI ENTREE
    if (status === "LIVRE" || status === "FACTURE") {
      await db.gESTOCIMovement.create({
        data: {
          date: new Date(purchaseDate),
          fuelId,
          type: "ENTREE",
          quantity,
          reference: purchase.reference,
          sirPurchaseId: purchase.id,
        },
      });
    }

    revalidatePath("/dashboard/approvisionnement");
    revalidatePath("/dashboard/approvisionnement/sir");
    revalidatePath("/dashboard/approvisionnement/gestoci");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur interne." };
  }
}

export async function updateSIRStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

    const purchase = await db.sIRPurchase.findUnique({ where: { id } });
    if (!purchase) return { success: false, error: "Achat introuvable." };

    await db.sIRPurchase.update({ where: { id }, data: { status } });

    // Si passage à LIVRE et pas encore de mouvement GESTOCI → créer l'entrée
    if ((status === "LIVRE" || status === "FACTURE") && purchase.status === "COMMANDE") {
      const existing = await db.gESTOCIMovement.findFirst({ where: { sirPurchaseId: id } });
      if (!existing) {
        await db.gESTOCIMovement.create({
          data: {
            date: purchase.purchaseDate,
            fuelId: purchase.fuelId,
            type: "ENTREE",
            quantity: purchase.quantity,
            reference: purchase.reference,
            sirPurchaseId: id,
          },
        });
      }
    }

    revalidatePath("/dashboard/approvisionnement/sir");
    revalidatePath("/dashboard/approvisionnement/gestoci");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur interne." };
  }
}

// ─── Mise à Disposition ───────────────────────────────────────────────────────

export async function createMiseADispo(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

    const stationId = formData.get("stationId") as string;
    const fuelId = formData.get("fuelId") as string;
    const date = formData.get("date") as string;
    const quantity = parseFloat(formData.get("quantity") as string);
    const unitPrice = parseFloat(formData.get("unitPrice") as string);
    const orderId = (formData.get("orderId") as string) || null;
    const note = (formData.get("note") as string) || null;

    // Vérifier stock GESTOCI disponible
    const stockAgg = await db.gESTOCIMovement.groupBy({
      by: ["type"],
      where: { fuelId },
      _sum: { quantity: true },
    });
    const entrees = Number(stockAgg.find((s) => s.type === "ENTREE")?._sum.quantity || 0);
    const sorties = Number(stockAgg.find((s) => s.type === "SORTIE")?._sum.quantity || 0);
    const disponible = entrees - sorties;

    if (quantity > disponible) {
      return {
        success: false,
        error: `Stock GESTOCI insuffisant. Disponible : ${disponible.toLocaleString("fr-CI")} L, demandé : ${quantity.toLocaleString("fr-CI")} L.`,
      };
    }

    const count = await db.miseADisposition.count();
    const number = `MD-${new Date(date).getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const totalAmount = quantity * unitPrice;

    const md = await db.miseADisposition.create({
      data: {
        number,
        date: new Date(date),
        stationId,
        fuelId,
        quantity,
        unitPrice,
        totalAmount,
        orderId,
        note,
        status: "EMISE",
      },
    });

    // Mouvement GESTOCI SORTIE
    await db.gESTOCIMovement.create({
      data: {
        date: new Date(date),
        fuelId,
        type: "SORTIE",
        quantity,
        reference: number,
        miseADispoId: md.id,
      },
    });

    revalidatePath("/dashboard/approvisionnement");
    revalidatePath("/dashboard/approvisionnement/gestoci");
    revalidatePath("/dashboard/approvisionnement/mises-a-disposition");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur interne." };
  }
}

export async function updateMDStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_GENERALE", "GERANT"]);
    await db.miseADisposition.update({ where: { id }, data: { status } });
    revalidatePath("/dashboard/approvisionnement/mises-a-disposition");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur interne." };
  }
}
