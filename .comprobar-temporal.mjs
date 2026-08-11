import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: "divifriends-2964" });
const db = getFirestore();

const ip = "198.51.100.42";
const hash = createHash("sha256").update(`divifriends:${ip}`).digest("hex").slice(0, 24);
const claves = [`ip_${hash}`, `manual_ip_${hash}`, "global_lecturas"];

for (const clave of claves) {
  const snap = await db.collection("limits").doc(clave).get();
  console.log(`limits/${clave} =`, snap.exists ? JSON.stringify(snap.data()) : "(no existe)");
}

const tickets = await db.collection("tickets").where("place", "==", "Comprobacion de tope").get();
console.log(`\ntickets de prueba: ${tickets.size}`);
tickets.forEach((d) => console.log("  ", d.id, "·", new Date(d.data().createdAt ?? 0).toISOString()));
