"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Fuel {
  id: string;
  name: string;
  code: string;
  salePrice: number;
}

interface ConsoRow {
  num: number;
  id: string;
  nom: string;
  type: "SS" | "CLIENT";
  active: boolean;
  typeContrat: string;
  href: string;
  soldeInitial: number;
  debit: number;
  credit: number;
  solde: number;
  totalEncaisse: number;
  nonEncaisse: number;
  volByFuel: Record<string, number>;
  stockByFuel: Record<string, number>;
  puByFuel: Record<string, number>;
  remiseByFuel: Record<string, number>;
  creditStation: number;
  delais: string;
  derniereLivraison: string | null;
}

interface Props {
  rows: ConsoRow[];
  fuels: Fuel[];
  annee: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n === 0) return "—";
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

function fmtSigned(n: number): string {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function findFuel(fuels: Fuel[], ...keywords: string[]): Fuel | undefined {
  return fuels.find((f) =>
    keywords.some((kw) => f.code.toUpperCase().includes(kw.toUpperCase()))
  );
}

// ── Per-row computed values ───────────────────────────────────────────────────

interface CalcResult {
  volSP: number;
  volGO: number;
  cumul: number;
  stockSP: number;
  stockGO: number;
  puSP: number;
  puGO: number;
  remiseSP: number;
  remiseGO: number;
  mtSP: number;
  mtGO: number;
  valeurStock: number;
  especeTheo: number;
}

function calcRow(row: ConsoRow, spId: string | undefined, goId: string | undefined): CalcResult {
  const volSP = spId ? (row.volByFuel[spId] ?? 0) : 0;
  const volGO = goId ? (row.volByFuel[goId] ?? 0) : 0;
  const cumul = volSP + volGO;
  const stockSP = spId ? (row.stockByFuel[spId] ?? 0) : 0;
  const stockGO = goId ? (row.stockByFuel[goId] ?? 0) : 0;
  const puSP = spId ? (row.puByFuel[spId] ?? 0) : 0;
  const puGO = goId ? (row.puByFuel[goId] ?? 0) : 0;
  const remiseSP = spId ? (row.remiseByFuel[spId] ?? 0) : 0;
  const remiseGO = goId ? (row.remiseByFuel[goId] ?? 0) : 0;
  const mtSP = stockSP * (puSP - remiseSP);
  const mtGO = stockGO * (puGO - remiseGO);
  const valeurStock = mtSP + mtGO;
  const especeTheo = row.solde - (row.creditStation + valeurStock);
  return { volSP, volGO, cumul, stockSP, stockGO, puSP, puGO, remiseSP, remiseGO, mtSP, mtGO, valeurStock, especeTheo };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConsoliderGlobalClient({ rows, fuels, annee }: Props) {
  const router = useRouter();
  const [dateRef, setDateRef] = useState(todayStr());

  const spFuel = findFuel(fuels, "SP", "SUPER");
  const goFuel = findFuel(fuels, "GO", "GASOIL", "DIESEL");

  // ── Totaux ────────────────────────────────────────────────────────────────
  const totals = rows.reduce(
    (acc, row) => {
      const c = calcRow(row, spFuel?.id, goFuel?.id);
      return {
        soldeInitial: acc.soldeInitial + row.soldeInitial,
        debit: acc.debit + row.debit,
        totalEncaisse: acc.totalEncaisse + (row.totalEncaisse ?? 0),
        nonEncaisse: acc.nonEncaisse + (row.nonEncaisse ?? 0),
        credit: acc.credit + row.credit,
        solde: acc.solde + row.solde,
        volSP: acc.volSP + c.volSP,
        volGO: acc.volGO + c.volGO,
        cumul: acc.cumul + c.cumul,
        stockSP: acc.stockSP + c.stockSP,
        stockGO: acc.stockGO + c.stockGO,
        mtSP: acc.mtSP + c.mtSP,
        mtGO: acc.mtGO + c.mtGO,
        valeurStock: acc.valeurStock + c.valeurStock,
        creditStation: acc.creditStation + row.creditStation,
        especeTheo: acc.especeTheo + c.especeTheo,
      };
    },
    {
      soldeInitial: 0, debit: 0, totalEncaisse: 0, nonEncaisse: 0, credit: 0, solde: 0,
      volSP: 0, volGO: 0, cumul: 0, stockSP: 0, stockGO: 0,
      mtSP: 0, mtGO: 0, valeurStock: 0, creditStation: 0, especeTheo: 0,
    }
  );

  // ── Résumé soldes ─────────────────────────────────────────────────────────
  const stationDirect = rows.filter((r) => r.type === "SS").reduce((s, r) => s + r.solde, 0);
  const geranceLibre = rows.filter((r) => r.typeContrat === "GL").reduce((s, r) => s + r.solde, 0);
  const clientBtoB = rows.filter((r) => r.type === "CLIENT" && r.typeContrat !== "GL" && r.active).reduce((s, r) => s + r.solde, 0);
  const creanceDout = rows.filter((r) => !r.active).reduce((s, r) => s + r.solde, 0);

  const thCls = "px-1.5 py-2 text-[9px] font-bold uppercase tracking-wide text-center text-white whitespace-nowrap";
  const tdCls = "px-1.5 py-1.5 text-[10px] text-right tabular-nums whitespace-nowrap";
  const tdLCls = "px-1.5 py-1.5 text-[10px] text-left whitespace-nowrap";
  // Sticky columns
  const stickyNumTh = `${thCls} sticky left-0 z-20 bg-blue-800 w-8`;
  const stickyNomTh = `${thCls} sticky left-8 z-20 bg-blue-800 text-left min-w-[140px]`;
  const stickyNumTd = `${tdCls} sticky left-0 z-10 text-center`;
  const stickyNomTd = `${tdLCls} sticky left-8 z-10 font-medium text-slate-800 min-w-[140px] max-w-[180px] truncate shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">NOM ENTREPRISE IECI</h1>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
            ÉTAT RÉCAPITULATIF COMPTES CLIENTS — {annee}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Date :</span>
            <input
              type="date"
              value={dateRef}
              onChange={(e) => setDateRef(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            {/* Row 1: group labels */}
            <tr className="bg-blue-800">
              <th className={stickyNumTh} rowSpan={2}>N°</th>
              <th className={stickyNomTh} rowSpan={2}>NOM</th>
              <th className={thCls} colSpan={6} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>SOLDES</th>
              <th className={thCls} colSpan={3} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>VOLUMES</th>
              <th className={thCls} colSpan={4} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>CONDITIONS</th>
              <th className={thCls} colSpan={2} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>STOCKS</th>
              <th className={thCls} colSpan={2} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>PU POMPE</th>
              <th className={thCls} colSpan={2} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>MONTANTS</th>
              <th className={thCls} rowSpan={2} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>CR. STATION</th>
              <th className={thCls} rowSpan={2} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>V. STOCK</th>
              <th className={thCls} rowSpan={2} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>ESP. THÉO</th>
              <th className={thCls} rowSpan={2} style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}>DERN. LIV.</th>
            </tr>
            {/* Row 2: subheaders */}
            <tr className="bg-blue-700">
              <th className={thCls}>SOLDE INIT</th>
              <th className={thCls}>DÉBIT (CA)</th>
              <th className={thCls}>ENCAISSÉ</th>
              <th className={thCls}>NON-ENC.</th>
              <th className={thCls}>VERSÉ</th>
              <th className={thCls}>SOLDE</th>
              <th className={thCls}>SP (L)</th>
              <th className={thCls}>GO (L)</th>
              <th className={thCls}>CUMUL</th>
              <th className={thCls}>DÉLAIS</th>
              <th className={thCls}>R. SP</th>
              <th className={thCls}>R. GO</th>
              <th className={thCls}>TYPE</th>
              <th className={thCls}>ST. SP</th>
              <th className={thCls}>ST. GO</th>
              <th className={thCls}>PU SP</th>
              <th className={thCls}>PU GO</th>
              <th className={thCls}>MT SP</th>
              <th className={thCls}>MT GO</th>
            </tr>
            {/* Row 3: TOTAUX */}
            <tr className="bg-blue-50 border-b-2 border-blue-200">
              <td className="sticky left-0 z-10 bg-blue-50 px-1.5 py-2 text-[10px] font-bold text-center text-blue-700 w-8" />
              <td className="sticky left-8 z-10 bg-blue-50 px-1.5 py-2 text-[10px] font-bold text-left text-blue-700 min-w-[140px]">TOTAUX</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmtSigned(totals.soldeInitial)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmtSigned(totals.debit)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmtSigned(totals.totalEncaisse ?? 0)}</td>
              <td className={`${tdCls} font-bold text-orange-700`}>{fmtSigned(totals.nonEncaisse ?? 0)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmtSigned(totals.credit)}</td>
              <td className={`${tdCls} font-bold ${totals.solde < 0 ? "text-red-600" : "text-blue-900"}`}>{fmtSigned(totals.solde)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmt(totals.volSP)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmt(totals.volGO)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmt(totals.cumul)}</td>
              <td colSpan={4} />
              <td className={`${tdCls} font-bold text-blue-800`}>{fmt(totals.stockSP)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmt(totals.stockGO)}</td>
              <td colSpan={2} />
              <td className={`${tdCls} font-bold text-blue-800`}>{fmtSigned(totals.mtSP)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmtSigned(totals.mtGO)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmt(totals.creditStation)}</td>
              <td className={`${tdCls} font-bold text-blue-800`}>{fmtSigned(totals.valeurStock)}</td>
              <td className={`${tdCls} font-bold ${totals.especeTheo < 0 ? "text-red-600" : "text-blue-900"}`}>{fmtSigned(totals.especeTheo)}</td>
              <td />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const c = calcRow(row, spFuel?.id, goFuel?.id);
              const isOdd = idx % 2 === 0;
              const stickyBg = row.type === "SS"
                ? (isOdd ? "#f8fafc" : "#f1f5f9")
                : (isOdd ? "#ffffff" : "#f9fafb");
              const baseBg = row.type === "SS"
                ? (isOdd ? "bg-slate-50" : "bg-slate-100/50")
                : (isOdd ? "bg-white" : "bg-gray-50/40");
              const rowCls = `${baseBg} ${!row.active ? "opacity-60 italic" : ""} hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-100`;

              return (
                <tr
                  key={row.id}
                  className={rowCls}
                  onClick={() => router.push(row.href)}
                >
                  <td className={stickyNumTd} style={{ background: stickyBg }}>
                    {row.num}
                    {row.type === "SS" && (
                      <span className="ml-1 text-[8px] bg-blue-100 text-blue-600 px-1 rounded font-bold">SS</span>
                    )}
                  </td>
                  <td className={stickyNomTd} title={row.nom} style={{ background: stickyBg }}>
                    {row.nom}
                  </td>
                  <td className={tdCls}>{fmtSigned(row.soldeInitial)}</td>
                  <td className={tdCls}>{fmtSigned(row.debit)}</td>
                  <td className={tdCls}>{row.type === "SS" ? fmtSigned(row.totalEncaisse ?? 0) : "—"}</td>
                  <td className={`${tdCls} ${(row.nonEncaisse ?? 0) > 0 ? "text-orange-600 font-semibold" : ""}`}>
                    {row.type === "SS" ? fmtSigned(row.nonEncaisse ?? 0) : "—"}
                  </td>
                  <td className={tdCls}>{fmtSigned(row.credit)}</td>
                  <td className={`${tdCls} font-semibold ${row.solde < 0 ? "text-red-600" : "text-slate-900"}`}>
                    {fmtSigned(row.solde)}
                  </td>
                  <td className={tdCls}>{fmt(c.volSP)}</td>
                  <td className={tdCls}>{fmt(c.volGO)}</td>
                  <td className={tdCls}>{fmt(c.cumul)}</td>
                  <td className={`${tdLCls} text-slate-500`}>{row.delais || "—"}</td>
                  <td className={tdCls}>{c.remiseSP > 0 ? fmt(c.remiseSP) : "—"}</td>
                  <td className={tdCls}>{c.remiseGO > 0 ? fmt(c.remiseGO) : "—"}</td>
                  <td className={`${tdLCls} text-slate-500`}>{row.typeContrat || "—"}</td>
                  <td className={tdCls}>{fmt(c.stockSP)}</td>
                  <td className={tdCls}>{fmt(c.stockGO)}</td>
                  <td className={tdCls}>{c.puSP > 0 ? fmt(c.puSP) : "—"}</td>
                  <td className={tdCls}>{c.puGO > 0 ? fmt(c.puGO) : "—"}</td>
                  <td className={tdCls}>{fmtSigned(c.mtSP)}</td>
                  <td className={tdCls}>{fmtSigned(c.mtGO)}</td>
                  <td className={tdCls}>{row.creditStation > 0 ? fmt(row.creditStation) : "—"}</td>
                  <td className={tdCls}>{fmtSigned(c.valeurStock)}</td>
                  <td className={`${tdCls} font-semibold ${c.especeTheo < 0 ? "text-red-600" : "text-slate-900"}`}>
                    {fmtSigned(c.especeTheo)}
                  </td>
                  <td className={`${tdLCls} text-slate-400`}>
                    {row.derniereLivraison
                      ? new Date(row.derniereLivraison + "T12:00:00").toLocaleDateString("fr-CI", { day: "2-digit", month: "short", year: "2-digit" })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── LES DIFFÉRENTS SOLDES ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-4">LES DIFFÉRENTS SOLDES</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "STATION DIRECT", value: stationDirect, color: "bg-blue-50 border-blue-200 text-blue-800" },
            { label: "GÉRANCE LIBRE", value: geranceLibre, color: "bg-purple-50 border-purple-200 text-purple-800" },
            { label: "CLIENT B TO B", value: clientBtoB, color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
            { label: "CRÉANCE DOUTEUSE", value: creanceDout, color: "bg-red-50 border-red-200 text-red-800" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
              <p className={`text-lg font-extrabold tabular-nums mt-1 ${value < 0 ? "text-red-600" : ""}`}>
                {value.toLocaleString("fr-CI", { maximumFractionDigits: 0 })} <span className="text-xs font-medium opacity-60">FCFA</span>
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
