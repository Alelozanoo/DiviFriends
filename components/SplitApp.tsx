"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { computeSettlement, totalAfterRemoving } from "@/lib/settle";
import { useStoredParticipant } from "@/lib/useStoredParticipant";
import { useTicketSync } from "@/lib/useTicketSync";
import { leerPerfil, useGlobalProfile } from "@/lib/useGlobalProfile";
import { asientoEn, invitaAMesa, useCuenta, usuarioActual, vinculaAsiento } from "@/lib/cuenta";
import { useSesionLocal } from "@/lib/sesionLocal";
import { RESPONSABLE } from "@/lib/responsable";
import { G } from "./CuentaBoton";
import { processImageToAvatarBase64 } from "@/lib/avatarUpload";
import { money, parseMoney } from "@/lib/format";
import { EV, track, trackOnce } from "@/lib/track";
import { olvidar, recordar } from "@/lib/misDivis";
import {
  guardarPagoPendiente,
  olvidarPagoPendiente,
  usePagoPendiente,
} from "@/lib/pagoPendiente";
import type { Participant, ParticipantBalance, TicketState, Via } from "@/lib/types";
import CuentasSheet from "./CuentasSheet";
import { CobroSheet, PagadorSheet } from "./CobroSheet";
import PagarSheet from "./PagarSheet";
import RecordarSheet from "./RecordarSheet";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import RemoveItemSheet from "./RemoveItemSheet";
import HistorySheet from "./HistorySheet";
import Logo from "./Logo";
import TicketSheet from "./TicketSheet";
import TableSheet from "./TableSheet";
import GuideSheet from "./GuideSheet";
import TicketUploader from "./TicketUploader";
import { Avatar, AvisoTerminos, Progress, Sheet } from "./ui";
import { HeaderMenuSheet } from "./HeaderMenuSheet";
import { CambiarPagadorSheet } from "./CambiarPagadorSheet";
import { EditNameSheet } from "./EditNameSheet";
import { PagadorTicketSheet } from "./PagadorTicketSheet";
import { useT, useLang, rellena } from "@/lib/i18n";
import { inicio } from "@/lib/i18n/config";

