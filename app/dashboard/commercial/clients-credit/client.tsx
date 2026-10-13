"use client";

import { useState, useTransition } from "react";
import {
  createClientCredit,
  saveClientCreditSoldeInitial,
  addClientCreditLivraison,
  addMouvementClientCredit,
  toggleClientCreditActive,
} from "./actions";
import { MouvementCompteType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientCreditRow {
  id: string;
  nom: string;
  code: string | null;
  telephone: string | null;
  active: boolean;
  soldeInitial: number;
  totalLivraisons: number;
  totalPaiements: number;
  soldeCourant: number;
}

export interface FuelOption {
  id: string;
  name: string;
  code: string;
  salePrice: number;
}

export interface LivraisonRow {
  id: string;
  date: string;
  fuelName: string;
  quantite: number;
  montant: number;
  blNumber: string | null;
  fournisseur: string | null;
}

export interface MouvementRow {
  id: string;
  date: string;
  type: MouvementCompteType;
  montant: number;
  libelle: string;
  reference: string | null;
  banque: string | null;
}

export interface ClientDetail {
  client: ClientCreditRow;
  livraisons: LivraisonRow[];
  mouvements: MouvementRow[];
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

// Types qui augmentent la dette (positif)
const TYPE_INCREASES_DEBT: MouvementCompteType[] = ["NOTE_DEBIT", "AUTRE_CHARGE"];

function formatMontant(v: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

// ─── Create Client Modal ───────────────────────────────────────────────────────

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createClientCredit(fd);
      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.error ?? "Erreur");
      }
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Annuler</button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {pending ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Livraison Modal ───────────────────────────────────────────────────────

function AddLivraisonModal({
  clientId,
  fuels,
  onClose,
  onDone,
}: {
  clientId: string;
  fuels: FuelOption[];
  onClose: () => void;
  onDone: () => void;
}) {
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
            <div className="flex justify-between"><span>PU pompe :</span><span>{formatMontant(puPompe)} FCFA/L</span></div>
            <div className="flex justify-between"><span>PU vente :</span><span>{formatMontant(puVente)} FCFA/L</span></div>
            <div className="flex justify-between font-semibold"><span>Montant :</span><span>{formatMontant(montant)} FCFA</span></div>
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Annuler</button>
            <button type="submit" disabled={pending || montant <= 0} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {pending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Mouvement Modal ───────────────────────────────────────────────────────

function AddMouvementModal({
  clientId,
  onClose,
  onDone,
}: {
  clientId: string;
  onClose: () => void;
  onDone: () => void;
}) {
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
        <h2 className="text-lg font-semibold mb-4">Ajouter un mouvement</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select name="type" required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
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
          <div>
            <label className="block text-sm font-medium mb-1">Banque</label>
            <input name="banque" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Annuler</button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {pending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Solde Initial Modal ───────────────────────────────────────────────────────

function SoldeInitialModal({
  client,
  annee,
  currentSolde,
  onClose,
  onDone,
}: {
  client: ClientCreditRow;
  annee: number;
  currentSolde: number;
  onClose: () => void;
  onDone: () => void;
}) {
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Annuler</button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {pending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Client Detail Panel ───────────────────────────────────────────────────────

function ClientDetailPanel({
  client,
  fuels,
  annee,
  onRefresh,
}: {
  client: ClientCreditRow;
  fuels: FuelOption[];
  annee: number;
  onRefresh: () => void;
}) {
  const [showLivraison, setShowLivraison] = useState(false);
  const [showMouvement, setShowMouvement] = useState(false);
  const [showSoldeInit, setShowSoldeInit] = useState(false);
  const [activeTab, setActiveTab] = useState<"livraisons" | "mouvements">("livraisons");

  return (
    <div className="space-y-4">
      {/* Solde summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500">Solde initial</p>
          <p className="font-semibold text-sm">{formatMontant(client.soldeInitial)} FCFA</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total livraisons</p>
          <p className="font-semibold text-sm text-orange-700 dark:text-orange-300">{formatMontant(client.totalLivraisons)} FCFA</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total paiements</p>
          <p className="font-semibold text-sm text-green-700 dark:text-green-300">{formatMontant(client.totalPaiements)} FCFA</p>
        </div>
        <div className={`rounded-lg p-3 ${client.soldeCourant > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
          <p className="text-xs text-gray-500">Solde courant</p>
          <p className={`font-bold text-sm ${client.soldeCourant > 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
            {formatMontant(client.soldeCourant)} FCFA
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowLivraison(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Livraison
        </button>
        <button onClick={() => setShowMouvement(true)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
          + Mouvement
        </button>
        <button onClick={() => setShowSoldeInit(true)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
          Solde initial {annee}
        </button>
      </div>

      {showLivraison && (
        <AddLivraisonModal clientId={client.id} fuels={fuels} onClose={() => setShowLivraison(false)} onDone={onRefresh} />
      )}
      {showMouvement && (
        <AddMouvementModal clientId={client.id} onClose={() => setShowMouvement(false)} onDone={onRefresh} />
      )}
      {showSoldeInit && (
        <SoldeInitialModal client={client} annee={annee} currentSolde={client.soldeInitial} onClose={() => setShowSoldeInit(false)} onDone={onRefresh} />
      )}

      <p className="text-xs text-gray-400">Les détails de livraisons/mouvements se rechargent depuis le serveur. Rechargez la page pour voir l&apos;historique complet.</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientsCreditClient({ clients: initialClients, fuels, annee }: Props) {
  const [clients, setClients] = useState(initialClients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const displayed = clients.filter((c) => showInactive || c.active);
  const selected = clients.find((c) => c.id === selectedClientId) ?? null;

  function handleRefresh() {
    // Trigger server revalidation — simplest is a full reload
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Clients crédit carburant</h1>
          <p className="text-sm text-gray-500">{displayed.length} client(s) — {annee}</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Afficher inactifs
          </label>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            + Nouveau client
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateClientModal onClose={() => setShowCreate(false)} onCreated={handleRefresh} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Liste */}
        <div className="space-y-2">
          {displayed.length === 0 && (
            <p className="text-gray-500 text-sm p-4 border rounded-lg">Aucun client trouvé.</p>
          )}
          {displayed.map((client) => (
            <div
              key={client.id}
              onClick={() => setSelectedClientId(client.id === selectedClientId ? null : client.id)}
              className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                selectedClientId === client.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{client.nom}</p>
                  {client.code && <p className="text-xs text-gray-500">{client.code}</p>}
                  {client.telephone && <p className="text-xs text-gray-500">{client.telephone}</p>}
                </div>
                <div className="text-right">
                  <p className={`font-bold text-base ${client.soldeCourant > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatMontant(client.soldeCourant)} FCFA
                  </p>
                  <p className="text-xs text-gray-400">
                    {client.soldeCourant > 0 ? "Doit payer" : "À jour"}
                  </p>
                  {!client.active && (
                    <span className="inline-block mt-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5">Inactif</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Détail */}
        <div>
          {selected ? (
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{selected.nom}</h2>
                <button onClick={() => setSelectedClientId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
              <ClientDetailPanel client={selected} fuels={fuels} annee={annee} onRefresh={handleRefresh} />
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
