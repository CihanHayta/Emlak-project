// server/src/repositories/funnel.repository.js
import { BaseRepository } from "./base.repository.js";

class FunnelRepository extends BaseRepository {
  constructor() {
    super("funnels");
  }

  /** Genel (public) sayfa render'ı için — slug'a göre bulur, tenant kapsamı yine korunur. */
  async findBySlug(context, slug) {
    const query = await this.scopedQuery(context);
    const snapshot = await query.where("slug", "==", slug).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
}

export const funnelRepository = new FunnelRepository();