export default function SplitApp({
  initial,
  shareUrl,
  qrSvg,
  nuevo = false,
}: {
  initial: TicketState;
  shareUrl: string;
  qrSvg: string;
  /**
   * La mesa acaba de nacer de una foto que todavía se está leyendo.
   *
   * Lo pone el subidor en la URL. Cambia dos cosas: la foto guardada se manda a
   * leer desde aquí —con la persona ya dentro de su sala en vez de mirando una
   * barra en la portada—, y al apuntarse se abre el QR, porque pasar el código
   * es lo único que separa un divi de una calculadora.
   */
  nuevo?: boolean;
}) {
  const code = initial.ticket.id;
  const t = useT();
  const lang = useLang();
  const [cuentasOpen, setCuentasOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showingLog, setShowingLog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [uploadingAnother, setUploadingAnother] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  // Qué línea tiene los mandos a la vista. Sólo una: dos filas abiertas a la
  // vez y la lista deja de leerse de un vistazo, que es para lo que está.
  const [abierta, setAbierta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todo" | "libre" | "mio">("todo");
  // A quién le voy a pagar y cuánto, mientras la hoja está abierta.
  const [pagandoA, setPagandoA] = useState<{ id: string; cents: number } | null>(null);
  /** A quién le estoy recordando lo que me debe, con la hoja del tono abierta. */
  const [recordandoA, setRecordandoA] = useState<ParticipantBalance | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [preguntandoPagador, setPreguntandoPagador] = useState(false);
  /*
    Quien crea la mesa desde una foto ya no pasa por la hoja de entrar, que es
    donde se preguntaba quién puso la tarjeta. Se le pregunta al cerrar el QR,
    y una sola vez: insistir cada vez que abre «Compartir» sería perseguirle.
  */
  const pagadorPreguntado = useRef(false);
  // Qué ticket está esperando que alguien diga quién lo pagó. `receiptId` a
  // null es el ticket original, que no vive en `receipts` sino en el propio doc.
  const [preguntandoTicket, setPreguntandoTicket] = useState<{ receiptId: string | null } | null>(null);

  // Abrir una mesa es el primer momento medible: por el enlace del grupo,
  // por el QR del bar o tecleando el código.
  useEffect(() => {
    trackOnce("mesa", EV.abreMesa);
  }, []);

  // true = la puerta de «¿quién eres?» está abierta porque alguien la pidió:
  // tocar un plato, «Unirme», cambiar de nombre. null = cerrada.
  const [joinOverride, setJoinOverride] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cambiarPagadorOpen, setCambiarPagadorOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);

  const { state, setServer, beginClaim, settleClaim } = useTicketSync(code, initial);
  const settlement = useMemo(() => computeSettlement(state), [state]);

  const { known, participantId: storedId, store } = useStoredParticipant(code);
  /*
    El pago que se quedó a medias al salir a Revolut. Si hay uno guardado, la
    hoja se abre sola por la pregunta de «¿lo has enviado?»: se deriva del
    dato en vez de meterlo en un estado desde un efecto, que era pintar dos
    veces para acabar en el mismo sitio.
  */
  const pagoPendiente = usePagoPendiente(code);
  const { profile: globalProfile, saveProfile } = useGlobalProfile();
  const meId = storedId && state.participants.some((p) => p.id === storedId) ? storedId : null;
  const { usuario, entrar, ocupado: entrando, cargada, usuarioNombre } = useCuenta();
  const router = useRouter();
  // La huella de la última sesión: mientras Firebase decide, el botón de
  // «Unirme» espera en vez de ofrecerse a quien ya tiene cuenta.
  const sesion = useSesionLocal();
  const esperandoSesion = usuario === undefined && Boolean(sesion);
  /*
    Con cuenta y sin saber quién eres: ¿te reservaron asiento?

    Si un amigo te metió en esta mesa, tu participante ya existe con tu nombre
    y tu cara, y aquí se recupera sin que la pantalla llegue a preguntarte
    quién eres. Se pregunta una vez por mesa; si no hay asiento, la hoja de
    «¿quién eres?» sale como siempre.
  */
  const mirandoAsiento = useRef(false);
  useEffect(() => {
    if (!usuario || !known || meId || joinOverride || mirandoAsiento.current) return;
    mirandoAsiento.current = true;
    (async () => {
      try {
        const { participantId } = await asientoEn(code);
        if (participantId) {
          store(participantId);
          return;
        }
        /*
          Sin asiento reservado pero con cuenta: te sientas solo.

          Con cuenta la mesa ya sabe quién eres, y preguntar «¿entrar como
          Ale?» es una pantalla de más. El perfil puede tardar un instante en
          bajar de la nube justo después de entrar, así que se le da hasta
          segundo y medio; si aun así no hay nombre, se pregunta como siempre.
        */
        let perfil = leerPerfil();
        for (let i = 0; i < 15 && !perfil?.name; i++) {
          await new Promise((r) => setTimeout(r, 100));
          perfil = leerPerfil();
        }
        if (perfil?.name) await join(perfil.name, perfil.avatar, perfil.bizum, perfil.revolut);
      } catch {
        // Sin red o sin perfil: la puerta de «¿quién eres?» saldrá al tocar.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, known, meId, joinOverride]);

  /*
    La puerta sólo se abre cuando hace falta, y no al llegar.

    Hasta el 6 de septiembre de 2026 quien abría el enlace se encontraba
    «¿Quién eres?» encima de la mesa borrosa antes de haber visto nada. Ahora
    ve la comanda, el total y quién está, y el nombre se le pide al tocar su
    primer plato —que es cuando ya quiere marcarlo— o al pulsar «Unirme».

    De paso se arregla otra cosa: quien tiene cuenta veía esa misma puerta
    uno o dos segundos, hasta que Firebase confirmaba la sesión y el efecto
    de arriba le sentaba solo. Como ya no sale sola, ese hueco no existe.
  */
  const showJoin = joinOverride === true && !meId;

  /*
    Nada que cambie la mesa sin decir quién eres.

    Mirar una comanda con el enlace está bien —es lo que hace quien llega y
    quiere ver de qué va— pero tocarla no: cualquiera que abriera el enlace
    podía entrar en «Dividir» y quitarle las croquetas a Bea sin haber dicho
    siquiera su nombre, y en el historial no quedaba a quién echarle la culpa
    porque no había nadie.

    Así que cada acción pasa por aquí. Si no tienes sitio en la mesa, en vez
    de hacerla se abre la puerta —Google o invitado—, que es lo que hacía
    falta antes de tocar. No se recuerda lo que ibas a hacer: son dos toques
    y adivinar la intención de alguien que aún no existe se equivoca más de
    lo que acierta.
  */
  const siEstoyDentro = (accion: () => void) => () => {
    if (!meId) {
      setJoinOverride(true);
      return;
    }
    accion();
  };

  /*
    Entrar con Google desde la puerta de la mesa.

    Cuando llega la sesión hay dos caminos. Si la cuenta es nueva —sin
    usuario todavía— se va al registro, y el registro vuelve aquí al acabar.
    Si no, la puerta se cierra y el efecto del asiento te sienta solo con tu
    perfil, como a cualquiera que llega con la sesión ya abierta.
  */
  const entroDesdeAqui = useRef(false);
  useEffect(() => {
    if (!entroDesdeAqui.current || !usuario || !cargada) return;
    entroDesdeAqui.current = false;
    const casa = usuario.email?.toLowerCase() === RESPONSABLE.correo;
    if (!usuarioNombre && !casa) {
      router.replace(`/registro?volver=${encodeURIComponent(`/t/${code}`)}`);
      return;
    }
    // Cerrar la puerta es reaccionar a que llegó la sesión, no derivar estado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoinOverride(null);
  }, [usuario, cargada, usuarioNombre, router, code]);

  /*
    Y al revés: ya sentado, y con cuenta.

    `join()` enlaza el asiento a la cuenta cuando te apuntas con ella abierta.
    Pero mucha gente se sienta primero y entra con Google después —o entra en
    otro móvil donde ya era alguien—, y ésa se quedaba sin asiento enlazado:
    sin avisos de cierre ni de pago, y sin poder meter amigos. Una vez por
    mesa y cuenta, sin esperar, y si falla no cambia nada de lo que ves.
  */
  const asientoEnlazado = useRef<string | null>(null);
  useEffect(() => {
    if (!usuario || !meId) return;
    const clave = `${code}:${usuario.uid}:${meId}`;
    if (asientoEnlazado.current === clave) return;
    asientoEnlazado.current = clave;
    void vinculaAsiento(code, meId).catch(() => {});
  }, [usuario, meId, code]);

  // `color` va obligatorio, como en `Participant`: el toast siempre se rellena
  // desde uno de la mesa, así que nunca falta. Declararlo opcional no cubría
  // ningún caso real y en cambio rompía la compilación contra `Avatar`, que lo
  // pide siempre — y con ella el despliegue entero.
  const [newFriend, setNewFriend] = useState<
    { id: string; name: string; avatar?: string; color: string; key: number } | null
  >(null);
  const prevCount = useRef(initial.participants.length);

  useEffect(() => {
    if (state.participants.length > prevCount.current) {
      const added = state.participants.slice(prevCount.current);
      const latest = added[added.length - 1];
      if (latest && latest.id !== meId) {
        setNewFriend({ ...latest, key: Date.now() });
        const timer = setTimeout(() => setNewFriend(null), 3500);
        prevCount.current = state.participants.length;
        return () => clearTimeout(timer);
      }
    }
    prevCount.current = state.participants.length;
  }, [state.participants, meId]);

  /* --------------------------------------------------- la foto, por detrás */

  const [leyendo, setLeyendo] = useState(false);
  const [fallóLectura, setFallóLectura] = useState<string | null>(null);
  const lecturaLanzada = useRef(false);

  /**
   * Manda a leer la foto que dejó el subidor.
   *
   * Vive aquí y no en el subidor porque aquí es donde se ve el resultado: si
   * falla, lo cuenta la propia comanda y no una pantalla que ya no existe. La
   * petición tarda sus segundos y a nadie le importa — mientras tanto se está
   * escribiendo un nombre y enseñando un QR.
   */
  useEffect(() => {
    if (!nuevo || lecturaLanzada.current || state.items.length > 0) return;
    let guardada: string | null = null;
    try {
      guardada = window.sessionStorage.getItem(`divi:foto:${code}`);
    } catch {
      /* sin sessionStorage no hay foto que leer, y la mesa funciona a mano */
    }
    if (!guardada) return;

    lecturaLanzada.current = true;
    void (async () => {
      setLeyendo(true);
      try {
        const response = await fetch(`/api/tickets/${code}/lectura`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: guardada,
        });
        const data = (await response.json()) as TicketState & { error?: string };
        if (!response.ok) throw new Error(data.error ?? t.comanda.errorGuardar);
        setServer(data);
        // Leída y guardada: que un refresco no la vuelva a mandar.
        try {
          window.sessionStorage.removeItem(`divi:foto:${code}`);
        } catch {}
      } catch (cause) {
        setFallóLectura(cause instanceof Error ? cause.message : t.comanda.errorGuardar);
      } finally {
        setLeyendo(false);
      }
    })();
    // `setServer` y `t` no cambian nada aquí: el testigo de arriba manda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevo, code, state.items.length]);

  /* -------------------------------------------------------------- acciones */

  async function send(path: string, init: RequestInit): Promise<TicketState | null> {
    setError(null);
    try {
      // Con cuenta, el token va en todas: al servidor le da igual en casi
      // todas las rutas, pero en «quién pagó» es lo que abre el segundo nivel.
      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      };
      const user = usuarioActual();
      if (user) headers.authorization = `Bearer ${await user.getIdToken()}`;
      const response = await fetch(`/api/tickets/${code}${path}`, { ...init, headers });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        setError(data.error ?? t.comanda.errorGuardar);
        return null;
      }
      setServer(data);
      return data;
    } catch {
      setError(t.comanda.sinConexion);
      return null;
    }
  }

  async function addPerson(name: string, avatar?: string, bizum?: string, revolut?: string): Promise<string | null> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}/participants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, avatar, bizum, revolut }),
      });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        setError(data.error ?? t.comanda.errorApuntar);
        return null;
      }
      setServer(data);
      return response.headers.get("x-participant-id");
    } catch {
      setError(t.comanda.sinConexion);
      return null;
    }
  }

  async function join(name: string, avatar?: string, bizum?: string, revolut?: string) {
    const participantId = await addPerson(name, avatar, bizum, revolut);
    if (!participantId) return;
    track(EV.seApunta, { con_avatar: Boolean(avatar) });
    store(participantId);
    // Con cuenta, la mesa se queda con que este asiento es tuyo: así te puede
    // avisar cuando se cierre o cuando te paguen. Sin esperar: no es parte de
    // apuntarse, y si falla no cambia nada de lo que ves.
    if (usuario) void vinculaAsiento(code, participantId).catch(() => {});
    setJoinOverride(null);
    /*
      En una mesa recién creada, lo siguiente es el QR y no el pagador.

      Quien acaba de subir la foto tiene delante a la mesa esperando, y lo que
      hace falta para que esto sea un divi es que los demás entren. Lo de quién
      puso la tarjeta se pregunta después, al cerrar el QR, que además es cuando
      ya se sabe.
    */
    if (nuevo) {
      setSharing(true);
      return;
    }
    if (!hayPagador) setPreguntandoPagador(true);
  }

  /* -------------------------------------------------------------- cobrar */

  const declararPago = (toId: string, cents: number, via: Via) =>
    send("/pagos", {
      method: "POST",
      body: JSON.stringify({ fromId: meId, toId, cents, via }),
    });

  const resolverPago = (fromId: string, ok: boolean) =>
    send("/pagos", { method: "PATCH", body: JSON.stringify({ fromId, toId: meId, ok }) });

  const guardarCobro = (datos: { revolut: string | null; bizum: string | null }) =>
    meId ? patchParticipant(meId, datos) : Promise.resolve(null);

  function claim(itemId: string, shares: number, splitInto?: number, forId?: string) {
    const target = forId ?? meId;
    if (!target) {
      setJoinOverride(true);
      return;
    }
    navigator.vibrate?.(8);
    trackOnce("plato", EV.marcaPlato);
    const token = beginClaim(itemId, target, shares, splitInto);
    void send("/claims", {
      method: "POST",
      body: JSON.stringify({ itemId, participantId: target, shares, splitInto }),
    }).then((confirmed) => settleClaim(token, confirmed ?? undefined));
  }

  const patchTicket = (body: Record<string, unknown>) =>
    send("", { method: "PATCH", body: JSON.stringify({ ...body, by: meId }) });

  const patchParticipant = (participantId: string, body: Record<string, unknown>) =>
    send(`/participants/${participantId}`, { method: "PATCH", body: JSON.stringify(body) });

  const removeParticipant = (participantId: string) =>
    send(`/participants/${participantId}`, { method: "DELETE" });

  async function splitUnits(itemId: string, qty: number): Promise<boolean> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}/items/${itemId}/split`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qty }),
      });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        setError(data.error ?? t.comanda.errorSeparar);
        return false;
      }
      setServer(data);
      const nuevo = response.headers.get("x-item-id");
      if (nuevo) setEditing(nuevo);
      return true;
    } catch {
      setError(t.comanda.sinConexion);
      return false;
    }
  }

  const setSplitInto = (itemId: string, into: number) =>
    send(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ splitInto: into }) });

  /* ----------------------------------------------------------------- vista */

  const myBalance = settlement.byParticipant.find((b) => b.participantId === meId) ?? null;

  const hayPagador = Boolean(
    state.ticket.payerId ||
      state.participants.some((p) => p.isPayer) ||
      (state.receipts ?? []).some((r) => r.payerId),
  );
  const yo = meId ? state.participants.find((p) => p.id === meId) ?? null : null;

  // La hoja de pagar se abre por dos vías: pulsando el botón, o volviendo de
  // Revolut con un pago apuntado. La segunda arranca ya en la pregunta.
  const pagoAbierto = pagandoA ?? pagoPendiente;
  const cobrandoA = pagoAbierto
    ? state.participants.find((p) => p.id === pagoAbierto.id) ?? null
    : null;

  /*
    ¿Puse yo el dinero?

    Hay que mirarlo por las tres vías, igual que `hayPagador`. Preguntarlo sólo
    por `isPayer` no valía: en cuanto se marca a alguien con `payerId` —que es
    el camino de ahora— el servidor pone ese `isPayer` a false en todos, así
    que la respuesta era siempre «no». Por eso al que pagaba no le salían en el
    menú ni «configurar cómo cobrar» ni «cerrar la mesa».
  */
  /** Quién puso el dinero de un ticket concreto, sea el original o un recibo. */
  const pagadorDelTicket = (receiptId: string | null): string | null =>
    receiptId
      ? ((state.receipts ?? []).find((r) => r.id === receiptId)?.payerId ?? null)
      : (state.ticket.payerId ?? state.participants.find((p) => p.isPayer)?.id ?? null);

  const soyElPagador = Boolean(
    meId &&
      (state.ticket.payerId === meId ||
        yo?.isPayer ||
        (state.receipts ?? []).some((r) => r.payerId === meId)),
  );


  const esMia = Boolean(myBalance && (myBalance.itemsCents > 0 || myBalance.paidCents > 0));
  const aQuien = meId
    ? (settlement.transactions ?? []).find((t) => t.fromId === meId)?.toId
    : undefined;
  /*
    Quién te debe de esta mesa y si ya te lo ha devuelto.

    Sale de las mismas transacciones que pinta la pantalla de cuentas, filtradas
    por las que apuntan a ti. `settled` del que debe es lo que dice si ya volvió:
    es el mismo sí o no que marca la mesa, no una cuenta aparte.
  */
  const meDeben = meId
    ? (settlement.transactions ?? [])
        .filter((tx) => tx.toId === meId)
        .map((tx) => {
          const quien = settlement.byParticipant.find((p) => p.participantId === tx.fromId);
          return { name: quien?.name ?? "", cents: tx.cents, pagado: quien?.settled === true };
        })
        .filter((d) => d.name && d.cents > 0)
    : [];

  const huella = [
    code,
    meId ?? "",
    myBalance?.owesCents ?? 0,
    myBalance?.settled ?? false,
    state.ticket.place ?? "",
    state.participants.map((p) => p.id).join(","),
    aQuien ?? "",
    esMia,
    myBalance?.paidCents ?? 0,
    meDeben.map((d) => `${d.name}:${d.cents}:${d.pagado}`).join(","),
  ].join("|");

  useEffect(() => {
    if (!meId || !myBalance) return;
    if (!esMia) {
      olvidar(code);
      return;
    }
    recordar({
      code,
      place: state.ticket.place,
      at: new Date().toISOString(),
      currency: state.ticket.currency,
      cents: myBalance.owesCents,
      aQuien: settlement.byParticipant.find((p) => p.participantId === aQuien)?.name ?? null,
      saldado: myBalance.settled,
      gente: state.participants.map((p) => ({
        name: p.name,
        color: p.color,
        avatar: p.avatar,
      })),
      puestoCents: myBalance.paidCents,
      mioCents: myBalance.itemsCents + myBalance.extrasCents,
      deudas: meDeben,
      creada: state.ticket.createdAt,
    });
    // Se apunta cuando cambia algo que la lista enseña, no en cada repintado:
    // `huella` resume justo eso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huella]);

  const progress =
    settlement.grandTotalCents > 0 ? settlement.assignedCents / settlement.grandTotalCents : 0;
  const editingItem = state.items.find((i) => i.id === editing) ?? null;
  const removingItem = state.items.find((i) => i.id === removing) ?? null;
  const left = settlement.unassignedCents;

  const receipts = state.receipts || [];
  const hasLegacyItems = state.items.some(i => !i.receiptId) || (state.ticket.totalCents - receipts.reduce((a, r) => a + r.totalCents, 0)) > 0;

  /*
    Los tickets a los que todavía nadie les ha puesto pagador.

    Se puede saltar la pregunta, pero no en silencio: mientras quede alguno,
    su pestaña va marcada y la pantalla de cuentas avisa. Sin eso los números
    salen mal y encima con toda la pinta de estar bien.
  */
  /** El nombre de quien puso la tarjeta del papel que se está mirando. */
  const pagadorNombre = (() => {
    const id = pagadorDelTicket(currentReceiptId);
    if (!id) return null;
    const quien = state.participants.find((p) => p.id === id);
    return quien ? (quien.id === meId ? t.mesa.tu.replace(/[()]/g, "") : quien.name) : null;
  })();

  /** Cuántos papeles hay: con uno solo, la fila de pestañas no pinta nada. */
  const pestanas = (hasLegacyItems ? 1 : 0) + receipts.length;

  const ticketsSinPagador = [
    ...(hasLegacyItems ? [{ id: null as string | null, label: state.ticket.place }] : []),
    ...receipts.map((r) => ({ id: r.id as string | null, label: r.label })),
  ].filter((tk) => !pagadorDelTicket(tk.id));

  let currentReceiptId = activeReceiptId;
  if (currentReceiptId === null) {
    if (hasLegacyItems) {
      currentReceiptId = null;
    } else if (receipts.length > 0) {
      currentReceiptId = receipts[0].id;
    }
  }

  /*
    En el orden del papel, y ahí se quedan.

    Las líneas completas se iban al final de la lista. La idea era buena
    —arriba lo que falta— y en pantalla era lo peor que puede hacer una
    interfaz táctil: tocabas la tercera caña y la fila se marchaba de debajo
    del dedo. Y con la mesa entera repartiendo a la vez era peor todavía,
    porque el toque de otro te reordenaba la lista con el pulgar en el aire y
    acababas marcando lo que no era.

    Ahora no se mueve nada nunca: la comanda se lee en el orden en que está
    impresa en el ticket, que es como se lee un ticket. Que una línea esté
    completa se dice con el color y con la palabra, donde está.
  */
  const currentItems = state.items.filter(
    (i) => (currentReceiptId === null && !i.receiptId) || i.receiptId === currentReceiptId,
  );

  const esMio = (itemId: string) =>
    Boolean(settlement.byItem[itemId]?.shares.some((s) => s.participantId === meId));
  const quedaLibre = (itemId: string) => (settlement.byItem[itemId]?.freeShares ?? 0) > 0;

  const cuantos = {
    todo: currentItems.length,
    libre: currentItems.filter((i) => quedaLibre(i.id)).length,
    mio: currentItems.filter((i) => esMio(i.id)).length,
  };

  const vistos = currentItems.filter((i) =>
    filtro === "libre" ? quedaLibre(i.id) : filtro === "mio" ? esMio(i.id) : true,
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* ------------------------------------------------------------ cabecera */}
      {/*
        Opaca y hasta el borde de arriba del todo.

        Iba al 95 % con `backdrop-blur`, y en el iPhone se leía la comanda por
        detrás de la barra: el 5 % que dejaba pasar es suficiente para ver una
        línea entera. Y como el `viewport` va con `viewport-fit=cover`, la
        página se mete debajo del reloj y de la muesca, así que sin el
        `safe-area-inset-top` esa franja no la pintaba nadie y allí también
        asomaban las tarjetas. Ahora la cabecera llega hasta arriba y tapa.
      */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        {/*
          El faldón de arriba.

          `env(safe-area-inset-top)` no basta: Safari de iOS esconde su barra
          al bajar, el viewport crece y durante ese baile la cabecera se queda
          unos píxeles por debajo del borde. Por ese hueco se veía la comanda.
          Esto es medio pantalla del mismo café colgando hacia arriba: cuando
          la cabecera está donde debe, cae fuera y no se ve; cuando no, tapa.
        */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full h-[50vh] bg-paper" />
        {/*
          Y el desvanecido por debajo, que es otra cosa.

          El faldón tapa; esto disuelve. Sin ello una línea de la comanda entra
          bajo la cabecera cortada por la mitad con un filo recto, y se ve el
          corte: media palabra, un precio partido. Con dos dedos de degradado
          del mismo café, el renglón se apaga antes de llegar al borde y lo que
          pasa por debajo deja de leerse.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-paper to-transparent"
        />
        <div className="mx-auto grid max-w-3xl gap-3 px-[var(--gutter)] pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2.5">
          {/*
            Cuatro botones redondos iguales y la marca a la izquierda.

            Las tres caras y la palabra «Compartir» ocupaban aquí 150 px que no
            había, y en un iPhone dejaban la marca en «DiviFrien…». La gente se
            cuenta en el globo del primer botón, y las caras están dentro de la
            hoja de la mesa, que es donde se mira quién se ha unido.
          */}
          <div className="flex items-center gap-1.5">
            {/*
              El logo y el nombre.

              Con las caras y la palabra «Compartir» de vuelta, ni el nombre de
              la marca ni el código caben: medido, se quedaban a siete píxeles
              en un iPhone de 390. Ninguno de los dos se echa de menos aquí —
              dentro de la app ya sabes en qué app estás, y el código está en
              grande en la hoja de compartir, que es justo donde vas a buscarlo
              para decírselo a alguien. Y ahora la mesa tiene nombre, que sale
              en la pestaña de debajo.
            */}
            <Link
              href={inicio(lang)}
              aria-label="DiviFriends"
              className="flex min-w-0 shrink items-center gap-2"
            >
              <Logo size={64} className="h-8 w-8 shrink-0" />
              {/*
                El nombre, no el código. El código está en grande en la hoja de
                compartir, que es adonde vas cuando quieres dárselo a alguien;
                aquí lo que hace falta es saber de qué app es esto.

                El corte estaba en 390 y sobraba: se puso cuando la cabecera
                llevaba las tres caras y la palabra «Compartir» sueltas, y desde
                que eso vive dentro de un botón hay sitio de sobra. Medido: a
                360 px quedan 107 libres y la palabra ocupa 76; a 375, 122.
                Estaba escondiéndose en móviles donde cabía holgada —el nombre
                de la app desaparecía en un iPhone SE y en medio Android— y por
                eso dentro de una comanda sólo se veía el símbolo.

                A 320 sí falta sitio: nueve píxeles. Ahí se queda el logo solo.
              */}
              <span className="hidden truncate text-[15px] font-bold leading-tight tracking-[-0.02em] min-[350px]:block">
                Divi<span className="text-amber">Friends</span>
              </span>
            </Link>
            <span className="min-w-0 flex-1" />

            {/*
              Compartir: las caras de quien ya está y la palabra.

              Estuvo un rato como botón redondo con un icono, y perdía las dos
              cosas que lo hacían funcionar: ver de un vistazo quién hay en la
              mesa, y una palabra que diga a las claras que de ahí sale el
              enlace para el grupo. Ocupa más, y lo vale.
            */}
            <button
              type="button"
              /* Compartir también pide estar dentro: quien reparte el enlace
                 es alguien de la mesa, y así la puerta sale en el primer
                 gesto, sea el que sea. */
              onClick={siEstoyDentro(() => setSharing(true))}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper-2 pl-1 pr-2.5 transition-transform active:scale-95"
            >
              {/*
                Tres caras como mucho y sin el «+N».

                El contador ocupaba veintitantos píxeles y era justo lo que
                obligaba a esconder la palabra «Compartir» en las pantallas
                estrechas —o sea, a quitar lo único que dice para qué sirve el
                botón—. Cuántos sois se cuenta en la hoja, que es donde se mira.
              */}
              {/*
                Cuántos sois, en número.

                Eran tres caras superpuestas y con cuatro personas ya no cabía
                la cuarta, así que el botón enseñaba «tres» pasara lo que
                pasara: la información que da un avatar de 20 px del que no se
                distingue la cara es exactamente ninguna, y ocupaba el ancho
                que ahora deja sitio a quién pagó. El número no miente ni con
                dos ni con nueve, y es lo que se pregunta al mirar ahí:
                ¿estamos todos?
              */}
              <span className="tnum text-[13px] font-bold text-amber">
                {state.participants.length}
              </span>
              <span className="text-[13px] font-bold text-amber">{t.comanda.compartir}</span>
            </button>

            {/*
              El billete: quién puso la tarjeta, y lo ve toda la mesa.

              Era un escudo y salía sólo para el que había pagado. La vida real
              no funciona así: la foto del ticket la hace uno y la tarjeta la
              pone otro, y el que no había pagado no tenía forma de arreglarlo
              —tenía que pedírselo al primero—. Ahora lo abre cualquiera y sólo
              hace una cosa, decir quién pagó. Lo demás del pagador se fue a los
              tres puntos, que es donde vive lo que sólo te toca a ti.

              Con la mesa cerrada desaparece: ahí ya no se cambia nada.
            */}
            {!state.ticket.closed && (
              <Redondo onClick={siEstoyDentro(() => setCambiarPagadorOpen(true))} label={t.menu.cambiarPagador} escudo>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
                  <rect x="2.6" y="6.2" width="18.8" height="11.6" rx="2" />
                  <circle cx="12" cy="12" r="2.6" />
                  <path d="M6.2 9.6v4.8M17.8 9.6v4.8" />
                </svg>
              </Redondo>
            )}

            <Redondo onClick={() => setMenuOpen(true)} label={t.comanda.opciones}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="12" cy="19" r="1.7" />
              </svg>
            </Redondo>
          </div>

          <>
              {/* Las pestañas sangran hasta el borde: una pastilla a medio salir
                  se corta contra el filo de la pantalla y no contra un padding,
                  que es lo que hacía parecer que la fila estaba mal medida. */}
              {/*
                Las pestañas, sólo cuando hay más de un papel.

                Con un solo ticket —el 99% de las mesas— esta fila era una
                pastilla con el nombre del bar y un «+ Añadir» al lado,
                ocupando cuarenta píxeles de alto para no ofrecer ninguna
                elección: no hay a qué cambiar. El nombre ya está arriba y
                añadir otro ticket se fue a los tres puntos, que es donde se
                busca lo que se hace una vez.
              */}
              {pestanas > 1 && (
              <div className="rail">
                {hasLegacyItems && (
                  <Pestana
                    activa={currentReceiptId === null}
                    onClick={() => setActiveReceiptId(null)}
                    sinPagador={!pagadorDelTicket(null)}
                  >
                    {state.ticket.place || t.comanda.ticketOriginal}
                  </Pestana>
                )}
                {receipts.map((r) => (
                  <Pestana
                    key={r.id}
                    activa={currentReceiptId === r.id}
                    onClick={() => setActiveReceiptId(r.id)}
                    sinPagador={!pagadorDelTicket(r.id)}
                  >
                    {r.label}
                  </Pestana>
                ))}
              </div>
              )}

              <div className="rule" />

              {/* Cuánto lleváis repartido del ticket que estáis mirando. */}
              <div className="grid gap-[7px]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="stamp text-ink-faint">{t.comanda.repartido}</span>
                  <span className="tnum whitespace-nowrap text-[13px] text-ink-faint">
                    <b className="font-bold text-ink">
                      {money(settlement.assignedCents, state.ticket.currency)}
                    </b>{" "}
                    / {money(settlement.grandTotalCents, state.ticket.currency)}
                  </span>
                </div>
                <Progress value={progress} />
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setViewing(true)}
                    className="-my-2 py-2 text-[13px] text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-ink"
                  >
                    {t.comanda.verTicket}
                  </button>
                  {/*
                    Quién puso la tarjeta, aquí.

                    Antes esta esquina decía «sin repartir 65,37 €», que es la
                    otra mitad de la resta que ya está escrita justo encima
                    —«repartido 31,03 € / 96,40 €»— y que además vuelve a salir
                    en la barra de abajo. Tres sitios para un número.

                    Quien pagó, en cambio, no estaba en ninguna parte: había
                    que abrir Cuentas para saberlo, y es el dato que ordena
                    toda la cena. Cuando no lo ha dicho nadie, lo pide en
                    ámbar, que es la única tarea pendiente que hay de verdad.
                  */}
                  <span className="whitespace-nowrap text-[13px] text-ink-faint">
                    {pagadorNombre ? (
                      <>
                        {t.comanda.pago}{" "}
                        <b className="font-bold text-ink">{pagadorNombre}</b>
                      </>
                    ) : (
                      <b className="font-bold text-amber">{t.comanda.sinPagador}</b>
                    )}
                  </span>
                </div>
              </div>

              {/*
                Un segmentado y no tres botones sueltos: los tres se reparten el
                ancho que haya, así que caben siempre. Con su cuenta al lado, en
                un móvil de 390 px no cabían y se salían por la derecha.
              */}
              <div
                role="group"
                aria-label={t.comanda.filtrar}
                className="flex gap-[3px] rounded-bloque border border-line-soft bg-paper-2 p-[3px]"
              >
                {(
                  [
                    ["todo", t.comanda.filtroTodo, cuantos.todo],
                    ["libre", t.comanda.filtroLibres, cuantos.libre],
                    ["mio", t.comanda.filtroMio, cuantos.mio],
                  ] as const
                ).map(([clave, etiqueta, n]) => (
                  <button
                    key={clave}
                    type="button"
                    aria-pressed={filtro === clave}
                    onClick={() => setFiltro(clave)}
                    className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-menudo text-[13px] font-semibold transition-colors ${
                      filtro === clave ? "bg-paper-4 text-ink" : "text-ink-faint"
                    }`}
                  >
                    {etiqueta}
                    <span
                      className={`tnum text-[11px] ${
                        filtro === clave ? "text-amber" : "text-ink-faint"
                      }`}
                    >
                      {n}
                    </span>
                  </button>
                ))}
              </div>
          </>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-[var(--gutter)] py-3">
        {error && (
          <p role="alert" className="mb-3 rounded-pieza border border-clay/40 bg-clay/10 px-3 py-2.5 text-sm text-clay">
            {error}
          </p>
        )}

        {
          /*
            Una sola columna.

            En dos, cada burbuja se quedaba en 170 px de ancho y el nombre de un
            plato tenía que partirse en tres renglones, así que había que dejar
            hueco fijo para el peor caso y todas las tarjetas crecían por igual.
            En una fila el nombre cabe entero y la cifra siempre cae en el mismo
            sitio, que es lo que se va comparando al bajar.
          */
          <ul className="grid list-none gap-[9px] pb-36">
            {/*
              El ticket que todavía se está leyendo.

              Tres renglones que laten donde van a ir las líneas: dice «esto se
              está llenando» sin una barra de progreso que mienta sobre cuánto
              falta. Se va solo en cuanto llega la lectura, y si no llega, en su
              sitio queda qué hacer con la mesa.
            */}
            {state.items.length === 0 && (leyendo || fallóLectura) && (
              <li className="rounded-caja bg-paper-2 px-4 py-4">
                {fallóLectura ? (
                  <>
                    <p className="text-[15px] font-semibold text-clay">{fallóLectura}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                      {t.comanda.lecturaFallo}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-amber">
                      {t.comanda.leyendoTicket}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
                      {t.comanda.leyendoAyuda}
                    </p>
                    <span aria-hidden className="mt-3.5 grid gap-2">
                      {[92, 70, 84].map((ancho, i) => (
                        <span
                          key={ancho}
                          className="h-3 animate-pulse rounded bg-line"
                          style={{ width: `${ancho}%`, animationDelay: `${i * 140}ms` }}
                        />
                      ))}
                    </span>
                  </>
                )}
              </li>
            )}

            {vistos.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                breakdown={settlement.byItem[item.id]}
                participants={state.participants}
                meId={meId}
                currency={state.ticket.currency}
                open={abierta === item.id}
                onOpen={() => setAbierta(abierta === item.id ? null : item.id)}
                onSetShares={(shares) => siEstoyDentro(() => claim(item.id, shares))()}
                onOpenOptions={siEstoyDentro(() => setEditing(item.id))}
                onRemove={siEstoyDentro(() => setRemoving(item.id))}
              />
            ))}

            {vistos.length === 0 && filtro !== "todo" && (
              <li className="grid justify-items-center gap-2.5 px-5 py-12 text-center">
                <span className="text-[17px] font-semibold text-ink">
                  {filtro === "mio" ? t.comanda.nadaTuyoTitulo : t.comanda.nadaLibreTitulo}
                </span>
                <p className="max-w-[26ch] text-[13px] leading-relaxed text-ink-faint">
                  {filtro === "mio" ? t.comanda.nadaTuyoTexto : t.comanda.nadaLibreTexto}
                </p>
                <button
                  type="button"
                  onClick={() => setFiltro("todo")}
                  className="mt-1 min-h-[46px] rounded-pieza border border-line px-5 text-[15px] font-semibold text-ink transition-colors active:bg-paper-2"
                >
                  {t.comanda.verTodo}
                </button>
              </li>
            )}

            {filtro === "todo" && (
              <li>
                <button
                  type="button"
                  onClick={siEstoyDentro(() => setAdding(true))}
                  className="flex min-h-16 w-full items-center justify-center gap-2 rounded-caja border-[1.5px] border-dashed border-line text-[15px] font-semibold text-ink-soft transition-colors active:bg-paper-2"
                >
                  <span className="text-[21px] leading-none">+</span>
                  {t.comanda.faltaAlgo}
                </button>
              </li>
            )}
          </ul>
        }
      </main>

      {/* ---------------------------------------------------------- barra fija */}
      {/*
        El faldón ya no es un hijo que se sale, es la propia barra.

        La caja baja medio metro por debajo de la pantalla —`bottom` negativo—
        y el mismo medio metro de relleno vuelve a subir el contenido a su
        sitio, así que lo que se ve no se mueve ni un píxel. Lo que cambia es
        quién pinta ese café de abajo: antes un `div` que desbordaba la barra,
        ahora el fondo de la barra misma.

        Y eso es justo lo que había que quitar de en medio. Un hijo que se sale
        de un elemento fijo es lo primero que Safari de iOS recorta cuando le
        cambias las capas de sitio, y entre eso y el grano se nos fueron tres
        intentos de arreglar el mismo hueco. Un fondo no se puede recortar:
        o se pinta la caja o no se pinta.
      */}
      <div className="fixed inset-x-0 bottom-[-50vh] z-30 border-t border-line bg-paper-2 pb-[calc(50vh+env(safe-area-inset-bottom))]">
        {/* El mismo desvanecido que en la cabecera, por el otro lado: lo que
            baja hacia la barra se apaga en vez de meterse debajo de un filo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-gradient-to-t from-paper to-transparent"
        />
        <div className="mx-auto flex max-w-3xl items-center gap-3.5 px-[var(--gutter)] py-3">
          <div className="min-w-0 flex-1">
            <p className="stamp text-ink-faint">{meId ? t.comanda.loTuyo : t.comanda.sinRepartir}</p>
            <p className="tnum mt-0.5 text-2xl font-bold leading-tight">
              {/*
                Lo que te has tomado tú, y nada más.

                Antes salía el saldo, y al que puso la tarjeta le aparecía en
                negativo: iba marcando sus tres platos y la cifra bajaba, que es
                justo lo contrario de lo que está haciendo. El saldo tiene su
                sitio en Cuentas; aquí abajo, mientras se reparte, la pregunta
                es «¿cuánto llevo?» y esa es la misma para todos.

                Al resto no le cambia nada: quien no ha adelantado dinero tiene
                el saldo igual a lo suyo, así que la cifra es la de siempre.
              */}
              {money(
                meId
                  ? (myBalance ? myBalance.itemsCents + myBalance.extrasCents : 0)
                  : settlement.unassignedCents,
                state.ticket.currency,
              )}
            </p>
          </div>
          {meId ? (() => {
            const misDeudas = settlement.transactions.filter((tx) => tx.fromId === meId);
            const soyAcreedor = settlement.transactions.some((tx) => tx.toId === meId);
            const debidoTotal = misDeudas.reduce((a, tx) => a + tx.cents, 0);
            const todoPagado = Boolean(myBalance?.settled) && !soyAcreedor && !soyElPagador;

            /*
              Lo primero de todo: si el ticket que estás mirando no tiene
              pagador, no hay nada que calcular todavía. La pregunta va por
              papel porque tres tickets pueden llevar tres pagadores, y sin ese
              dato lo que costó se le cobra a quien se lo comió sin abonárselo
              a nadie: sale una deuda sin acreedor y los números mienten.
            */
            const faltaPagadorAqui = !pagadorDelTicket(currentReceiptId);
            /* El aviso del pagador manda sobre el «todo pagado», igual en la
               palabra que en el color: recién llegado y sin marcar nada tu
               saldo ya es cero, así que salía el botón azul de «todo pagado»
               con la frase «¿Quién lo pagó?» dentro. */
            const showTodoPagado = todoPagado && !faltaPagadorAqui;

            /*
              Lo que dice el botón, por orden de urgencia. Fuera del JSX porque
              encadenado allí eran seis ternarios anidados y ya no se leía cuál
              ganaba a cuál.

              Salvo la pregunta del pagador, todo acaba abriendo la hoja de
              cuentas. Antes, debiéndole a una sola persona, saltaba directo a
              pagar: dos botones con la misma pinta, uno para mirar y otro para
              sacar el dinero. Ahora se mira primero, y el botón de pagar está
              al lado de a quien le pagas.
            */
            const etiqueta = (() => {
              if (faltaPagadorAqui) return t.comanda.quienPagoEste;
              if (showTodoPagado) return t.comanda.todoPagadoBoton;
              if (misDeudas.length > 0) {
                return rellena(t.comanda.pagarTotal, {
                  dinero: money(debidoTotal, state.ticket.currency),
                });
              }
              if (!soyElPagador && (myBalance?.owesCents ?? 0) === 0) return t.comanda.seleccionaAlgo;
              return t.comanda.cuentas;
            })();

            return (
              <button
                type="button"
                onClick={() => {
                  if (faltaPagadorAqui) {
                    setPreguntandoTicket({ receiptId: currentReceiptId });
                  } else if (showTodoPagado) {
                    setShowStatusPopup(true);
                  } else if (!soyElPagador && (myBalance?.owesCents ?? 0) === 0) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    trackOnce("cuentas", EV.veCuentas);
                    setCuentasOpen(true);
                  }
                }}
                /* Con tope y recortando: este botón cambia de frase según lo
                   que te toque, y la más larga se comía la cifra de la
                   izquierda hasta taparla. Lo que no puede perderse nunca es
                   cuánto llevas. */
                className={`max-w-[58%] min-h-[46px] shrink-0 truncate rounded-pieza px-5 text-[15px] font-bold active:scale-95 transition-transform ${
                  showTodoPagado
                    ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                    : "bg-amber"
                }`}
                style={showTodoPagado ? {} : { color: "var(--paper-2)" }}
              >
                {etiqueta}
              </button>
            );
          })() : (
            <button
              type="button"
              onClick={() => setJoinOverride(true)}
              disabled={esperandoSesion}
              className="min-h-[46px] shrink-0 rounded-pieza bg-amber px-5 text-[15px] font-bold disabled:opacity-60"
              style={{ color: "var(--paper-2)" }}
            >
              {esperandoSesion ? "…" : t.comanda.unirme}
            </button>
          )}
        </div>
      </div>

      {editingItem && (
        <ItemSheet
          item={editingItem}
          breakdown={settlement.byItem[editingItem.id]}
          participants={state.participants}
          currency={state.ticket.currency}
          meId={meId}
          onClose={() => setEditing(null)}
          onSetShares={(participantId, shares, into) =>
            claim(editingItem.id, shares, into, participantId)
          }
          onAddPerson={addPerson}
          onSplitUnits={(qty) => splitUnits(editingItem.id, qty)}
          onSetPartes={(into) => void setSplitInto(editingItem.id, into)}
          onPick={(into) => {
            if (meId) claim(editingItem.id, 1, into);
            else void setSplitInto(editingItem.id, into);
          }}
        />
      )}

      {removingItem && (
        <RemoveItemSheet
          item={removingItem}
          breakdown={settlement.byItem[removingItem.id]}
          currency={state.ticket.currency}
          ticketTotalCents={state.ticket.totalCents}
          totalAfterCents={totalAfterRemoving(
            state.ticket.totalCents,
            state.items,
            removingItem.id,
          )}
          onClose={() => setRemoving(null)}
          onConfirm={(newQty) => {
            setRemoving(null);
            if (newQty === 0) {
              void send(`/items/${removingItem.id}?by=${meId ?? ""}`, { method: "DELETE" });
            } else {
              void send(`/items/${removingItem.id}?by=${meId ?? ""}`, {
                method: "PATCH",
                body: JSON.stringify({ qty: newQty })
              });
            }
          }}
        />
      )}

      {cuentasOpen && (
        <CuentasSheet
          state={state}
          settlement={settlement}
          meId={meId}
          onSetSettled={(participantId, settled) =>
            void patchParticipant(participantId, { settled })
          }
          onPagar={(toId, cents) => {
            /* La hoja de cuentas se cierra al abrir la de pagar: dos paneles
               apilados dejan de saberse cuál cierra el gesto de bajar. */
            setCuentasOpen(false);
            setPagandoA({ id: toId, cents });
          }}
          onResolver={(fromId, ok) => void resolverPago(fromId, ok)}
          onRecordar={
            usuario
              ? (person) => {
                  // Igual que pagar: la hoja de cuentas se cierra y vuelve al cerrar ésta.
                  setCuentasOpen(false);
                  setRecordandoA(person);
                }
              : undefined
          }
          ticketsSinPagador={ticketsSinPagador}
          onDecirPagador={(receiptId) => {
            setCuentasOpen(false);
            setPreguntandoTicket({ receiptId });
          }}
          onClose={() => setCuentasOpen(false)}
        />
      )}

      {recordandoA && meId && (
        <RecordarSheet
          code={code}
          persona={recordandoA}
          cents={
            settlement.transactions.find(
              (tx) => tx.fromId === recordandoA.participantId && tx.toId === meId,
            )?.cents ?? recordandoA.owesCents
          }
          currency={state.ticket.currency}
          miAsiento={meId}
          onClose={() => {
            setRecordandoA(null);
            setCuentasOpen(true);
          }}
        />
      )}

      {showingLog && (
        <HistorySheet
          events={state.events}
          participants={state.participants}
          currency={state.ticket.currency}
          meId={meId}
          onClose={() => setShowingLog(false)}
        />
      )}

      {viewing && (
        <TicketSheet state={state} shareUrl={shareUrl} qrSvg={qrSvg} onClose={() => setViewing(false)} />
      )}

      {guiding && <GuideSheet onClose={() => setGuiding(false)} />}

      {sharing && (
        <TableSheet
          code={code}
          url={shareUrl}
          qrSvg={qrSvg}
          place={state.ticket.place}
          onRename={(nombre) => void patchTicket({ place: nombre })}
          participants={state.participants}
          payerId={state.ticket.payerId}
          meId={meId}
          /* Sacar a alguien de la mesa le borra lo que tuviera marcado y mueve
             las cuentas de todos, así que lo hace quien puso el dinero. Un
             mirón que ni se ha unido, desde luego que no. Mientras nadie haya
             dicho que pagó se deja abierto: la mesa se está montando y si no
             habría que marcar pagador antes de poder corregir un nombre. */
          puedeQuitar={Boolean(meId) && (soyElPagador || !hayPagador)}
          onRemove={(participantId) =>
            void removeParticipant(participantId)
          }
          onInvitar={
            usuario
              ? async (uid) => {
                  const data = await invitaAMesa(code, uid, meId);
                  setServer(data as unknown as TicketState);
                }
              : undefined
          }
          onClose={() => {
            setSharing(false);
            if (nuevo && meId && !hayPagador && !pagadorPreguntado.current) {
              pagadorPreguntado.current = true;
              setPreguntandoPagador(true);
            }
          }}
        />
      )}

      {adding && (
        <AddItemSheet
          onClose={() => setAdding(false)}
          onAdd={async (name, qty, price) => {
            await send("/items", {
              method: "POST",
              body: JSON.stringify({ name, qty, price, by: meId, receiptId: currentReceiptId }),
            });
            setAdding(false);
          }}
        />
      )}

      {uploadingAnother && (
        <Sheet onClose={() => setUploadingAnother(false)}>
          <h2 className="mb-4 text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.subir.otroTicket}</h2>
          <TicketUploader
            targetCode={code}
            onSuccess={(receiptId) => {
              setUploadingAnother(false);
              /*
                Se abre el ticket que se acaba de subir y se pregunta ahí mismo
                quién lo pagó. Ahora y no luego: quien acaba de hacerle la foto
                tiene el papel en la mano y sabe la respuesta; media hora
                después, en la pantalla de cuentas, ya no se acuerda nadie.
              */
              if (receiptId) {
                setActiveReceiptId(receiptId);
                setPreguntandoTicket({ receiptId });
              }
            }}
          />
        </Sheet>
      )}

      {showJoin && (
        <JoinSheet
          people={state.participants}
          globalProfile={globalProfile}
          conCuenta={Boolean(usuario)}
          ocupado={entrando}
          onGoogle={() => {
            entroDesdeAqui.current = true;
            void entrar();
          }}
          onJoin={join}
          onSaveProfile={saveProfile}
          onClose={() => setJoinOverride(null)}
        />
      )}

      {preguntandoPagador && meId && (
        <PagadorSheet
          revolut={yo?.revolut || globalProfile?.revolut}
          bizum={yo?.bizum || globalProfile?.bizum}
          onPagueYo={() =>
            send("/payers", {
              method: "PATCH",
              body: JSON.stringify({ participantId: meId, receiptId: null, by: meId }),
            })
          }
          onSave={guardarCobro}
          onClose={() => setPreguntandoPagador(false)}
        />
      )}

      {cobrando && yo && (
        <CobroSheet
          revolut={yo.revolut || globalProfile?.revolut}
          bizum={yo.bizum || globalProfile?.bizum}
          onSave={async (datos) => {
            await guardarCobro(datos);
            saveProfile({ 
              revolut: datos.revolut || undefined, 
              bizum: datos.bizum || undefined 
            });
          }}
          onClose={() => setCobrando(false)}
        />
      )}

      {pagoAbierto && cobrandoA && (
        <PagarSheet
          a={cobrandoA}
          cents={pagoAbierto.cents}
          currency={state.ticket.currency}
          place={state.ticket.place}
          volviendoDePagar={!pagandoA}
          onEnviado={(via) => declararPago(pagoAbierto.id, pagoAbierto.cents, via)}
          onAntesDeSalir={() => guardarPagoPendiente(code, pagoAbierto)}
          onClose={() => {
            setPagandoA(null);
            olvidarPagoPendiente(code);
          }}
        />
      )}

      {menuOpen && (
        <HeaderMenuSheet
          ticketClosed={state.ticket.closed ?? false}
          onClose={() => setMenuOpen(false)}
          onComoFunciona={() => setGuiding(true)}
          onHistorial={() => setShowingLog(true)}
          eventos={state.events.length}
          onChangeName={() => {
            if (!yo) {
              setJoinOverride(true);
            } else {
              setEditNameOpen(true);
            }
          }}
          onOtroTicket={!state.ticket.closed ? siEstoyDentro(() => setUploadingAnother(true)) : null}
          soyElPagador={soyElPagador}
          onRemovePayer={
            (!state.ticket.closed && soyElPagador) ? async () => {
              /*
                De todos los tickets que uno haya puesto, no sólo del primero.
                Con dos papeles podías ser el pagador del segundo, y esto
                mandaba limpiar el original: no pasaba nada y parecía roto.
              */
              const mios: (string | null)[] = [
                ...(state.ticket.payerId === meId || yo?.isPayer ? [null] : []),
                ...receipts.filter((r) => r.payerId === meId).map((r) => r.id),
              ];
              for (const receiptId of mios) {
                await send("/payers", {
                  method: "PATCH",
                  body: JSON.stringify({ participantId: null, receiptId, by: meId }),
                });
              }
            } : null
          }
          onConfigPayment={
            (!state.ticket.closed && soyElPagador) ? () => setCobrando(true) : null
          }
          onCloseTicket={
            (!state.ticket.closed && soyElPagador) ? () => patchTicket({ closed: true }) : null
          }
        />
      )}

      {preguntandoTicket && (
        <PagadorTicketSheet
          etiqueta={
            preguntandoTicket.receiptId
              ? (receipts.find((r) => r.id === preguntandoTicket.receiptId)?.label ?? null)
              : state.ticket.place
          }
          participants={state.participants}
          meId={meId}
          conCuenta={Boolean(usuario)}
          payerId={pagadorDelTicket(preguntandoTicket.receiptId)}
          onElegir={(participantId) => {
            void send("/payers", {
              method: "PATCH",
              body: JSON.stringify({
                participantId,
                receiptId: preguntandoTicket.receiptId,
                by: meId,
              }),
            });
          }}
          onClose={() => setPreguntandoTicket(null)}
        />
      )}

      {cambiarPagadorOpen && (
        <CambiarPagadorSheet
          ticket={state.ticket}
          receipts={state.receipts || []}
          people={settlement.byParticipant}
          meId={meId}
          conCuenta={Boolean(usuario)}
          payerOriginal={pagadorDelTicket(null)}
          onUnirme={() => setJoinOverride(true)}
          onSetPayer={async (participantId, receiptId) => {
            let finalParticipantId: string | null = participantId;
            if (receiptId) {
              const r = state.receipts.find((r) => r.id === receiptId);
              if (r?.payerId === participantId) finalParticipantId = null;
            } else {
              if (state.ticket.payerId === participantId || (!state.ticket.payerId && state.participants.find((p) => p.id === participantId)?.isPayer)) {
                finalParticipantId = null;
              }
            }
            await send("/payers", {
              method: "PATCH",
              body: JSON.stringify({ participantId: finalParticipantId, receiptId, by: meId }),
            });
          }}
          onClose={() => setCambiarPagadorOpen(false)}
        />
      )}

      {showStatusPopup && (
        <Sheet onClose={() => setShowStatusPopup(false)}>
          {(() => {
            const faltanPorPagar = settlement.byParticipant.filter(p => p.owesCents > 0 && !p.settled);
            const isCompleted = state.items.length > 0 && settlement.unassignedCents === 0 && faltanPorPagar.length === 0 && settlement.byParticipant.some(p => p.paidCents > 0);

            return (
              <div className="text-center py-6 px-2">
                {isCompleted ? (
                  <>
                    <p className="text-6xl mb-5">🎉</p>
                    <h2 className="mb-3 text-[24px] font-bold tracking-[-0.02em] text-amber">{t.estado.completadoTitulo}</h2>
                    <p className="text-ink-soft mb-8 leading-relaxed">{t.estado.completadoTexto}<br/>{t.estado.completadoRemate}</p>
                  </>
                ) : (
                  <>
                    <p className="text-6xl mb-5">⏳</p>
                    <h2 className="mb-3 text-[24px] font-bold tracking-[-0.02em] text-[#3b82f6]">{t.estado.alDiaTitulo}</h2>
                    <p className="text-ink-soft mb-8 leading-relaxed">
                      {t.estado.alDiaTexto}<br/>
                      {faltanPorPagar.length === 1
                        ? t.estado.faltaUna
                        : rellena(t.estado.faltanN, { n: faltanPorPagar.length })}
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowStatusPopup(false)}
                  className="w-full min-h-[46px] w-full rounded-pieza border border-line text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
                >
                  {t.estado.cerrar}
                </button>
              </div>
            );
          })()}
        </Sheet>
      )}

      {editNameOpen && yo && (
        <EditNameSheet
          currentName={yo.name}
          currentAvatar={yo.avatar}
          currentBizum={yo.bizum}
          currentRevolut={yo.revolut}
          onSave={async (name, avatar, bizum, revolut) => {
            patchParticipant(yo.id, { name, avatar, bizum, revolut });
            saveProfile({ name, avatar, bizum, revolut });
          }}
          onClose={() => setEditNameOpen(false)}
        />
      )}

      {/* Toast Animado: Alguien se ha unido */}
      {newFriend && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+5rem)] z-50 flex justify-center">
          <div 
            key={newFriend.key}
            className="pointer-events-auto flex w-max items-center gap-3 rounded-full border border-amber/40 bg-paper-2/95 px-5 py-2.5 shadow-[0_12px_36px_rgba(232,176,75,0.15)] backdrop-blur-md"
            style={{
              animation: "toast-slide-down 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <Avatar name={newFriend.name} avatar={newFriend.avatar} color={newFriend.color} size={36} />
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-ink">{newFriend.name} {t.comanda.seHaUnido}</span>
              <span className="text-xs font-semibold text-amber">{t.comanda.aLaCuenta} {state.ticket.place || t.comanda.ticketOriginal}</span>
            </div>
            <div className="ml-2 h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_12px_var(--color-mint)]" />
            <style>{`
              @keyframes toast-slide-down {
                0% { transform: translateY(-150px); opacity: 0; }
                10% { transform: translateY(0); opacity: 1; }
                90% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-150px); opacity: 0; }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Los botones de la cabecera: todos del mismo tamaño y en el mismo sitio.
 *
 * Miden 40 px y no los 44 de rigor porque cuatro de 44 con sus huecos no caben
 * en un iPhone junto a la marca, y quedarse sin el escudo o sin el historial es
 * peor que perder cuatro píxeles. Siguen muy por encima del mínimo de 28.
 */
function Redondo({
  children,
  label,
  onClick,
  globo,
  tonoGlobo = "amber",
  escudo = false,
  destacado = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  globo?: number | null;
  tonoGlobo?: "amber" | "gris";
  escudo?: boolean;
  /** El de compartir: relleno, porque es a lo que se viene. */
  destacado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors [&>svg]:h-[19px] [&>svg]:w-[19px] ${
        destacado
          ? "border-amber bg-amber text-paper active:scale-95"
          : escudo
            ? "border-amber/45 bg-amber/10 text-amber hover:bg-amber/20"
            : "border-line text-ink-soft hover:bg-paper-2 hover:text-ink"
      }`}
    >
      {children}
      {globo != null && (
        <span
          className={`tnum absolute -right-[3px] -top-[3px] grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-paper px-1 text-[11px] font-bold ${
            tonoGlobo === "gris" ? "bg-paper-4 text-ink" : "bg-amber text-paper"
          }`}
        >
          {globo}
        </span>
      )}
    </button>
  );
}

