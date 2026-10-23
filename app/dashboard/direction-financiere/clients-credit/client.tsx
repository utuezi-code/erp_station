"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, TableProperties } from "lucide-react";
import {
  createClientCredit,
  saveClientCreditSoldeInitial,
  addClientCreditLivraison,
  addMouvementClientCredit,
  toggleClientCreditActive,
} from "./actions";
import { saveConditionCarburant, saveContratClient } from "./charges-actions";
import { MouvementCompteType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConditionCarb {
  fuelId: string;
  fuelName: string;
  fuelCode: string;
  puPompe: number;
  remise: number;
  stockActuel: number;
  salePrice: number;
}

export interface ClientCreditRow {
  id: string;
  nom: string;
  code: string | null;
  telephone: string | null;
  active: boolean;
  delaiReglement: string | null;
  typeContrat: string | null;
  creditStation: number;
  soldeInitial: number;
  totalLivraisons: number;
  totalPaiements: number;
  soldeCourant: number;
  derniereLivraison: string | null;
  volParFuel: Record<string, number>;
  conditions: ConditionCarb[];
}

export interface FuelOption {
  id: string;
  name: string;
  code: string;
  salePrice: number;
}

interface Props {
  clients: ClientCreditRow[];
  fuels: FuelOption[];
  annee: number;
}

const TYPE_LABELS: Record<MouvementCompteType, string> = {
  NOTE_DEBIT: "Note de débit",
  NOTE_CREDIT: "Note de crédit",
  REMISE: "Remise",
  AUTRE_CHARGE: "Autre charge",
  AUTRE_CREDIT: "Autre crédit",
};

function fmt(v: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createClientCredit(fd);
      if (res.success) { onCreated(); onClose(); }
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Nouveau client crédit</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input name="nom" required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input name="code" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input name="telephone" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input name="adresse" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
              {pending ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddLivraisonModal({ clientId, fuels, onClose, onDone }: { clientId: string; fuels: FuelOption[]; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedFuel, setSelectedFuel] = useState(fuels[0]?.id ?? "");
  const [quantite, setQuantite] = useState("");
  const [remise, setRemise] = useState("0");
  const fuel = fuels.find((f) => f.id === selectedFuel);
  const puPompe = fuel?.salePrice ?? 0;
  const puVente = Math.max(0, puPompe - Number(remise || 0));
  const montant = Number(quantite || 0) * puVente;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("clientId", clientId);
    fd.set("puPompe", String(puPompe));
    fd.set("puVente", String(puVente));
    fd.set("montant", String(montant));
    startTransition(async () => {
      const res = await addClientCreditLivraison(fd);
      if (res.success) { onDone(); onClose(); }
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Ajouter une livraison</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Carburant *</label>
            <select name="fuelId" value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
              {fuels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantité (L) *</label>
            <input name="quantite" type="number" step="0.001" min="0" required value={quantite} onChange={(e) => setQuantite(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Remise (FCFA/L)</label>
            <input name="remise" type="number" step="0.01" min="0" value={remise} onChange={(e) => setRemise(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>PU pompe :</span><span>{fmt(puPompe)} FCFA/L</span></div>
            <div className="flex justify-between"><span>PU vente :</span><span>{fmt(puVente)} FCFA/L</span></div>
            <div className="flex justify-between font-semibold"><span>Montant :</span><span>{fmt(montant)} FCFA</span></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">N° BL</label>
            <input name="blNumber" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fournisseur</label>
            <input name="fournisseur" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
            <button type="submit" disabled={pending || montant <= 0} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
              {pending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const BANQUES = ["AFG", "BACI", "BOA", "ECOBANK", "SGBCI", "SIB", "UBA", "NSIA", "Autre"];

function AddVersementModal({ clientId, clientNom, soldeCourant, onClose, onDone }: { clientId: string; clientNom: string; soldeCourant: number; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [montant, setMontant] = useState("");
  const [modePaiement, setModePaiement] = useState<"especes" | "cheque" | "virement">("cheque");
  const resteApres = soldeCourant - Number(montant || 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("clientId", clientId);
    fd.set("type", "NOTE_CREDIT");
    const banque = fd.get("banque") as string;
    const mode = modePaiement === "especes" ? "Espèces" : modePaiement === "cheque" ? "Chèque" : "Virement";
    fd.set("libelle", `Versement ${mode}${banque ? ` - ${banque}` : ""}`);
    startTransition(async () => {
      const res = await addMouvementClientCredit(fd);
      if (res.success) { onDone(); onClose(); }
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Enregistrer un versement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{clientNom} — solde : <span className="font-medium text-red-600">{fmt(soldeCourant)} FCFA</span></p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mode de paiement *</label>
            <div className="flex gap-2">
              {(["cheque", "virement", "especes"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setModePaiement(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${modePaiement === m ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  {m === "cheque" ? "Chèque" : m === "virement" ? "Virement" : "Espèces"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Montant (FCFA) *</label>
            <input name="montant" type="number" step="1" min="1" required value={montant} onChange={(e) => setMontant(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 text-right" />
          </div>
          {modePaiement !== "especes" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">{modePaiement === "cheque" ? "N° Chèque" : "N° Ordre de virement"}</label>
                <input name="reference" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Banque *</label>
                <select name="banque" required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
                  <option value="">Choisir...</option>
                  {BANQUES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </>
          )}
          {modePaiement === "especes" && <input type="hidden" name="banque" value="" />}
          {Number(montant) > 0 && (
            <div className={`rounded-lg p-3 text-sm ${resteApres <= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-orange-50 dark:bg-orange-900/20"}`}>
              <div className="flex justify-between"><span>Solde actuel</span><span className="font-medium text-red-600">{fmt(soldeCourant)} FCFA</span></div>
              <div className="flex justify-between"><span>Versement</span><span className="font-medium text-green-600">− {fmt(Number(montant))} FCFA</span></div>
              <div className="flex justify-between font-semibold border-t mt-1 pt-1">
                <span>Reste dû</span>
                <span className={resteApres <= 0 ? "text-green-700" : "text-orange-700"}>{fmt(Math.max(0, resteApres))} FCFA</span>
              </div>
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
            <button type="submit" disabled={pending || !montant} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50">
              {pending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMouvementModal({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("clientId", clientId);
    startTransition(async () => {
      const res = await addMouvementClientCredit(fd);
      if (res.success) { onDone(); onClose(); }
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Autre mouvement</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select name="type" required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
              {Object.entries(TYPE_LABELS).filter(([k]) => k !== "NOTE_CREDIT").map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Montant (FCFA) *</label>
            <input name="montant" type="number" step="1" required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Libellé *</label>
            <input name="libelle" required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Référence</label>
            <input name="reference" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
              {pending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SoldeInitialModal({ client, annee, currentSolde, onClose, onDone }: { client: ClientCreditRow; annee: number; currentSolde: number; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [solde, setSolde] = useState(String(currentSolde));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveClientCreditSoldeInitial(client.id, annee, Number(solde));
      if (res.success) { onDone(); onClose(); }
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-1">Solde initial {annee}</h2>
        <p className="text-sm text-gray-500 mb-4">{client.nom}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Solde de report (FCFA)</label>
            <input type="number" step="1" value={solde} onChange={(e) => setSolde(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
            <p className="text-xs text-gray-500 mt-1">Positif = le client doit de l&apos;argent</p>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
              {pending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Condition carburant modal ────────────────────────────────────────────────

function ConditionModal({
  client,
  fuels,
  onClose,
  onDone,
}: {
  client: ClientCreditRow;
  fuels: FuelOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedFuel, setSelectedFuel] = useState(fuels[0]?.id ?? "");
  const existing = client.conditions.find((c) => c.fuelId === selectedFuel);

  function handleCondition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("clientId", client.id);
    fd.set("fuelId", selectedFuel);
    startTransition(async () => {
      const res = await saveConditionCarburant(fd);
      if (res.success) { onDone(); onClose(); }
      else setError(res.error ?? "Erreur");
    });
  }

  function handleContrat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("clientId", client.id);
    startTransition(async () => {
      const res = await saveContratClient(fd);
      if (res.success) { onDone(); onClose(); }
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conditions — {client.nom}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Contrat */}
        <form onSubmit={handleContrat} className="mb-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Conditions générales</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Délais règlement</label>
              <input name="delaiReglement" defaultValue={client.delaiReglement ?? ""} placeholder="Ex: LUNDI/JEUDI"
                className="w-full border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Type contrat</label>
              <select name="typeContrat" defaultValue={client.typeContrat ?? ""}
                className="w-full border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700">
                <option value="">—</option>
                <option value="GL">Gérance libre (GL)</option>
                <option value="LOCATION">Location</option>
                <option value="DIRECT">Station directe</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Crédit station (FCFA)</label>
              <input name="creditStation" type="number" step="1" min="0" defaultValue={client.creditStation || ""}
                className="w-full border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 text-right" />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button type="submit" disabled={pending} className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg disabled:opacity-50">
              {pending ? "..." : "Sauvegarder contrat"}
            </button>
          </div>
        </form>

        {/* Conditions par carburant */}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Conditions par carburant</p>
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1">Carburant</label>
          <select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700">
            {fuels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <form key={selectedFuel} onSubmit={handleCondition} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Remise (FCFA/L)</label>
              <input name="remise" type="number" step="0.01" min="0" defaultValue={existing?.remise ?? 0}
                className="w-full border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 text-right" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Stock actuel (L)</label>
              <input name="stockActuel" type="number" step="0.001" min="0" defaultValue={existing?.stockActuel ?? 0}
                className="w-full border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 text-right" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">PU pompe (FCFA/L)</label>
              <input name="puPompe" type="number" step="0.01" min="0" defaultValue={existing?.puPompe ?? fuels.find(f => f.id === selectedFuel)?.salePrice ?? 0}
                className="w-full border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 text-right" />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded-lg text-sm">Annuler</button>
            <button type="submit" disabled={pending} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
              {pending ? "..." : "Sauvegarder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Client Detail Panel ───────────────────────────────────────────────────────

function ClientDetailPanel({ client, fuels, annee, onRefresh }: { client: ClientCreditRow; fuels: FuelOption[]; annee: number; onRefresh: () => void }) {
  const [showVersement, setShowVersement] = useState(false);
  const [showLivraison, setShowLivraison] = useState(false);
  const [showMouvement, setShowMouvement] = useState(false);
  const [showSoldeInit, setShowSoldeInit] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500">Solde initial</p>
          <p className="font-semibold text-sm">{fmt(client.soldeInitial)} FCFA</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total livraisons</p>
          <p className="font-semibold text-sm text-orange-700 dark:text-orange-300">{fmt(client.totalLivraisons)} FCFA</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total paiements</p>
          <p className="font-semibold text-sm text-green-700 dark:text-green-300">{fmt(client.totalPaiements)} FCFA</p>
        </div>
        <div className={`rounded-lg p-3 ${client.soldeCourant > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
          <p className="text-xs text-gray-500">Solde courant</p>
          <p className={`font-bold text-sm ${client.soldeCourant > 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
            {fmt(client.soldeCourant)} FCFA
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowVersement(true)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm">
          ↓ Versement client
        </button>
        <button onClick={() => setShowLivraison(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Livraison</button>
        <button onClick={() => setShowMouvement(true)} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Autre mouvement</button>
        <button onClick={() => setShowSoldeInit(true)} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Solde initial {annee}</button>
      </div>

      {showVersement && <AddVersementModal clientId={client.id} clientNom={client.nom} soldeCourant={client.soldeCourant} onClose={() => setShowVersement(false)} onDone={onRefresh} />}
      {showLivraison && <AddLivraisonModal clientId={client.id} fuels={fuels} onClose={() => setShowLivraison(false)} onDone={onRefresh} />}
      {showMouvement && <AddMouvementModal clientId={client.id} onClose={() => setShowMouvement(false)} onDone={onRefresh} />}
      {showSoldeInit && <SoldeInitialModal client={client} annee={annee} currentSolde={client.soldeInitial} onClose={() => setShowSoldeInit(false)} onDone={onRefresh} />}

      <p className="text-xs text-gray-400">Rechargez la page pour voir l&apos;historique complet après enregistrement.</p>
    </div>
  );
}

// ─── Charges Tab ──────────────────────────────────────────────────────────────

function ChargesTab({ clients, fuels, onRefresh }: { clients: ClientCreditRow[]; fuels: FuelOption[]; onRefresh: () => void }) {
  const [editingClient, setEditingClient] = useState<ClientCreditRow | null>(null);

  // Find SP and GO fuel IDs by code
  const spFuel = fuels.find((f) => f.code?.toUpperCase().includes("SP") || f.name?.toUpperCase().includes("SUPER"));
  const goFuel = fuels.find((f) => f.code?.toUpperCase().includes("GO") || f.name?.toUpperCase().includes("GASOIL") || f.name?.toUpperCase().includes("GAS OIL"));

  const activeClients = clients.filter((c) => c.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Conditions tarifaires et stocks par client — mise à jour manuelle</p>
        <Link href="/dashboard/direction-financiere/clients-credit/consolider"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          <TableProperties className="w-4 h-4" /> Vue consolidée
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white text-xs uppercase">
              <th className="px-3 py-2.5 text-left sticky left-0 bg-gray-800 z-10">CLIENT</th>
              <th className="px-3 py-2.5 text-center">DÉLAIS</th>
              <th className="px-3 py-2.5 text-center">TYPE</th>
              <th className="px-3 py-2.5 text-right">REMISE SP<br/><span className="font-normal normal-case">(FCFA/L)</span></th>
              <th className="px-3 py-2.5 text-right">REMISE GO<br/><span className="font-normal normal-case">(FCFA/L)</span></th>
              <th className="px-3 py-2.5 text-right">STOCK SP<br/><span className="font-normal normal-case">(L)</span></th>
              <th className="px-3 py-2.5 text-right">STOCK GO<br/><span className="font-normal normal-case">(L)</span></th>
              <th className="px-3 py-2.5 text-right">PU SP<br/><span className="font-normal normal-case">(FCFA/L)</span></th>
              <th className="px-3 py-2.5 text-right">PU GO<br/><span className="font-normal normal-case">(FCFA/L)</span></th>
              <th className="px-3 py-2.5 text-right">MT SP<br/><span className="font-normal normal-case">(FCFA)</span></th>
              <th className="px-3 py-2.5 text-right">MT GO<br/><span className="font-normal normal-case">(FCFA)</span></th>
              <th className="px-3 py-2.5 text-right">CRÉDIT STATION<br/><span className="font-normal normal-case">(FCFA)</span></th>
              <th className="px-3 py-2.5 text-right bg-yellow-700">VALEUR STOCK<br/><span className="font-normal normal-case">(FCFA)</span></th>
              <th className="px-3 py-2.5 text-right bg-blue-800">ESPÈCE THÉO.<br/><span className="font-normal normal-case">(FCFA)</span></th>
              <th className="px-3 py-2.5 text-center">SOLDE</th>
              <th className="px-3 py-2.5 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {/* Totaux */}
            <tr className="bg-gray-100 dark:bg-gray-800 font-semibold text-xs border-b-2 border-gray-300 dark:border-gray-600">
              <td className="px-3 py-2 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">TOTAUX</td>
              <td colSpan={2}></td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => { const cc = c.conditions.find(x => x.fuelId === spFuel?.id); return s + (cc?.remise ?? 0); }, 0) / Math.max(activeClients.length, 1))}</td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => { const cc = c.conditions.find(x => x.fuelId === goFuel?.id); return s + (cc?.remise ?? 0); }, 0) / Math.max(activeClients.length, 1))}</td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => { const cc = c.conditions.find(x => x.fuelId === spFuel?.id); return s + (cc?.stockActuel ?? 0); }, 0))}</td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => { const cc = c.conditions.find(x => x.fuelId === goFuel?.id); return s + (cc?.stockActuel ?? 0); }, 0))}</td>
              <td colSpan={2}></td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => { const sp = c.conditions.find(x => x.fuelId === spFuel?.id); return s + (sp ? sp.stockActuel * (sp.puPompe - sp.remise) : 0); }, 0))}</td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => { const go = c.conditions.find(x => x.fuelId === goFuel?.id); return s + (go ? go.stockActuel * (go.puPompe - go.remise) : 0); }, 0))}</td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => s + c.creditStation, 0))}</td>
              <td className="px-3 py-2 text-right bg-yellow-50 dark:bg-yellow-900/20">
                {fmt(activeClients.reduce((s, c) => {
                  const sp = c.conditions.find(x => x.fuelId === spFuel?.id);
                  const go = c.conditions.find(x => x.fuelId === goFuel?.id);
                  return s + (sp ? sp.stockActuel * (sp.puPompe - sp.remise) : 0) + (go ? go.stockActuel * (go.puPompe - go.remise) : 0);
                }, 0))}
              </td>
              <td className="px-3 py-2 text-right bg-blue-50 dark:bg-blue-900/20">
                {fmt(activeClients.reduce((s, c) => {
                  const sp = c.conditions.find(x => x.fuelId === spFuel?.id);
                  const go = c.conditions.find(x => x.fuelId === goFuel?.id);
                  const valStock = (sp ? sp.stockActuel * (sp.puPompe - sp.remise) : 0) + (go ? go.stockActuel * (go.puPompe - go.remise) : 0);
                  return s + (c.soldeCourant - (c.creditStation + valStock));
                }, 0))}
              </td>
              <td className="px-3 py-2 text-right">{fmt(activeClients.reduce((s, c) => s + c.soldeCourant, 0))}</td>
              <td></td>
            </tr>

            {activeClients.map((c, idx) => {
              const spCond = c.conditions.find((x) => x.fuelId === spFuel?.id);
              const goCond = c.conditions.find((x) => x.fuelId === goFuel?.id);
              const mtSP = spCond ? spCond.stockActuel * (spCond.puPompe - spCond.remise) : 0;
              const mtGO = goCond ? goCond.stockActuel * (goCond.puPompe - goCond.remise) : 0;
              const valeurStock = mtSP + mtGO;
              const especeTheo = c.soldeCourant - (c.creditStation + valeurStock);

              return (
                <tr key={c.id} className={`border-b border-gray-100 dark:border-gray-800 ${idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-900/30"} hover:bg-blue-50/50 dark:hover:bg-blue-900/10`}>
                  <td className="px-3 py-2 sticky left-0 bg-white dark:bg-gray-900 z-10 font-medium">
                    {c.nom}
                    {c.code && <span className="text-xs text-gray-400 ml-1">({c.code})</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">{c.delaiReglement ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {c.typeContrat ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        c.typeContrat === "GL" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                        c.typeContrat === "LOCATION" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30" :
                        c.typeContrat === "DIRECT" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                        "bg-gray-100 text-gray-600 dark:bg-gray-800"
                      }`}>{c.typeContrat}</span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{spCond ? fmt(spCond.remise) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{goCond ? fmt(goCond.remise) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{spCond?.stockActuel ? fmt(spCond.stockActuel) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{goCond?.stockActuel ? fmt(goCond.stockActuel) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{spCond?.puPompe ? fmt(spCond.puPompe) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{goCond?.puPompe ? fmt(goCond.puPompe) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{mtSP > 0 ? fmt(mtSP) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{mtGO > 0 ? fmt(mtGO) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.creditStation > 0 ? fmt(c.creditStation) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums bg-yellow-50 dark:bg-yellow-900/10 font-medium">{valeurStock > 0 ? fmt(valeurStock) : "—"}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium bg-blue-50 dark:bg-blue-900/10 ${especeTheo < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
                    {fmt(especeTheo)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${c.soldeCourant > 0 ? "text-red-600" : "text-green-600"}`}>
                    {fmt(c.soldeCourant)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => setEditingClient(c)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                      Modifier
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingClient && (
        <ConditionModal client={editingClient} fuels={fuels} onClose={() => setEditingClient(null)} onDone={onRefresh} />
      )}
    </div>
  );
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────

function ClientsTab({ clients, fuels, annee, onRefresh, onCreateOpen }: { clients: ClientCreditRow[]; fuels: FuelOption[]; annee: number; onRefresh: () => void; onCreateOpen: () => void }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const displayed = clients.filter((c) => showInactive || c.active);
  const selected = clients.find((c) => c.id === selectedClientId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Afficher inactifs
          </label>
          <span className="text-xs text-gray-400">{displayed.length} client(s)</span>
        </div>
        <button onClick={onCreateOpen} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Nouveau client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {displayed.length === 0 && (
            <p className="text-gray-500 text-sm p-4 border rounded-lg">Aucun client trouvé.</p>
          )}
          {displayed.map((client) => (
            <div key={client.id} onClick={() => setSelectedClientId(client.id === selectedClientId ? null : client.id)}
              className={`border rounded-xl p-4 cursor-pointer transition-colors ${selectedClientId === client.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "hover:border-gray-300 dark:hover:border-gray-600"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{client.nom}</p>
                  {client.code && <p className="text-xs text-gray-500">{client.code}</p>}
                  {client.telephone && <p className="text-xs text-gray-500">{client.telephone}</p>}
                  {client.delaiReglement && <p className="text-xs text-blue-600 dark:text-blue-400">{client.delaiReglement}{client.typeContrat ? ` · ${client.typeContrat}` : ""}</p>}
                </div>
                <div className="text-right flex flex-col items-end gap-0.5">
                  <p className={`font-bold text-base ${client.soldeCourant > 0 ? "text-red-600" : "text-green-600"}`}>
                    {fmt(client.soldeCourant)} FCFA
                  </p>
                  <p className="text-xs text-gray-400">{client.soldeCourant > 0 ? "Doit payer" : "À jour"}</p>
                  {!client.active && <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5">Inactif</span>}
                  <Link href={`/dashboard/direction-financiere/clients-credit/${client.id}`} onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-0.5">
                    <ExternalLink className="w-3 h-3" /> Détail & PDF
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div>
          {selected ? (
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{selected.nom}</h2>
                <button onClick={() => setSelectedClientId(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <ClientDetailPanel client={selected} fuels={fuels} annee={annee} onRefresh={onRefresh} />
            </div>
          ) : (
            <div className="border rounded-xl p-8 text-center text-gray-400">
              <p className="text-sm">Sélectionnez un client pour voir le détail</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientsCreditClient({ clients: initialClients, fuels, annee }: Props) {
  const [clients, setClients] = useState(initialClients);
  const [activeTab, setActiveTab] = useState<"clients" | "charges">("clients");
  const [showCreate, setShowCreate] = useState(false);

  function handleRefresh() {
    window.location.reload();
  }

  const tabs = [
    { key: "clients", label: "Clients" },
    { key: "charges", label: "Charges & Conditions" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Clients crédit carburant</h1>
          <p className="text-sm text-gray-500">{clients.filter(c => c.active).length} client(s) actifs — {annee}</p>
        </div>
        <Link href="/dashboard/direction-financiere/clients-credit/consolider"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium">
          <TableProperties className="w-4 h-4" /> Consolider
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {showCreate && (
        <CreateClientModal onClose={() => setShowCreate(false)} onCreated={handleRefresh} />
      )}

      {activeTab === "clients" && (
        <ClientsTab clients={clients} fuels={fuels} annee={annee} onRefresh={handleRefresh} onCreateOpen={() => setShowCreate(true)} />
      )}
      {activeTab === "charges" && (
        <ChargesTab clients={clients} fuels={fuels} onRefresh={handleRefresh} />
      )}
    </div>
  );
}
