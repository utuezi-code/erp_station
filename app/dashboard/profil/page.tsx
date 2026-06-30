import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfilClient } from "./profil-client";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles et votre mot de passe</p>
      </div>
      <ProfilClient user={{ id: user.id, name: user.name ?? "", email: user.email ?? "", role: user.role }} />
    </div>
  );
}