/** Una pestaña de ticket. La activa no va rellena: el relleno es para actuar. */
function Pestana({
  children,
  activa,
  sinPagador,
  onClick,
}: {
  children: React.ReactNode;
  activa: boolean;
  sinPagador: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa || undefined}
      /* Con tope: desde que la mesa se puede llamar «Cena de despedida de
         Nuria en el asador», una pestaña sola empujaba el «+ Añadir» fuera de
         la pantalla y había que adivinar que aquello se desplazaba. */
      className={`flex h-10 max-w-[13rem] shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-menudo border px-[15px] text-[13px] font-semibold transition-colors ${
        activa
          ? "border-line bg-paper-3 text-ink shadow-[inset_0_-2px_0_var(--amber)]"
          : "border-line text-ink-faint hover:text-ink"
      }`}
    >
      <span className="truncate">{children}</span>
      {sinPagador && <Sinpagador />}
    </button>
  );
}

/** El aviso de que a ese ticket todavía nadie le ha puesto pagador. */
function Sinpagador() {
  return <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />;
}

/* -------------------------------------------------------------------------- */

/**
 * Lo primero que ve quien entra por el QR o por el enlace.
 *
 * Primero los nombres que ya están apuntados, y sólo debajo el hueco para
 * escribir. Va en ese orden porque desde que se puede apuntar a alguien al
 * repartir un plato, lo normal es que tu nombre ya esté ahí: tocarlo es un
 * gesto y hereda todo lo que te habían marcado mientras no mirabas. El teclado
 * sólo salta solo cuando la lista está vacía y escribir es la única salida.
 */
