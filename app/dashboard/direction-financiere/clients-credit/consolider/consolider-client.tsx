"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface ConditionCarb {
  fuelId: string;
  fuelName: string;
  fuelCode: string;
  puPompe: number;
  remise: number;
  stockActuel: number;
  salePrice: number;
}

interface ClientRow {
  num: number;
  id: string;
  nom: string;
  code: string | null;
  active: boolean;
  delaiReglement: string | null;
  typeContrat: string | null;
  creditStation: number;
  soldeInitial: number;
  totalDebit: number;
  totalCredit: number;
  solde: number;
  volParFuel: Record<string, number>;
  derniereLivraison: string | null;
  conditions: ConditionCarb[];
}

interface FuelOption {
  id: string;
  name: string;
  code: string;
  salePrice: number;
}

interface Props {
  rows: ClientRow[];
  fuels: FuelOption[];
  annee: number;
}

function fmt(v: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function ConsoliderClient({ rows, fuels, annee }: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showInactive, setShowInactive] = useState(false);

  const spFuel = fuels.find((f) => f.code?.toUpperCase().includes("SP") || f.name?.toUpperCase().includes("SUPER"));
  const goFuel = fuels.find((f) => f.code?.toUpperCase().includes("GO") || f.name?.toUpperCase().includes("GASOIL") || f.name?.toUpperCase().includes("GAS OIL"));

  const displayed = showInactive ? rows : rows.filter((r) => r.active);

  function calcRow(r: ClientRow) {
    const spCond = r.conditions.find((c) => c.fuelId === spFuel?.id);
    const goCond = r.conditions.find((c) => c.fuelId === goFuel?.id);
    const cumulSP = r.volParFuel[spFuel?.id ?? ""] ?? 0;
    const cumulGO = r.volParFuel[goFuel?.id ?? ""] ?? 0;
    const remiseSP = spCond?.remise ?? 0;
    const remiseGO = goCond?.remise ?? 0;
    const stockSP = spCond?.stockActuel ?? 0;
    const stockGO = goCond?.stockActuel ?? 0;
    const puSP = spCond?.puPompe ?? (spFuel?.salePrice ?? 0);
    const puGO = goCond?.puPompe ?? (goFuel?.salePrice ?? 0);
    const mtSP = stockSP * (puSP - remiseSP);
    const mtGO = stockGO * (puGO - remiseGO);
    const valeurStock = mtSP + mtGO;
    const especeTheo = r.solde - (r.creditStation + valeurStock);
    return { spCond, goCond, cumulSP, cumulGO, remiseSP, remiseGO, stockSP, stockGO, puSP, puGO, mtSP, mtGO, valeurStock, especeTheo };
  }

  // Totaux
  const tot = {
    soldeInitial: displayed.reduce((s, r) => s + r.soldeInitial, 0),
    debit: displayed.reduce((s, r) => s + r.totalDebit, 0),
    credit: displayed.reduce((s, r) => s + r.totalCredit, 0),
    solde: displayed.reduce((s, r) => s + r.solde, 0),
    cumulSP: displayed.reduce((s, r) => s + (r.volParFuel[spFuel?.id ?? ""] ?? 0), 0),
    cumulGO: displayed.reduce((s, r) => s + (r.volParFuel[goFuel?.id ?? ""] ?? 0), 0),
    stockSP: displayed.reduce((s, r) => s + (r.conditions.find(c => c.fuelId === spFuel?.id)?.stockActuel ?? 0), 0),
    stockGO: displayed.reduce((s, r) => s + (r.conditions.find(c => c.fuelId === goFuel?.id)?.stockActuel ?? 0), 0),
    mtSP: displayed.reduce((s, r) => s + calcRow(r).mtSP, 0),
    mtGO: displayed.reduce((s, r) => s + calcRow(r).mtGO, 0),
    creditStation: displayed.reduce((s, r) => s + r.creditStation, 0),
    valeurStock: displayed.reduce((s, r) => s + calcRow(r).valeurStock, 0),
    especeTheo: displayed.reduce((s, r) => s + calcRow(r).especeTheo, 0),
  };

  // Catégories (identique au fichier Excel - SOLDE CLIENTS col AB-AE)
  const soldesParCategorie = {
    stationDirect: displayed.filter((r) => r.typeContrat === "DIRECT").reduce((s, r) => s + r.solde, 0),
    geranceLibre: displayed.filter((r) => r.typeContrat === "GL").reduce((s, r) => s + r.solde, 0),
    clientBtoB: displayed.filter((r) => !r.typeContrat || (r.typeContrat !== "DIRECT" && r.typeContrat !== "GL")).reduce((s, r) => s + r.solde, 0),
    creanceDouteux: displayed.filter((r) => !r.active).reduce((s, r) => s + r.solde, 0),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/direction-financiere/clients-credit" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <h1 className="text-xl font-bold">Consolidé clients crédit</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Inactifs
          </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700" />
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <Printer className="w-4 h-4" /> Imprimer
          </button>
        </div>
      </div>

      {/* En-tête fidèle au fichier Excel */}
      <div className="bg-white dark:bg-gray-900 border rounded-xl overflow-hidden print:border-0 print:rounded-none">
        {/* Titre style Excel */}
        <div className="bg-gray-800 text-white px-4 py-3 print:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm uppercase tracking-wide">NOM ENTREPRISE IECI</span>
            <span className="text-sm">Date : <strong>{new Date(date).toLocaleDateString("fr-FR")}</strong></span>
          </div>
          <div className="text-center mt-1">
            <span className="text-sm font-semibold uppercase tracking-wider">ÉTAT RÉCAPITULATIF COMPTES CLIENTS</span>
          </div>
        </div>

        {/* Table principale */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              {/* Ligne d'en-têtes groupées */}
              <tr className="bg-gray-700 text-white text-center">
                <th className="border border-gray-600 px-2 py-1.5" rowSpan={2}>N°</th>
                <th className="border border-gray-600 px-2 py-1.5" rowSpan={2}>CLIENTS</th>
                <th className="border border-gray-600 px-2 py-1.5" rowSpan={2}>TYPE</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-blue-800" colSpan={4}>SOLDES</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-green-800" colSpan={3}>VOLUMES</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-orange-800" colSpan={4}>CONDITIONS</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-purple-800" colSpan={2}>STOCKS</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-purple-800" colSpan={2}>PU POMPE</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-indigo-800" colSpan={2}>MONTANTS</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-yellow-700" rowSpan={2}>CRÉDIT<br/>STATION</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-yellow-600" rowSpan={2}>VALEUR<br/>STOCK</th>
                <th className="border border-gray-600 px-2 py-1.5 bg-teal-700" rowSpan={2}>ESPÈCE<br/>THÉORIQUE</th>
                <th className="border border-gray-600 px-2 py-1.5" rowSpan={2}>DERNIÈRE<br/>LIVRAISON</th>
              </tr>
              <tr className="bg-gray-600 text-white text-center">
                <th className="border border-gray-500 px-2 py-1 bg-blue-700">SOLDE<br/>INITIAL</th>
                <th className="border border-gray-500 px-2 py-1 bg-blue-700">DÉBIT</th>
                <th className="border border-gray-500 px-2 py-1 bg-blue-700">CRÉDIT</th>
                <th className="border border-gray-500 px-2 py-1 bg-blue-700 font-bold">SOLDE</th>
                <th className="border border-gray-500 px-2 py-1 bg-green-700">SUPER (L)</th>
                <th className="border border-gray-500 px-2 py-1 bg-green-700">GASOIL (L)</th>
                <th className="border border-gray-500 px-2 py-1 bg-green-700">CUMUL</th>
                <th className="border border-gray-500 px-2 py-1 bg-orange-700">DÉLAIS</th>
                <th className="border border-gray-500 px-2 py-1 bg-orange-700">REMISE SP</th>
                <th className="border border-gray-500 px-2 py-1 bg-orange-700">REMISE GO</th>
                <th className="border border-gray-500 px-2 py-1 bg-orange-700">TYPE CTR</th>
                <th className="border border-gray-500 px-2 py-1 bg-purple-700">STOCK SP</th>
                <th className="border border-gray-500 px-2 py-1 bg-purple-700">STOCK GO</th>
                <th className="border border-gray-500 px-2 py-1 bg-purple-700">PU SP</th>
                <th className="border border-gray-500 px-2 py-1 bg-purple-700">PU GO</th>
                <th className="border border-gray-500 px-2 py-1 bg-indigo-700">MT SUPER</th>
                <th className="border border-gray-500 px-2 py-1 bg-indigo-700">MT GASOIL</th>
              </tr>

              {/* Ligne TOTAUX */}
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold text-xs">
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center" colSpan={3}>TOTAUX</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.soldeInitial)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.debit)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.credit)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums font-bold bg-blue-50 dark:bg-blue-900/20">{fmt(tot.solde)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.cumulSP)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.cumulGO)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.cumulSP + tot.cumulGO)}</td>
                <td colSpan={4} className="border border-gray-200 dark:border-gray-700"></td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.stockSP)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.stockGO)}</td>
                <td colSpan={2} className="border border-gray-200 dark:border-gray-700"></td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.mtSP)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(tot.mtGO)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums bg-yellow-50 dark:bg-yellow-900/20">{fmt(tot.creditStation)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums bg-yellow-100 dark:bg-yellow-900/30 font-bold">{fmt(tot.valeurStock)}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums bg-teal-50 dark:bg-teal-900/20 font-bold">{fmt(tot.especeTheo)}</td>
                <td className="border border-gray-200 dark:border-gray-700"></td>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r, idx) => {
                const { cumulSP, cumulGO, remiseSP, remiseGO, stockSP, stockGO, puSP, puGO, mtSP, mtGO, valeurStock, especeTheo } = calcRow(r);
                const isEven = idx % 2 === 0;
                const bg = isEven ? "" : "bg-gray-50/60 dark:bg-gray-900/30";
                const soldeClass = r.solde > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";

                return (
                  <tr key={r.id} className={`${bg} hover:bg-blue-50/40 dark:hover:bg-blue-900/10 text-xs`}>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center text-gray-500">{r.num}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 font-medium whitespace-nowrap">
                      {r.nom}
                      {r.code && <span className="text-gray-400 ml-1 text-xs">({r.code})</span>}
                      {!r.active && <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 rounded px-1">Inactif</span>}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center">
                      {r.typeContrat ? (
                        <span className={`text-xs px-1.5 rounded ${
                          r.typeContrat === "GL" ? "bg-orange-100 text-orange-700" :
                          r.typeContrat === "LOCATION" ? "bg-purple-100 text-purple-700" :
                          r.typeContrat === "DIRECT" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{r.typeContrat}</span>
                      ) : "—"}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(r.soldeInitial)}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(r.totalDebit)}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{fmt(r.totalCredit)}</td>
                    <td className={`border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums font-bold bg-blue-50/50 dark:bg-blue-900/10 ${soldeClass}`}>
                      {fmt(r.solde)}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{cumulSP > 0 ? fmt(cumulSP) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{cumulGO > 0 ? fmt(cumulGO) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{(cumulSP + cumulGO) > 0 ? fmt(cumulSP + cumulGO) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center text-gray-600">{r.delaiReglement ?? "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{remiseSP > 0 ? fmt(remiseSP) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{remiseGO > 0 ? fmt(remiseGO) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center text-gray-600">{r.typeContrat ?? "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{stockSP > 0 ? fmt(stockSP) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{stockGO > 0 ? fmt(stockGO) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{puSP > 0 ? fmt(puSP) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{puGO > 0 ? fmt(puGO) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{mtSP > 0 ? fmt(mtSP) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums">{mtGO > 0 ? fmt(mtGO) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums bg-yellow-50/50 dark:bg-yellow-900/10">{r.creditStation > 0 ? fmt(r.creditStation) : "—"}</td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums bg-yellow-100/60 dark:bg-yellow-900/20 font-medium">{valeurStock > 0 ? fmt(valeurStock) : "—"}</td>
                    <td className={`border border-gray-200 dark:border-gray-700 px-2 py-1 text-right tabular-nums font-medium bg-teal-50/50 dark:bg-teal-900/10 ${especeTheo < 0 ? "text-red-600" : ""}`}>
                      {fmt(especeTheo)}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center whitespace-nowrap text-gray-600">{fmtDate(r.derniereLivraison)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Récapitulatif par catégorie (fidèle au cadre LES DIFFERENTES SOLDES du fichier Excel) */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3">LES DIFFÉRENTS SOLDES</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">STATION DIRECT</p>
              <p className={`text-lg font-bold tabular-nums ${soldesParCategorie.stationDirect > 0 ? "text-red-600" : "text-green-600"}`}>
                {fmt(soldesParCategorie.stationDirect)}
              </p>
              <p className="text-xs text-gray-500">FCFA</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide mb-1">STATION GÉRANCE LIBRE</p>
              <p className={`text-lg font-bold tabular-nums ${soldesParCategorie.geranceLibre > 0 ? "text-red-600" : "text-green-600"}`}>
                {fmt(soldesParCategorie.geranceLibre)}
              </p>
              <p className="text-xs text-gray-500">FCFA</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">CLIENT B TO B</p>
              <p className={`text-lg font-bold tabular-nums ${soldesParCategorie.clientBtoB > 0 ? "text-red-600" : "text-green-600"}`}>
                {fmt(soldesParCategorie.clientBtoB)}
              </p>
              <p className="text-xs text-gray-500">FCFA</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wide mb-1">CRÉANCE DOUTEUSE</p>
              <p className="text-lg font-bold tabular-nums text-red-600">
                {fmt(soldesParCategorie.creanceDouteux)}
              </p>
              <p className="text-xs text-gray-500">FCFA — clients inactifs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
