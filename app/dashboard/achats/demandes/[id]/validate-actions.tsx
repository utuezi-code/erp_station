"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { validatePurchaseRequest } from "../actions";

export function ValidateActions({ requestId }: { requestId: string }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(approved: boolean) {
    setLoading(true);
    try {
      await validatePurchaseRequest(requestId, approved, comment);
      toast.success(approved ? "Demande validée." : "Demande rejetée.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader><CardTitle className="text-sm text-blue-800">Validation</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Commentaire (optionnel)</Label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <Button className="w-full bg-green-600 hover:bg-green-700" disabled={loading} onClick={() => handle(true)}>
          <CheckCircle className="w-4 h-4 mr-2" /> Valider
        </Button>
        <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50" disabled={loading} onClick={() => handle(false)}>
          <XCircle className="w-4 h-4 mr-2" /> Rejeter
        </Button>
      </CardContent>
    </Card>
  );
}
