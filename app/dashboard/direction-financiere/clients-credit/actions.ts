"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MouvementCompteType } from "@prisma/client";

const ALLOWED_ROLES = [
  "ADMIN" as const,
  
  "DIRECTION_FINANCIERE" as const,
  "DIRECTION_GENERALE" as const,
];

// ─── Client CRUD ─────────────────────────────────────────────────────────────

const clientSchema = z.object({
  nom: z.string().min(1),
  code: z.string().optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  note: z.string().optional(),
});

export async function createClientCredit(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(ALLOWED_ROLES);
    const userId = (session.user as any).id as string;

    const data = clientSchema.parse({
      nom: formData.get("nom"),
      code: formData.get("code") || undefined,
      telephone: formData.get("telephone") || undefined,
      adresse: formData.get("adresse") || undefined,
      note: formData.get("note") || undefined,
    });

    const client = await db.clientCreditCompte.create({ data });

    await writeAuditLog({
      userId,
      entity: "ClientCreditCompte",
      entityId: client.id,
      action: "CREATE",
      after: data,
    });

    revalidatePath("/dashboard/direction-financiere/clients-credit");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}

// ─── Solde initial ─────────────────────────────────────────────────────────────

export async function saveClientCreditSoldeInitial(
  clientId: string,
  annee: number,
  solde: number,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(ALLOWED_ROLES);
    const userId = (session.user as any).id as string;

    const existing = await db.clientCreditSoldeInitial.findUnique({
      where: { clientId_annee: { clientId, annee } },
    });

    let record;
    if (existing) {
      record = await db.clientCreditSoldeInitial.update({
        where: { id: existing.id },
        data: { solde, note, userId },
      });
    } else {
      record = await db.clientCreditSoldeInitial.create({
        data: { clientId, annee, solde, note, userId },
      });
    }

    await writeAuditLog({
      userId,
      entity: "ClientCreditSoldeInitial",
      entityId: record.id,
      action: existing ? "UPDATE" : "CREATE",
      after: { clientId, annee, solde },
    });

    revalidatePath("/dashboard/direction-financiere/clients-credit");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}

// ─── Livraison ─────────────────────────────────────────────────────────────────

const livraisonSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(1),
  fuelId: z.string().min(1),
  quantite: z.coerce.number().positive(),
  puPompe: z.coerce.number().positive(),
  remise: z.coerce.number().min(0),
  puVente: z.coerce.number().positive(),
  montant: z.coerce.number().positive(),
  blNumber: z.string().optional(),
  fournisseur: z.string().optional(),
  note: z.string().optional(),
});

export async function addClientCreditLivraison(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(ALLOWED_ROLES);
    const userId = (session.user as any).id as string;

    const data = livraisonSchema.parse({
      clientId: formData.get("clientId"),
      date: formData.get("date"),
      fuelId: formData.get("fuelId"),
      quantite: formData.get("quantite"),
      puPompe: formData.get("puPompe"),
      remise: formData.get("remise") || 0,
      puVente: formData.get("puVente"),
      montant: formData.get("montant"),
      blNumber: formData.get("blNumber") || undefined,
      fournisseur: formData.get("fournisseur") || undefined,
      note: formData.get("note") || undefined,
    });

    const livraison = await db.clientCreditLivraison.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId,
      },
    });

    await writeAuditLog({
      userId,
      entity: "ClientCreditLivraison",
      entityId: livraison.id,
      action: "CREATE",
      after: data,
    });

    revalidatePath("/dashboard/direction-financiere/clients-credit");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}

// ─── Mouvement (paiement, note débit/crédit, etc.) ─────────────────────────────

const mouvementSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(1),
  type: z.nativeEnum(MouvementCompteType),
  montant: z.coerce.number(),
  libelle: z.string().min(1),
  reference: z.string().optional(),
  banque: z.string().optional(),
});

export async function addMouvementClientCredit(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(ALLOWED_ROLES);
    const userId = (session.user as any).id as string;

    const data = mouvementSchema.parse({
      clientId: formData.get("clientId"),
      date: formData.get("date"),
      type: formData.get("type"),
      montant: formData.get("montant"),
      libelle: formData.get("libelle"),
      reference: formData.get("reference") || undefined,
      banque: formData.get("banque") || undefined,
    });

    const mouvement = await db.mouvementClientCredit.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId,
      },
    });

    await writeAuditLog({
      userId,
      entity: "MouvementClientCredit",
      entityId: mouvement.id,
      action: "CREATE",
      after: data,
    });

    revalidatePath("/dashboard/direction-financiere/clients-credit");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}

// ─── Toggle actif ──────────────────────────────────────────────────────────────

export async function toggleClientCreditActive(
  clientId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(ALLOWED_ROLES);
    const userId = (session.user as any).id as string;

    await db.clientCreditCompte.update({
      where: { id: clientId },
      data: { active },
    });

    await writeAuditLog({
      userId,
      entity: "ClientCreditCompte",
      entityId: clientId,
      action: "UPDATE",
      after: { active },
    });

    revalidatePath("/dashboard/direction-financiere/clients-credit");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}
