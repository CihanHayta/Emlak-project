// server/src/models/base.model.js

/**
 * Yeni bir doküman yazılırken ortak alanları ekler. `deletedAt` her zaman
 * AÇIKÇA `null` olarak set edilir (undefined değil) — repository sorguları
 * `deletedAt == null` eşitliğiyle filtrelediği için bu alanın gerçekten var
 * olması şart, yoksa o doküman hiçbir listede görünmez.
 */
export function withCreateFields(data, { actorUserId } = {}) {
  const now = new Date();
  return {
    ...data,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: actorUserId ?? null,
    updatedBy: actorUserId ?? null,
  };
}

export function withUpdateFields(updates, { actorUserId } = {}) {
  return {
    ...updates,
    updatedAt: new Date(),
    updatedBy: actorUserId ?? null,
  };
}
