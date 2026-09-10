"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useRef, useState } from "react";
import type { SuiviRow } from "./page";
import Link from "next/link";
import { ArrowLeft, Search, ChevronDown, ChevronUp } from "lucide-react";

const MONTHS = [
  ["2026-01", "Janvier 2026"], ["2026-02", "Février 2026"], ["2026-03", "Mars 2026"],
  ["2026-04", "Avril 2026"], ["2026-05", "Mai 2026"], ["2026-06", "Juin 2026"],
  ["2026-07", "Juillet 2026"], ["2026-08", "Août 2026"], ["2026-09", "Septembre 2026"],
  ["2026-10", "Octobre 2026"], ["2026-11", "Novembre 2026"], ["2026-12", "Décembre 2026"],
];

const fmt = (n: number | undefined) =>
  n == null ? "" : n.toLocaleString("fr-CI", { maximumFractionDigits: 1 });

const fmtFact = (n: number | undefined) =>
  n == null ? "" : n.toFixed(4);

function ecartColor(v: number | undefined) {
  if (v == null) return "";
  if (v > 50) return "text-red-600 font-semibold";
  if (v < -50) return "text-red-600 font-semibold";
  if (v !== 0) return "text-amber-600";
  return "text-slate-400";
}

export function SuiviClient({
  rows,
  totalRows,
  totals,
  filters,
}: {
  rows: SuiviRow[];
  totalRows: number;
  totals: {
    achatSuper: number;
    achatGasoil: number;
    m15Super: number;
    m15Gasoil: number;
    balanceSuper: number;
    balanceGasoil: number;
  };
  filters: { mois?: string; q?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyFilter(key: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value); else sp.delete(key);
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function onSearch(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilter("q", v), 400);
  }

  const balS = totals.balanceSuper;
  const balG = totals.balanceGasoil;
  const balSColor = balS < 0 ? "text-red-600" : balS < 20000 ? "text-amber-600" : "text-emerald-700";
  const balGColor = balG < 0 ? "text-red-600" : balG < 20000 ? "text-amber-600" : "text-emerald-700";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex-none px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/commercial/gestoci" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              Contrôle des Stocks GESTOCI — Ivory Energies CI
            </h1>
            <p className="text-xs text-slate-400">{rows.length} lignes affichées / {totalRows} total</p>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Achats Super", value: fmt(totals.achatSuper) + " L", sub: "M15" },
            { label: "Achats Gasoil", value: fmt(totals.achatGasoil) + " L", sub: "M15" },
            { label: "Sorties Super", value: fmt(totals.m15Super) + " L", sub: "M15" },
            { label: "Sorties Gasoil", value: fmt(totals.m15Gasoil) + " L", sub: "M15" },
            { label: "Solde Super", value: fmt(balS) + " L", sub: "Théorique", color: balSColor },
            { label: "Solde Gasoil", value: fmt(balG) + " L", sub: "Théorique", color: balGColor },
          ].map((k) => (
            <div key={k.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{k.label}</p>
              <p className={`text-sm font-bold tabular-nums ${k.color ?? "text-slate-800 dark:text-white"}`}>{k.value}</p>
              <p className="text-[10px] text-slate-400">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filters.mois ?? ""}
            onChange={(e) => applyFilter("mois", e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
          >
            <option value="">Tous les mois</option>
            {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Destination, N° BL, tracteur..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 inline-block" /> Achat SIR</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white dark:bg-slate-800 border border-slate-200 inline-block" /> BL IVORY</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-100 dark:bg-violet-900/40 border border-violet-300 inline-block" /> Relevé GESTOCI</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="text-xs border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 dark:bg-slate-900 text-white">
              {/* Group headers */}
              <th rowSpan={2} className="px-2 py-2 text-left font-semibold border border-slate-600 sticky left-0 bg-slate-700 dark:bg-slate-900 z-20 min-w-[90px]">Date</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-emerald-800">Achat SIR (M15)</th>
              <th colSpan={5} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-slate-700">Bon de Livraison IVORY</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-blue-800">Qté Ambiant</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-blue-900">Qté M15</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-slate-600">Facteur corr.</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-slate-500">Écart charg.</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-teal-800">Stock Théorique</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-violet-800">Relevé GESTOCI</th>
              <th colSpan={2} className="px-2 py-1 text-center font-semibold border border-slate-600 bg-rose-800">Écart GESTOCI</th>
            </tr>
            <tr className="bg-slate-600 dark:bg-slate-800 text-white text-[11px]">
              <th className="px-2 py-1 text-right border border-slate-500 bg-emerald-700 min-w-[80px]">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-emerald-700 min-w-[80px]">Gasoil</th>
              <th className="px-2 py-1 text-left border border-slate-500 min-w-[120px]">N° BL IVORY</th>
              <th className="px-2 py-1 text-left border border-slate-500 min-w-[70px]">N° BEP</th>
              <th className="px-2 py-1 text-left border border-slate-500 min-w-[80px]">Dt Charg.</th>
              <th className="px-2 py-1 text-left border border-slate-500 min-w-[90px]">Tracteur</th>
              <th className="px-2 py-1 text-left border border-slate-500 min-w-[90px]">Citerne</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-blue-800 min-w-[70px]">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-blue-800 min-w-[70px]">Gasoil</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-blue-900 min-w-[75px]">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-blue-900 min-w-[75px]">Gasoil</th>
              <th className="px-2 py-1 text-right border border-slate-500 min-w-[60px]">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 min-w-[60px]">Gasoil</th>
              <th className="px-2 py-1 text-right border border-slate-500 min-w-[60px]">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 min-w-[60px]">Gasoil</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-teal-800 min-w-[90px] font-bold">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-teal-800 min-w-[90px] font-bold">Gasoil</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-violet-700 min-w-[90px]">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-violet-700 min-w-[90px]">Gasoil</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-rose-700 min-w-[70px]">Super</th>
              <th className="px-2 py-1 text-right border border-slate-500 bg-rose-700 min-w-[70px]">Gasoil</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isInitial = row.type === "INITIAL";
              const isAchat = row.type === "ACHAT";
              const isBL = row.type === "BL";
              const isReading = row.type === "READING";

              const bg = isInitial
                ? "bg-slate-100 dark:bg-slate-700 font-semibold"
                : isAchat
                ? "bg-emerald-50 dark:bg-emerald-900/20"
                : isReading
                ? "bg-violet-50 dark:bg-violet-900/20"
                : i % 2 === 0
                ? "bg-white dark:bg-slate-900"
                : "bg-slate-50 dark:bg-slate-800/60";

              const dateStr = row.date
                ? new Date(row.date).toLocaleDateString("fr-CI", { day: "2-digit", month: "2-digit", year: "2-digit" })
                : "";
              const loadingStr = row.loadingDate
                ? new Date(row.loadingDate).toLocaleDateString("fr-CI", { day: "2-digit", month: "2-digit" })
                : "";

              return (
                <tr key={row.id} className={`${bg} hover:brightness-95 transition-all`}>
                  {/* Date */}
                  <td className={`px-2 py-1.5 border border-slate-200 dark:border-slate-700 sticky left-0 z-10 ${bg} whitespace-nowrap`}>
                    {isInitial ? (
                      <span className="text-slate-500 italic text-[11px]">Fin Déc 2025</span>
                    ) : isReading ? (
                      <span className="text-violet-700 dark:text-violet-300 font-medium">{dateStr}</span>
                    ) : isAchat ? (
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">{dateStr}</span>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200">{dateStr}</span>
                    )}
                  </td>

                  {/* Achats SIR */}
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums">
                    {isAchat && row.achatSuper ? <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{fmt(row.achatSuper)}</span> : ""}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums">
                    {isAchat && row.achatGasoil ? <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{fmt(row.achatGasoil)}</span> : ""}
                  </td>

                  {/* BL info */}
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {isBL ? (
                      <span className="text-blue-700 dark:text-blue-300">{row.blNumber ?? "—"}</span>
                    ) : isReading ? (
                      <span className="text-violet-600 dark:text-violet-300 italic text-[11px] font-sans">Relevé GESTOCI</span>
                    ) : isInitial ? (
                      <span className="text-slate-500 italic text-[11px] font-sans">Stock initial</span>
                    ) : isAchat ? (
                      <span className="text-emerald-600 dark:text-emerald-300 italic text-[11px] font-sans">Achat SIR</span>
                    ) : ""}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 tabular-nums">
                    {row.bepNumber}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {loadingStr}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[100px] truncate">
                    <span title={row.tracteur}>{row.tracteur}</span>
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[100px] truncate">
                    <span title={row.citerne}>{row.citerne}</span>
                  </td>

                  {/* Destination spans across if not BL */}
                  {isBL ? (
                    <>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        {fmt(row.qtyAmbiSuper)}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        {fmt(row.qtyAmbiGasoil)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700" />
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700" />
                    </>
                  )}

                  {/* Qty M15 */}
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">
                    {isBL ? fmt(row.qtyM15Super) : ""}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">
                    {isBL ? fmt(row.qtyM15Gasoil) : ""}
                  </td>

                  {/* Facteurs */}
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-slate-500 dark:text-slate-400 text-[11px]">
                    {isBL ? fmtFact(row.facteurSuper) : ""}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-slate-500 dark:text-slate-400 text-[11px]">
                    {isBL ? fmtFact(row.facteurGasoil) : ""}
                  </td>

                  {/* Écart chargement */}
                  <td className={`px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-[11px] ${ecartColor(isBL ? row.ecartSuper : undefined)}`}>
                    {isBL && row.ecartSuper != null && row.qtyM15Super ? fmt(row.ecartSuper) : ""}
                  </td>
                  <td className={`px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-[11px] ${ecartColor(isBL ? row.ecartGasoil : undefined)}`}>
                    {isBL && row.ecartGasoil != null && row.qtyM15Gasoil ? fmt(row.ecartGasoil) : ""}
                  </td>

                  {/* Stocks théoriques */}
                  <td className={`px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums font-bold ${row.stockTheoSuper < 0 ? "text-red-600" : row.stockTheoSuper < 20000 ? "text-amber-600" : "text-teal-700 dark:text-teal-300"}`}>
                    {fmt(row.stockTheoSuper)}
                  </td>
                  <td className={`px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums font-bold ${row.stockTheoGasoil < 0 ? "text-red-600" : row.stockTheoGasoil < 20000 ? "text-amber-600" : "text-teal-700 dark:text-teal-300"}`}>
                    {fmt(row.stockTheoGasoil)}
                  </td>

                  {/* Stocks GESTOCI */}
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-violet-700 dark:text-violet-300">
                    {row.stockGestociSuper != null ? fmt(row.stockGestociSuper) : ""}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-violet-700 dark:text-violet-300">
                    {row.stockGestociGasoil != null ? fmt(row.stockGestociGasoil) : ""}
                  </td>

                  {/* Écarts GESTOCI */}
                  <td className={`px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-[11px] ${ecartColor(row.ecartGestociSuper)}`}>
                    {row.ecartGestociSuper != null ? (row.ecartGestociSuper > 0 ? "+" : "") + fmt(row.ecartGestociSuper) : ""}
                  </td>
                  <td className={`px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right tabular-nums text-[11px] ${ecartColor(row.ecartGestociGasoil)}`}>
                    {row.ecartGestociGasoil != null ? (row.ecartGestociGasoil > 0 ? "+" : "") + fmt(row.ecartGestociGasoil) : ""}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr className="bg-slate-700 dark:bg-slate-900 text-white font-bold text-[11px] sticky bottom-0 z-10">
              <td className="px-2 py-2 border border-slate-600 sticky left-0 bg-slate-700 dark:bg-slate-900">TOTAUX</td>
              <td className="px-2 py-2 border border-slate-600 text-right tabular-nums text-emerald-300">{fmt(totals.achatSuper)}</td>
              <td className="px-2 py-2 border border-slate-600 text-right tabular-nums text-emerald-300">{fmt(totals.achatGasoil)}</td>
              <td colSpan={8} className="border border-slate-600" />
              <td className="px-2 py-2 border border-slate-600 text-right tabular-nums text-blue-300">{fmt(totals.m15Super)}</td>
              <td className="px-2 py-2 border border-slate-600 text-right tabular-nums text-blue-300">{fmt(totals.m15Gasoil)}</td>
              <td colSpan={4} className="border border-slate-600" />
              <td className="px-2 py-2 border border-slate-600 text-right tabular-nums text-teal-300">{fmt(totals.balanceSuper)}</td>
              <td className="px-2 py-2 border border-slate-600 text-right tabular-nums text-teal-300">{fmt(totals.balanceGasoil)}</td>
              <td colSpan={4} className="border border-slate-600" />
            </tr>
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-400">
            Aucune donnée pour ces filtres.
          </div>
        )}
      </div>
    </div>
  );
}
