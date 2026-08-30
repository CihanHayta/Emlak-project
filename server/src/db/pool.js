// server/src/db/pool.js
//
// TEK-KİRACILI mimari: bu deployment sadece BİR müşteriye ait, sadece BİR
// veritabanına bağlanır — `controlPlane.pool.js` + `tenantPool.js` +
// `tenantRegistry.js` (çok-kiracılı bir sunucunun aynı anda N farklı
// veritabanına dinamik bağlanması için tasarlanmıştı) TAMAMEN KALDIRILDI,
// yerine bu tek dosya geldi. Lazy singleton — ilk gerçek sorguda kurulur.
import pg from "pg";
import { registerNumericTypeParsers } from "./typeParsers.js";

registerNumericTypeParsers();

let poolPromise = null;

function buildPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("getPool: DATABASE_URL ayarlanmamış. server/.env.example'a bakın.");
  }
  const pool = new pg.Pool({ connectionString, max: 10 });
  pool.on("error", (error) => {
    // eslint-disable-next-line no-console -- logger.js ile circular import'a girmemek için bilerek kullanılmadı
    console.error("[db pool] beklenmeyen boşta bağlantı hatası:", error.message);
  });
  return pool;
}

export function getPool() {
  if (!poolPromise) poolPromise = Promise.resolve(buildPool());
  return poolPromise;
}

/** Sadece testler/graceful shutdown için — normal istek akışında çağrılmaz. */
export async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = null;
  await pool.end();
}
