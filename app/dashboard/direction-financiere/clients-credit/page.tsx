import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { ClientsCreditClient } from "./client";

export default async function ClientsCreditPage() {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

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
      livraisons: {
        select: { montant: true, quantite: true, fuelId: true, date: true, remise: true, puPompe: true },
        orderBy: { date: "asc" },
      },
      mouvements: { select: { type: true, montant: true } },
      conditionsCarb: {
        include: { fuel: { select: { id: true, name: true, code: true, salePrice: true } } },
      },
    },
  });

  // ── Build rows with computed solde ──────────────────────────────────────────
  const CREDIT_TYPES = new Set(["NOTE_CREDIT", "REMISE", "AUTRE_CREDIT"]);

  const clients = rawClients.map((c) => {
    const soldeInitial = Number(c.soldeInitiaux[0]?.solde ?? 0);
    const totalLivraisons = c.livraisons.reduce((s, l) => s + Number(l.montant), 0);
    const totalPaiements = c.mouvements.reduce((s, m) => {
      const amount = Number(m.montant);
      return CREDIT_TYPES.has(m.type) ? s + amount : s - amount;
    }, 0);
    const soldeCourant = soldeInitial + totalLivraisons - totalPaiements;

    // Volume par carburant
    const volParFuel: Record<string, number> = {};
    let derniereLivraison: string | null = null;
    for (const l of c.livraisons) {
      volParFuel[l.fuelId] = (volParFuel[l.fuelId] ?? 0) + Number(l.quantite);
      if (!derniereLivraison || l.date > new Date(derniereLivraison)) {
        derniereLivraison = new Date(l.date).toISOString().slice(0, 10);
      }
    }

    return {
      id: c.id,
      nom: c.nom,
      code: c.code,
      telephone: c.telephone,
      active: c.active,
      delaiReglement: c.delaiReglement,
      typeContrat: c.typeContrat,
      creditStation: Number(c.creditStation ?? 0),
      soldeInitial,
      totalLivraisons,
      totalPaiements,
      soldeCourant,
      derniereLivraison,
      volParFuel,
      conditions: c.conditionsCarb.map((cc) => ({
        fuelId: cc.fuelId,
        fuelName: cc.fuel.name,
        fuelCode: cc.fuel.code,
        puPompe: Number(cc.puPompe),
        remise: Number(cc.remise),
        stockActuel: Number(cc.stockActuel),
        salePrice: Number(cc.fuel.salePrice),
      })),
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
