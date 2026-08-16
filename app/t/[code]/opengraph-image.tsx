import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { getTicketState } from "@/lib/store";

/**
 * La estampa que sale al pegar el enlace de la mesa en WhatsApp.
 *
 * Sin esto, el enlace llegaba como una línea de texto azul: nadie sabía qué
 * era ni le apetecía tocarlo. Con la estampa llega el nombre de la mesa, lo
 * que costó y de qué app es, que es lo que hace que alguien la abra.
 *
 * El texto va con las tipografías de la casa. Satori no entiende woff2 —que es
 * lo único que deja `next/font`— así que los dos ficheros viven en `assets/`,
 * los dos con licencia OFL, que permite justamente esto.
 */
export const alt = "DiviFriends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
// La mesa cambia de nombre y de gente: la estampa se pinta en cada petición.
export const dynamic = "force-dynamic";

const display = await readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.ttf"));
const figure = await readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-Bold.ttf"));
// El logo de verdad y no un `clip-path`: Satori no recorta formas.
const marca = `data:image/png;base64,${await readFile(join(process.cwd(), "public/logo-marca.png"), "base64")}`;

const PAPEL = "#14100d";
const TINTA = "#f4ece0";
const SUAVE = "#98897a";
const AMBAR = "#e8b04b";
const LINEA = "#3b3229";

function dinero(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const state = await getTicketState(code);

  const nombre = state?.ticket.place?.trim() || "Una cuenta a medias";
  const total = state ? dinero(state.ticket.totalCents) : null;
  const gente = state?.participants.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPEL,
          color: TINTA,
          padding: "72px 80px",
          fontFamily: "Display",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={marca} width={44} height={44} alt="" />
          <div style={{ display: "flex", fontSize: 34, letterSpacing: -1 }}>
            <span>Divi</span>
            <span style={{ color: AMBAR }}>Friends</span>
          </div>
          <div style={{ flex: 1, display: "flex" }} />
          <div
            style={{
              display: "flex",
              fontFamily: "Figure",
              fontSize: 30,
              letterSpacing: 8,
              color: SUAVE,
              border: `2px solid ${LINEA}`,
              borderRadius: 16,
              padding: "12px 22px",
            }}
          >
            {code}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: SUAVE }}>
            PAGA TU PARTE DE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: nombre.length > 26 ? 76 : 100,
              lineHeight: 1.05,
              letterSpacing: -3,
              maxWidth: 1040,
            }}
          >
            {nombre}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
          {total && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 24, letterSpacing: 5, color: SUAVE }}>TOTAL</span>
              <span style={{ fontFamily: "Figure", fontSize: 52, color: AMBAR }}>{total}</span>
            </div>
          )}
          {gente > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 24, letterSpacing: 5, color: SUAVE }}>EN LA MESA</span>
              <span style={{ fontFamily: "Figure", fontSize: 52 }}>{gente}</span>
            </div>
          )}
          <div style={{ flex: 1, display: "flex" }} />
          <div style={{ display: "flex", fontSize: 28, color: SUAVE, paddingBottom: 8 }}>
            Marca lo tuyo y paga tu parte
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, style: "normal", weight: 700 },
        { name: "Figure", data: figure, style: "normal", weight: 700 },
      ],
    },
  );
}