/**
 * Quién eres, al entrar en una mesa por el enlace o el código.
 *
 * Dos puertas y sólo dos: **con Google** o **como invitado**. Antes eran
 * «Entrar como Ale» y «Entrar como otra persona», que es una pregunta que no
 * se hace nadie —quien abre el enlace no está eligiendo identidad, está
 * entrando a una cena— y que además escondía la cuenta detrás de un botón que
 * ponía otra cosa. Ahora la decisión que se pide es la de verdad: si lo tuyo
 * te sigue de un móvil a otro, o si es sólo para esta mesa.
 *
 * Invitado no significa empezar de cero: si en este móvil ya había un perfil,
 * el formulario sale relleno. Quitar el atajo era lo pedido; hacer teclear el
 * nombre otra vez, no.
 *
 * Con sesión ya abierta no hay puertas que enseñar —se entra solo, desde el
 * efecto de arriba—; si aun así se llega aquí es porque falta el nombre, y
 * entonces esto es directamente el formulario.
 *
 * Se cierra: sale al tocar un plato o «Unirme», y quien sólo estaba mirando
 * tiene que poder volver a mirar. Antes era una hoja fija porque salía sola
 * al llegar y no había mesa que ver detrás; ahora la mesa está a la vista.
 */
function JoinSheet({
  people,
  globalProfile,
  conCuenta,
  ocupado,
  onGoogle,
  onJoin,
  onSaveProfile,
  onClose,
}: {
  people: Participant[];
  globalProfile: { name: string; avatar?: string; bizum?: string; revolut?: string } | null;
  /** Si ya hay sesión: entonces no se ofrece entrar, sólo falta el nombre. */
  conCuenta: boolean;
  ocupado: boolean;
  onGoogle: () => void;
  onJoin: (name: string, avatar?: string, bizum?: string, revolut?: string) => Promise<void>;
  onSaveProfile: (updates: {name: string, avatar?: string, bizum?: string, revolut?: string}) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [invitado, setInvitado] = useState(conCuenta);
  const [name, setName] = useState(globalProfile?.name ?? "");
  const [avatar, setAvatar] = useState(globalProfile?.avatar ?? "");
  const [bizum, setBizum] = useState(globalProfile?.bizum ?? "");
  const [revolut, setRevolut] = useState(globalProfile?.revolut ?? "");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* --------------------------------------------------- las dos puertas */

  if (!invitado) {
    return (
      <Sheet onClose={onClose} cierre titulo={t.entrar.titulo} sub={t.entrar.entradilla}>
        {/* En crema, que es como pide Google que vaya su botón, y lo más claro
            de la pantalla: es la puerta que queremos que se use. */}
        <button
          type="button"
          onClick={onGoogle}
          disabled={ocupado}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-pieza bg-ink text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <G />
          {t.entrar.conGoogle}
        </button>
        <p className="mt-1.5 px-1 text-center text-[12.5px] leading-relaxed text-ink-faint">
          {t.entrar.googleAyuda}
        </p>
        <AvisoTerminos />

        <button
          type="button"
          onClick={() => setInvitado(true)}
          className="mt-4 min-h-[52px] w-full rounded-pieza border border-line bg-paper text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
        >
          {t.entrar.comoInvitado}
        </button>
        <p className="mt-1.5 px-1 text-center text-[12.5px] leading-relaxed text-ink-faint">
          {t.entrar.invitadoAyuda}
        </p>

        <Aviso />
      </Sheet>
    );
  }

  /* ----------------------------------------------------- el formulario */

  return (
    <Sheet
      onClose={onClose}
      cierre
      titulo={conCuenta ? t.entrar.titulo : t.entrar.invitadoTitulo}
      sub={t.entrar.invitadoEntradilla}
    >
      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          const datos = {
            name: name.trim(),
            avatar: avatar || undefined,
            bizum: bizum.trim() || undefined,
            revolut: revolut.trim() || undefined,
          };
          onSaveProfile(datos);
          await onJoin(datos.name, datos.avatar, datos.bizum, datos.revolut);
          setBusy(false);
        }}
      >
        {/* La foto, al lado del nombre y sin rótulo: es el círculo que hay
            junto a cómo te llamas, y se toca. */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={avatar ? t.perfil.cambiarFoto : t.perfil.ponerFoto}
            className="relative shrink-0 rounded-full transition-transform active:scale-95"
          >
            <Avatar name={name || "?"} avatar={avatar} color="#e8b04b" size={52} />
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-paper-2 bg-amber text-paper"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
            </span>
          </button>

          <input
            autoFocus={people.length === 0 && !globalProfile}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.entrar.tuNombre}
            aria-label={t.perfil.tuNombre}
            autoCapitalize="words"
            maxLength={40}
            className="min-h-[52px] w-full min-w-0 rounded-pieza border border-line bg-paper px-4 text-[16px] font-semibold focus:border-amber focus:outline-none"
          />
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setAvatar(await processImageToAvatarBase64(file));
            } catch (error) {
              console.error("Error processing image", error);
            }
          }}
        />

        {avatar && (
          <button
            type="button"
            onClick={() => setAvatar("")}
            className="-mt-2 self-start text-[13px] text-ink-faint underline decoration-line underline-offset-4 transition-colors hover:text-ink"
          >
            {t.perfil.quitarFoto}
          </button>
        )}

        {/*
          Cómo te pagan, aquí y no después.

          Si esta noche pones tú la tarjeta, la mesa necesita esto para
          devolverte de un toque, y preguntarlo entonces es una hoja más en
          mitad de la cena. Opcional y dicho para qué sirve: sin explicar por
          qué, pedirle el móvil a alguien que sólo quiere marcar dos cañas es
          la mejor forma de que cierre la pestaña.
        */}
        <div className="grid gap-2">
          <p className="px-1 text-[13px] font-semibold">{t.entrar.comoTePagan}</p>
          <p className="-mt-1.5 px-1 text-[12px] leading-relaxed text-ink-faint">
            {t.entrar.comoTePaganAyuda}
          </p>
          <input
            value={bizum}
            onChange={(event) => setBizum(event.target.value)}
            placeholder={t.cobro.tuBizum}
            aria-label={t.cobro.tuBizum}
            inputMode="tel"
            maxLength={20}
            className="min-h-[52px] w-full rounded-pieza border border-line bg-paper px-4 text-[16px] focus:border-amber focus:outline-none"
          />
          <div className="flex items-center rounded-pieza border border-line bg-paper px-3.5">
            <span className="shrink-0 text-[15px] text-ink-faint">revolut.me/</span>
            <input
              value={revolut}
              onChange={(event) => setRevolut(event.target.value)}
              placeholder={t.cobro.ejemploRevolut}
              aria-label={t.cobro.tuRevolut}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              className="min-h-[52px] w-full min-w-0 bg-transparent px-1 text-[16px] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="min-h-[52px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {t.entrar.entrar}
        </button>
      </form>

      {/* Volver a las dos puertas. No cuando ya hay sesión: allí no hay dos
          puertas a las que volver, sólo falta el nombre. */}
      {!conCuenta && (
        <button
          type="button"
          onClick={() => setInvitado(false)}
          className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-pieza border border-line text-[15px] font-semibold text-ink-soft transition-colors active:bg-paper-3"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14 6.5 8.5 12l5.5 5.5" />
          </svg>
          {t.entrar.volver}
        </button>
      )}

      <Aviso />
    </Sheet>
  );
}

