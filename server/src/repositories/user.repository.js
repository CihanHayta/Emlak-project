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
}

export const userRepository = new UserRepository();
