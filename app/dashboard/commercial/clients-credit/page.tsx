"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { ClientsCreditClient } from "./client";

export default async function ClientsCreditPage() {
  await requireRole([
    "ADMIN",
    "DIRECTION_COMMERCIALE",
    "DIRECTION_FINANCIERE",
    "DIRECTION_GENERALE",
  ]);

  const annee = new Date().getFullYear();

  // ── Fuels ──────────────────────────────────────────────────────────────────
  const fuels = await db.fuel.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, salePrice: true },
    orderBy: { name: "asc" },
  });

  // ── Clients ─────────────────────────────────────────────────────────────────
  const rawClients = await db.clientCreditCompte.findMany({
    orderBy: { nom: "asc" },
    include: {
      soldeInitiaux: { where: { annee } },
      livraisons: { select: { montant: true } },
      mouvements: { select: { type: true, montant: true } },
    },
  });

  // ── Build rows with computed solde ──────────────────────────────────────────
  const clients = rawClients.map((c) => {
    const soldeInitial = Number(c.soldeInitiaux[0]?.solde ?? 0);
    const totalLivraisons = c.livraisons.reduce((s, l) => s + Number(l.montant), 0);

    // Mouvements qui diminuent la dette (paiements / crédits)
    const CREDIT_TYPES = new Set(["NOTE_CREDIT", "REMISE", "AUTRE_CREDIT"]);
    const totalPaiements = c.mouvements.reduce((s, m) => {
      const amount = Number(m.montant);
      return CREDIT_TYPES.has(m.type) ? s + amount : s - amount;
    }, 0);

    const soldeCourant = soldeInitial + totalLivraisons - totalPaiements;

    return {
      id: c.id,
      nom: c.nom,
      code: c.code,
      telephone: c.telephone,
      active: c.active,
      soldeInitial,
      totalLivraisons,
      totalPaiements,
      soldeCourant,
    };
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <ClientsCreditClient
        clients={serialize(clients)}
        fuels={serialize(fuels)}
        annee={annee}
      />
    </div>
  );
}
