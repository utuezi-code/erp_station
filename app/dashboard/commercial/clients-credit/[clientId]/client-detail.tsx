"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  nom: string;
  code: string | null;
  telephone: string | null;
  adresse: string | null;
  active: boolean;
}

interface SoldeInitialRow {
  solde: number;
  annee: number;
} | null;

interface LivraisonRow {
  id: string;
  date: string;
  fuelName: string;
  fuelCode: string;
  quantite: number;
  puPompe: number;
  remise: number;
  puVente: number;
  montant: number;
  blNumber: string | null;
  fournisseur: string | null;
}

interface MouvementRow {
  id: string;
  date: string;
  type: string;
  montant: number;
  libelle: string;
  reference: string | null;
  banque: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const TYPE_LABELS: Record<string, string> = {
  NOTE_DEBIT: "Note de débit",
  NOTE_CREDIT: "Versement / Crédit",
  REMISE: "Remise",
  AUTRE_CHARGE: "Autre charge",
  AUTRE_CREDIT: "Autre crédit",
};

const CREDIT_TYPES = new Set(["NOTE_CREDIT", "REMISE", "AUTRE_CREDIT"]);

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  client: ClientRow;
  soldeInitial: { solde: number; annee: number } | null;
  livraisons: (LivraisonRow & { fuel: { name: string; code: string } })[];
  mouvements: MouvementRow[];
  annee: number;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ClientDetailPage({ client, soldeInitial, livraisons, mouvements, annee }: Props) {
  const [activeTab, setActiveTab] = useState<"releve" | "livraisons" | "mouvements">("releve");

  const soldeInit = Number(soldeInitial?.solde ?? 0);
  const totalLivraisons = livraisons.reduce((s, l) => s + Number(l.montant), 0);
  const totalPaiements = mouvements.reduce((s, m) => {
    const amt = Number(m.montant);
    return CREDIT_TYPES.has(m.type) ? s + amt : s - amt;
  }, 0);
  const soldeCourant = soldeInit + totalLivraisons - totalPaiements;

  // Build chronological ledger (relevé)
  type LedgerEntry = {
    date: string;
    libelle: string;
    debit: number;
    credit: number;
    solde: number;
    ref: string | null;
  };

  const entries: LedgerEntry[] = [];
  let running = soldeInit;

  // Combine livraisons + mouvements sorted by date
  const all: { date: string; kind: "livraison" | "mouvement"; data: LivraisonRow | MouvementRow }[] = [
    ...livraisons.map((l) => ({ date: l.date, kind: "livraison" as const, data: l })),
    ...mouvements.map((m) => ({ date: m.date, kind: "mouvement" as const, data: m })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  for (const item of all) {
    if (item.kind === "livraison") {
      const l = item.data as LivraisonRow;
      running += Number(l.montant);
      entries.push({
        date: l.date,
        libelle: `Livraison ${(l as any).fuel?.name ?? ""} — ${l.fournisseur ?? "SIR"}${l.blNumber ? ` (${l.blNumber})` : ""}`,
        debit: Number(l.montant),
        credit: 0,
        solde: running,
        ref: l.blNumber,
      });
    } else {
      const m = item.data as MouvementRow;
      const amt = Number(m.montant);
      if (CREDIT_TYPES.has(m.type)) {
        running -= amt;
        entries.push({ date: m.date, libelle: m.libelle, debit: 0, credit: amt, solde: running, ref: m.reference });
      } else {
        running += amt;
        entries.push({ date: m.date, libelle: m.libelle, debit: amt, credit: 0, solde: running, ref: m.reference });
      }
    }
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .print-container { padding: 0 !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="p-4 md:p-6 max-w-5xl mx-auto print-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/commercial/clients-credit" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{client.nom}</h1>
              <p className="text-sm text-gray-500">
                {client.code && <span className="mr-2">Code : {client.code}</span>}
                {client.telephone && <span>Tél : {client.telephone}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900"
          >
            <Printer className="w-4 h-4" /> Exporter PDF
          </button>
        </div>

        {/* Print header (only visible when printing) */}
        <div className="print-only mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ivory Energies CI</p>
              <h1 className="text-xl font-bold mt-1">Relevé de compte client crédit</h1>
              <h2 className="text-lg font-semibold text-gray-700">{client.nom}</h2>
              {client.code && <p className="text-sm text-gray-500">Code : {client.code}</p>}
              {client.telephone && <p className="text-sm text-gray-500">Tél : {client.telephone}</p>}
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Exercice {annee}</p>
              <p>Édité le {new Date().toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Solde initial {annee}</p>
            <p className="text-lg font-bold">{fmt(soldeInit)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total livraisons</p>
            <p className="text-lg font-bold text-orange-700">{fmt(totalLivraisons)}</p>
            <p className="text-xs text-gray-400">FCFA — {livraisons.length} livraison(s)</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total versements</p>
            <p className="text-lg font-bold text-green-700">{fmt(totalPaiements)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </div>
          <div className={`border rounded-xl p-4 ${soldeCourant > 0 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Solde dû</p>
            <p className={`text-lg font-bold ${soldeCourant > 0 ? "text-red-700" : "text-green-700"}`}>{fmt(soldeCourant)}</p>
            <p className="text-xs text-gray-400">FCFA — {soldeCourant > 0 ? "à recouvrer" : "à jour"}</p>
          </div>
        </div>

        {/* Tabs (hidden when printing) */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit no-print">
          {(["releve", "livraisons", "mouvements"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {tab === "releve" ? "Relevé" : tab === "livraisons" ? `Livraisons (${livraisons.length})` : `Mouvements (${mouvements.length})`}
            </button>
          ))}
        </div>

        {/* ── RELEVÉ ── */}
        {(activeTab === "releve") && (
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">Relevé chronologique</h3>
              <span className="text-xs text-gray-500">Solde initial : {fmt(soldeInit)} FCFA</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Libellé</th>
                    <th className="px-4 py-2 text-right text-red-600">Débit</th>
                    <th className="px-4 py-2 text-right text-green-600">Crédit</th>
                    <th className="px-4 py-2 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Solde initial row */}
                  <tr className="bg-blue-50">
                    <td className="px-4 py-2 text-gray-500 text-xs">01/01/{annee}</td>
                    <td className="px-4 py-2 font-medium text-blue-700">Solde de report</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-right font-bold text-blue-700">{fmt(soldeInit)}</td>
                  </tr>
                  {entries.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-4 py-2">
                        <span>{e.libelle}</span>
                        {e.ref && <span className="ml-2 text-xs text-gray-400">{e.ref}</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-red-600">{e.debit > 0 ? fmt(e.debit) : ""}</td>
                      <td className="px-4 py-2 text-right text-green-600">{e.credit > 0 ? fmt(e.credit) : ""}</td>
                      <td className={`px-4 py-2 text-right font-medium ${e.solde > 0 ? "text-red-700" : "text-green-700"}`}>
                        {fmt(e.solde)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-gray-50 font-semibold border-t-2">
                    <td className="px-4 py-3" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right text-red-700">{fmt(totalLivraisons + entries.filter(e => e.debit > 0 && e.credit === 0 && !e.libelle.startsWith("Livraison")).reduce((s, e) => s + e.debit, 0))}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(totalPaiements)}</td>
                    <td className={`px-4 py-3 text-right ${soldeCourant > 0 ? "text-red-700" : "text-green-700"}`}>{fmt(soldeCourant)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LIVRAISONS ── */}
        {activeTab === "livraisons" && (
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Livraisons carburant</h3>
            </div>
            {livraisons.length === 0 ? (
              <p className="text-gray-500 text-sm p-6 text-center">Aucune livraison enregistrée.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Carburant</th>
                      <th className="px-4 py-2 text-right">Qté (L)</th>
                      <th className="px-4 py-2 text-right">PU pompe</th>
                      <th className="px-4 py-2 text-right">Remise</th>
                      <th className="px-4 py-2 text-right">PU vente</th>
                      <th className="px-4 py-2 text-right">Montant</th>
                      <th className="px-4 py-2 text-left">N° BL</th>
                      <th className="px-4 py-2 text-left">Fournisseur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {livraisons.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDate(l.date)}</td>
                        <td className="px-4 py-2">{(l as any).fuel?.name ?? l.fuelCode}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmt(Number(l.quantite))}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmt(Number(l.puPompe))}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-orange-600">{Number(l.remise) > 0 ? fmt(Number(l.remise)) : "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmt(Number(l.puVente))}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">{fmt(Number(l.montant))}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{l.blNumber ?? "—"}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{l.fournisseur ?? "—"}</td>
                      </tr>
                    ))}
                    <tr className="bg-orange-50 font-semibold">
                      <td className="px-4 py-2" colSpan={6}>Total livraisons</td>
                      <td className="px-4 py-2 text-right text-orange-700">{fmt(totalLivraisons)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MOUVEMENTS ── */}
        {activeTab === "mouvements" && (
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Mouvements de trésorerie</h3>
            </div>
            {mouvements.length === 0 ? (
              <p className="text-gray-500 text-sm p-6 text-center">Aucun mouvement enregistré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Libellé</th>
                      <th className="px-4 py-2 text-left">Banque</th>
                      <th className="px-4 py-2 text-left">Référence</th>
                      <th className="px-4 py-2 text-right">Montant</th>
                      <th className="px-4 py-2 text-center">Sens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mouvements.map((m) => {
                      const isCredit = CREDIT_TYPES.has(m.type);
                      return (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">{fmtDate(m.date)}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {TYPE_LABELS[m.type] ?? m.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-700">{m.libelle}</td>
                          <td className="px-4 py-2 text-gray-500">{m.banque ?? "—"}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{m.reference ?? "—"}</td>
                          <td className={`px-4 py-2 text-right font-medium tabular-nums ${isCredit ? "text-green-700" : "text-red-700"}`}>
                            {fmt(Number(m.montant))}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {isCredit
                              ? <TrendingDown className="w-3.5 h-3.5 text-green-600 mx-auto" />
                              : <TrendingUp className="w-3.5 h-3.5 text-red-600 mx-auto" />}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-green-50 font-semibold">
                      <td className="px-4 py-2" colSpan={5}>Total versements / crédits</td>
                      <td className="px-4 py-2 text-right text-green-700">{fmt(totalPaiements)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer (print only) */}
        <div className="print-only mt-8 pt-4 border-t text-xs text-gray-400 flex justify-between">
          <span>Ivory Energies CI — Document confidentiel</span>
          <span>Généré le {new Date().toLocaleDateString("fr-FR")}</span>
        </div>
      </div>
    </>
  );
}
