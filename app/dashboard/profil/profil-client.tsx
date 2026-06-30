"use client";

import { useState, useTransition } from "react";
import { updateName, updatePassword } from "./actions";
import { toast } from "sonner";
import { UserCircle, Lock, Save } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gérant de station",
  DIRECTION_COMMERCIALE: "Direction Commerciale",
  DIRECTION_FINANCIERE: "Direction Financière",
  DIRECTION_GENERALE: "Direction Générale",
  RESPONSABLE_SERVICE: "Responsable de service",
};

interface ProfilClientProps {
  user: { id: string; name: string; email: string; role: string };
}

export function ProfilClient({ user }: ProfilClientProps) {
  const [name, setName] = useState(user.name);
  const [namePending, startNameTransition] = useTransition();
  const [pwdPending, startPwdTransition] = useTransition();

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startNameTransition(async () => {
      const res = await updateName(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Nom mis à jour avec succès.");
    });
  }

  function handlePwdSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startPwdTransition(async () => {
      const res = await updatePassword(fd);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Mot de passe modifié avec succès.");
        form.reset();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <span className="text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change name */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCircle className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-gray-900">Modifier mon nom</h3>
        </div>
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              required
              minLength={2}
            />
          </div>
          <button
            type="submit"
            disabled={namePending}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Save className="w-4 h-4" />
            {namePending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-gray-900">Changer mon mot de passe</h3>
        </div>
        <form onSubmit={handlePwdSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <input
              name="oldPassword"
              type="password"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              name="newPassword"
              type="password"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              name="confirmPassword"
              type="password"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={pwdPending}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Lock className="w-4 h-4" />
            {pwdPending ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
