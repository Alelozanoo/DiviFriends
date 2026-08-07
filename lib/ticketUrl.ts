import { headers } from "next/headers";
import QRCode from "qrcode";

/**
 * La URL pública de la comanda, tal y como la ve el móvil que escanea el QR.
 * Se saca de la petición y no de una variable de entorno para que funcione
 * igual en local, en las previsualizaciones y en el dominio de verdad.
 */
export async function ticketUrl(code: string): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/t/${code}`;
}

/** Fondo transparente: el QR se pinta sobre el papel que le toque. */
export function ticketQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#14100d", light: "#00000000" },
  });
}
