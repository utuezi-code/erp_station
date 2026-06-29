import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
        <p className="text-gray-500 mb-6">Vous n'avez pas les droits pour accéder à cette page.</p>
        <Link href="/dashboard">
          <Button className="bg-orange-500 hover:bg-orange-600">Retour au tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
