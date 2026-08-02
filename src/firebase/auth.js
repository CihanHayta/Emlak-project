/** Authentication servisi — merkezi `firebaseApp`'ten (config.js) türetilir. */
import { getAuth } from "firebase/auth";
import { firebaseApp } from "./config";

export const firebaseAuth = getAuth(firebaseApp);
