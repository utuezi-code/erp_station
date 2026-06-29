import { db } from "@/lib/db";

interface AuditParams {
  userId?: string;
  entity: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VALIDATE" | "REJECT";
  before?: object;
  after?: object;
  ipAddress?: string;
}

export async function writeAuditLog(params: AuditParams) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      before: params.before as any,
      after: params.after as any,
      ipAddress: params.ipAddress,
    },
  });
}
