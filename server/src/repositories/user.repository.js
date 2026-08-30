// server/src/repositories/user.repository.js
import { BaseRepository } from "./base.repository.js";

class UserRepository extends BaseRepository {
  constructor() {
    super("users");
  }

  /** Doküman ID'si Firebase Auth uid'idir — otomatik üretilmez, dışarıdan gelir. */
  async createWithUid(context, uid, data) {
    return this.createWithId(context, uid, data);
  }

  async findByUid(context, uid) {
    return this.findById(context, uid);
  }

  /**
   * Kullanıcı hesapları soft-delete DEĞİL, gerçek (hard) delete kullanır —
   * diğer koleksiyonlardan (customers/leads/appointments) farklı olarak.
   * Sebep: Firebase Auth hesabı da her zaman aynı anda tamamen silinir (bkz.
   * user.service.js#deleteTeamMember); Firestore'da "silinmiş" görünüp
   * Auth'ta yaşamaya devam eden ya da tam tersi bir kayıt bırakmamak için
   * ikisi de kalıcı silinir, biri diğerinden "geride" kalmaz.
   */
  async hardDelete(context, id) {
    const ref = await this.scopedDocRef(context, id);
    await ref.delete();
  }
}

export const userRepository = new UserRepository();