/**
 * Dónde acaba lo que se teclea aquí.
 *
 * El aviso de privacidad estaba sólo en la portada, y quien abre un enlace de
 * WhatsApp no pasa por la portada: entra directo a escribir su nombre y a
 * subir su cara. Informar en el momento en que se recogen los datos es lo que
 * pide el artículo 13 del RGPD, y además es lo que uno querría saber antes de
 * teclear, no después.
 */
function Aviso() {
  const t = useT();
  return (
    <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-faint">
      {t.entrar.aviso}{" "}
      <Link href="/privacidad" className="underline decoration-line underline-offset-4">
        {t.cookies.privacidad}
      </Link>
    </p>
  );
}

function AddItemSheet({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, qty: number, price: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.comanda.faltaAlgo}</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || parseMoney(price) <= 0) return;
          await onAdd(name.trim(), Math.max(1, Number(qty) || 1), price);
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.varios.otraCana}
          className="w-full rounded-pieza border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            inputMode="numeric"
            aria-label="Cantidad"
            className="tnum w-20 rounded-pieza border border-line bg-paper px-3 py-3 text-center focus:border-amber focus:outline-none"
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            placeholder="2,50"
            aria-label="Precio por unidad"
            className="tnum min-w-0 flex-1 rounded-pieza border border-line bg-paper px-3 py-3 text-right focus:border-amber focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim() || parseMoney(price) <= 0}
          className="w-full min-h-[52px] rounded-pieza bg-amber text-[15px] font-bold text-paper disabled:opacity-40"
        >
          {t.comanda.anadir}
        </button>
      </form>
    </Sheet>
  );
}
