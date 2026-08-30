// server/src/repositories/customer.repository.js
import { BaseRepository } from "./base.repository.js";

class CustomerRepository extends BaseRepository {
  constructor() {
    super("customers");
  }
}

export const customerRepository = new CustomerRepository();
