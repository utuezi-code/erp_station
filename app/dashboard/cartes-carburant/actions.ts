"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function saveClient(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const id = formData.get("id") as string | null;
  const data = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    address: (formData.get("address") as string) || null,
  };
  if (id) {
    await db.clientCompte.update({ where: { id }, data });
  } else {
    await db.clientCompte.create({ data });
  }
  revalidatePath("/dashboard/cartes-carburant");
  return { success: true };
}

export async function saveCarte(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const data = {
    clientId: formData.get("clientId") as string,
    cardNumber: formData.get("cardNumber") as string,
    holderName: formData.get("holderName") as string,
    plafond: formData.get("plafond") ? Number(formData.get("plafond")) : null,
  };
  const id = formData.get("id") as string | null;
  if (id) {
    await db.carteCarburant.update({ where: { id }, data });
  } else {
    await db.carteCarburant.create({ data });
  }
  revalidatePath("/dashboard/cartes-carburant");
  return { success: true };
}

export async function saveTransaction(formData: FormData) {
  await requireRole(["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const volume = Number(formData.get("volume"));
  const unitPrice = Number(formData.get("unitPrice"));
  const amount = volume * unitPrice;
  const carteId = formData.get("carteId") as string;

  const carte = await db.carteCarburant.findUnique({ where: { id: carteId } });
  if (!carte) throw new Error("Carte introuvable.");
  if (!carte.active) throw new Error("Cette carte est désactivée.");
  if (carte.plafond !== null && Number(carte.solde) + amount > Number(carte.plafond)) {
    throw new Error(`Plafond mensuel dépassé (${Number(carte.plafond).toLocaleString("fr-CI")} FCFA).`);
  }

  await db.$transaction([
    db.transactionCarte.create({
      data: {
        carteId,
        stationId: formData.get("stationId") as string,
        fuelId: (formData.get("fuelId") as string) || null,
        date: new Date(formData.get("date") as string),
        volume,
        unitPrice,
        amount,
        reference: (formData.get("reference") as string) || null,
      },
    }),
    db.carteCarburant.update({
      where: { id: carteId },
      data: { solde: { increment: amount } },
    }),
  ]);

  revalidatePath("/dashboard/cartes-carburant");
  return { success: true };
}

export async function resetSoldes() {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);
  await db.carteCarburant.updateMany({ data: { solde: 0 } });
  revalidatePath("/dashboard/cartes-carburant");
  return { success: true };
}
