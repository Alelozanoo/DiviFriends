/**
 * El texto de la app, en español.
 *
 * Éste es el original: el inglés se escribe contra este objeto y TypeScript
 * canta si falta una clave o sobra. Así no se puede desplegar media traducción
 * sin enterarse, que es como acaban todas.
 *
 * Las claves van por pantalla y no por palabra suelta. Un diccionario plano de
 * «aceptar», «cerrar», «listo» parece más limpio pero acaba obligando a que la
 * misma palabra sirva en sitios donde no encaja, y en un idioma con género eso
 * se nota enseguida.
 */
/* Sin `as const` a propósito: congelaría cada frase como su propio tipo y el
   inglés no podría decir otra cosa. Lo que se quiere comprobar son las claves,
   no los valores. */
export const es = {
  /* ------------------------------------------------------------- portada */
  home: {
    claim: "La cuenta se reparte",
    claimAmber: "sola",
    tituloLargo: "La cuenta se reparte",
    tituloLargoAmber: "antes de pedir la segunda",
    entradilla:
      "Cada uno marca lo que se ha comido desde su móvil, sobre la misma comanda. Sin calculadoras, sin «yo solo tomé la caña», sin nadie poniendo de más.",
    sellos: ["Gratis", "Sin registro", "Sin instalar"],
    empiezaAqui: "Empieza aquí",
    pieLema: "reparte la cuenta sin discutir",
    comoFunciona: "¿Cómo funciona?",
  },

  /* ------------------------------------------------- los cuatro pasos */
  pasos: {
    titulo: "Cómo funciona",
    entradilla: "De la foto del papel a quién le paga a quién.",
    uno: {
      title: "Le haces una foto",
      foot: "El ticket se convierte en la lista, plato a plato.",
    },
    dos: {
      title: "¿Otro sitio? Otro ticket",
      foot: "La carne de una tienda y las bebidas de otra, en la misma cuenta.",
    },
    tres: {
      title: "Tocas lo que has tomado",
      foot: "Lo compartido se parte solo entre quienes lo pidieron.",
    },
    cuatro: {
      title: "Sale quién le paga a quién",
      foot: "Aunque haya puesto la tarjeta uno distinto en cada sitio.",
    },
    entendido: "Entendido",
    // Los rótulos de dentro de los dibujos.
    total: "Total",
    totalMesa: "Total de la mesa",
    pago: "pagó",
    loTuyo: "Lo tuyo",
    libre: "libre",
    entre: "entre",
    tu: "TÚ",
    faltaPorSaldar: "Falta por saldar",
    recibeDe: "Recibe de",
    a: "a",
  },

  /* --------------------------------------------------------- subir foto */
  subir: {
    titulo: "Sube la foto del ticket",
    boton: "Subir foto",
    conCodigo: "Entrar con un código",
    preparando: "Preparando la foto…",
    analizando: "Analizando foto…",
    leyendo: "Leyendo comandas…",
    extrayendo: "Extrayendo precios…",
    finalizando: "Finalizando…",
    tardo: "Tardo unos segundos en reconocer cada línea.",
    cuadrando: "La IA está cuadrando los totales.",
    progreso: "Progreso",
    codigoTitulo: "El código de la mesa",
    codigoAyuda:
      "Seis caracteres. Están en el ticket impreso o te los pasa quien creó el Divi.",
    otroTicket: "Subir otro ticket",
  },

  /* ------------------------------------------------------- tus divis */
  misDivis: {
    titulo: "Tus divis",
    donde: "en este móvil",
    verTodos: "Ver los",
    teDeben: "te deben",
    loTuyo: "lo tuyo",
    a: "a",
    cuadrado: "cuadrado ✓",
    cerrarTitulo: "¿Cerrar",
    cerrarAviso:
      "Se quita de esta lista. La comanda sigue viva y puedes volver a ella con el enlace o el código.",
    cerrarSi: "Sí, cerrar",
    cerrarNo: "Dejarlo",
    ahoraMismo: "ahora mismo",
    haceMin: "hace {n} min",
    haceH: "hace {n} h",
    ayer: "ayer",
    haceDias: "hace {n} días",
  },

  /* ------------------------------------------------------------ comanda */
  comanda: {
    tocaLoQueHasComido: "Toca lo que has comido",
    faltan: "Faltan",
    todoRepartido: "Todo repartido",
    verTicket: "Ver ticket",
    cambios: "Cambios",
    faltaAlgo: "Falta algo",
    compartir: "Compartir",
    comoFunciona: "Cómo funciona",
    cuentas: "Cuentas",
    volverComanda: "Comanda",
    unirme: "Unirme",
    sinRepartir: "Sin repartir",
    loTuyo: "Lo tuyo",
    ticketOriginal: "Ticket Original",
    anadir: "+ Añadir",
    seHaUnido: "se ha unido",
    aLaCuenta: "A la cuenta",
    sinConexion: "Sin conexión. Los cambios no se están guardando.",
    errorGuardar: "No se ha podido guardar el cambio.",
    errorApuntar: "No se ha podido apuntar a nadie más.",
    errorSeparar: "No se han podido separar esas unidades.",
  },

  /* -------------------------------------------------------- una línea */
  linea: {
    dividir: "Dividir",
    quedan: "quedan",
    tus: "tus",
    de: "de",
    entre: "entre",
    completo: "completo",
    quitarUnidad: "Quitar una unidad de",
    anadirUnidad: "Añadir una unidad de",
    repartirEntreVarios: "Repartir {name} entre varios",
    quitarDeLaComanda: "Quitar {name} de la comanda",
  },

  /* -------------------------------------------------- hoja de repartir */
  repartir: {
    paso: "Paso {n} de {total}",
    cuantasUnidades: "¿Cuántas vas a repartir?",
    cuantasAyuda:
      "Hay {n} en el ticket. Las que dejes fuera se quedan en su propia línea, para repartirlas aparte o que se las quede alguien enteras.",
    lasN: "las {n}",
    entreCuantos: "¿Entre cuántos se reparte?",
    entreCuantosAyuda: "Debajo de cada número, lo que costaría cada parte.",
    otroNumero: "otro número",
    repartirBoton: "Repartir",
    unidadesCambiar: "{n} unidades · cambiar",
    volverAUnidades: "Volver a {n} unidades sueltas",
    dejarDeCompartir: "Dejar de compartirlo",
    conQuien: "¿Con quién lo compartes?",
    conQuienAyuda:
      "Toca a los de la mesa. A quien falte, apúntalo abajo: se encontrará su nombre esperándole cuando entre por el enlace.",
    entreCambiar: "Entre {n} · cambiar",
    anadeAQuienFalte: "Añade a quien falte",
    anadir: "Añadir",
    quedanSinDueno: "Quedan {libres} de {total} sin dueño: {dinero} que todavía no paga nadie.",
    repartidasUnidades: "Repartidas las {n} unidades · {dinero} cada una.",
    repartidoEntre: "Repartido entre {n} · {dinero} cada uno.",
    seguirConQuien: "Seguir · ¿con quién?",
    listo: "Listo",
    cerrar: "Cerrar",
    unidades: "unidades",
    quitarleUnidad: "Quitarle una unidad a",
    darleUnidad: "Darle otra unidad a",
  },

  /* --------------------------------------------------- quitar una línea */
  quitar: {
    titulo: "¿Quitar",
    sinTocar: "Baja la cantidad con el contador, o quítalo entero de la comanda.",
    desaparece: "Desaparece de la comanda",
    yQuienLaTenia: "y quien la tenía marcada deja de pagarla",
    yLasPersonas: "y las {n} personas que la tenían marcada dejan de pagarla",
    seQuedaEn: "Se queda en {n}.",
    totalNoCambia: "El total del ticket no cambia.",
    totalBaja: "El total baja a",
    cantidad: "Cantidad",
    anotado: "Queda anotado en el historial de la mesa, con tu nombre y la hora.",
    eliminar: "Eliminar plato",
    dejarloEn: "Dejarlo en {n}",
    dejarla: "Dejarla",
  },

  /* ------------------------------------------------------------ cuentas */
  cuentas: {
    totalMesa: "Total de la mesa",
    marcaPagador: "Marca abajo quién puso la tarjeta y aparecerá lo que le debe cada uno.",
    todoCuadrado: "Todo cuadrado",
    todosSaldados: "Todos han saldado su deuda.",
    faltaSaldar: "Falta por saldar al bote",
    faltaDevolver: "Falta por devolverle a {name}",
    sinAsignar: "Hay {dinero} sin asignar en la comanda",
    yaHanSaldado: "{n} de {total} ya han saldado su balance",
    quienHaPagado: "¿Quién ha pagado {que}?",
    laCuenta: "la cuenta",
    nadieEnLaMesa: "Todavía no hay nadie en la mesa.",
    ojoSinDueno:
      "Ojo: quedan {dinero} sin dueño. Vuelve a la comanda y repártelos, o las cuentas de abajo se quedan cortas.",
    ojoDeMas: "Ojo: hay {dinero} repartidos de más. Revisa el total o las cantidades.",
    seLeDebe: "Se le debe",
    noDebeNada: "No debe nada",
    hePagado: "He pagado",
    haPagado: "Ha pagado",
    pagado: "Pagado ✓",
    recibe: "Recibe",
    de: "de",
    totalDelTicket: "Total del ticket",
    historial: "Historial de la mesa",
    sinCambios: "Nadie ha quitado ni añadido nada",
    nCambios: "{n} cambios en la cuenta",
    unCambio: "1 cambio en la cuenta",
    avisoCobrar: "Cuando alguien te dé su parte, toca «Ha pagado» en su fila.",
    extras: "de servicio o impuestos",
    descuento: "de descuento",
    extrasNota:
      "{dinero} {que} entre la suma de los platos y el total. Se reparte entre todos en proporción a lo que ha tomado cada uno.",
  },

  /* ---------------------------------------------------------- historial */
  historial: {
    titulo: "Historial",
    entradilla: "Todo lo que ha cambiado la cuenta, con quién lo hizo.",
    vacio:
      "Nadie ha quitado ni añadido nada todavía. La comanda está tal y como se leyó del ticket.",
    quito: "quitó",
    anadio: "añadió",
    de: ", de",
    cambioTotal: "cambió el total de",
    aTotal: "a",
    cerrar: "Cerrar",
  },

  /* --------------------------------------------------------- quién eres */
  entrar: {
    titulo: "¿Quién eres?",
    entradilla: "Para que la mesa sepa qué platos son tuyos.",
    tocaTuNombre: "Toca tu nombre si ya estás en la lista",
    noEstas: "¿No estás? Escríbelo",
    tuNombre: "Tu nombre",
    entrar: "Entrar",
    soloMirando: "Sólo estoy mirando",
  },

  /* -------------------------------------------------------------- mesa */
  mesa: {
    titulo: "La mesa",
    entradilla: "Apunta a quien esté contigo y ve marcando lo que ha tomado cada uno.",
    anadeAlguien: "Añade a alguien",
    anadir: "Añadir",
    oQueSeMetan: "O que se metan ellos",
    escanean: "Escanean el QR y marcan lo suyo. No hace falta instalar nada.",
    compartirEnlace: "Compartir enlace",
    copiar: "Copiar",
    copiado: "Copiado ✓",
    imprimir: "Ver el ticket con el QR para imprimir",
    cerrar: "Cerrar",
    tu: "(tú)",
    quitarDeLaMesa: "Quitar a {name} de la mesa",
  },

  /* ------------------------------------------------------------- ticket */
  ticket: {
    titulo: "El ticket",
    entradilla: "Lo que se leyó del papel. Si algo no cuadra, se corrige desde la comanda.",
    compartir: "Compartir ticket",
    imprimir: "Imprimirlo con el QR",
    cerrar: "Cerrar",
    sinLineas: "No queda ninguna línea.",
    servicio: "Servicio / imp.",
    descuento: "Descuento",
    total: "Total",
    repartidLaCuenta: "Repartid la cuenta",
    escaneaOEntra: "Escanea o entra en divifriends y mete el código",
    mensaje:
      "La cuenta {sitio}: {total}. Entra y marca lo que has tomado tú, que sale solo lo que le toca a cada uno:",
    deLaMesa: "de la mesa",
    del: "de",
    descargado: "Imagen descargada y mensaje copiado.",
    descargadoSolo: "Imagen descargada.",
    noSePudo: "No se ha podido compartir. Copia el enlace desde «Compartir».",
  },

  /* --------------------------------------------------- comanda a mano */
  aMano: {
    titulo: "Nueva comanda",
    entradilla:
      "Apunta lo que hay en la mesa. Al guardar obtienes el QR y el código para que los comensales se repartan la cuenta desde su móvil.",
    volver: "Volver",
  },

  /* -------------------------------------------------------- por código */
  codigo: {
    etiqueta: "Código de la comanda",
    entrar: "Entrar",
    buscando: "Buscando…",
    noExiste: "Esa comanda no existe.",
  },

  /* ------------------------------------------------------------ cookies */
  cookies: {
    cambiar: "Cookies",
  },

  /* --------------------------------------------------------------- guia */
  guia: {
    titulo: "Cómo funciona",
    entradilla: "Toca una pregunta para desplegarla.",
    entendido: "Entendido",
    preguntas: [
      {
        pregunta: "¿Cómo marco lo que me he tomado?",
        pasos: [
          "Toca la tarjeta del plato. Se pone en ámbar y aparece tu ficha.",
          "Vuelve a tocarla para soltarlo si te has colado. Abajo del todo, <B>Lo tuyo</B> va sumando en directo.",
          "Si había varias unidades —tres cañas, por ejemplo— usa el <B>+</B> para ir sumando las tuyas de una en una.",
        ],
      },
      {
        pregunta: "¿Cómo divido un plato entre varios?",
        pasos: [
          "Toca <B>÷ Dividir</B> en la tarjeta del plato. Van dos preguntas seguidas.",
          "<B>Entre cuántos.</B> Debajo de cada número tienes lo que costaría cada parte. Tu parte queda fijada ahí mismo, sin esperar a que se apunte nadie.",
          "<B>Con quién.</B> Toca a los de la mesa, y a quien no esté lo apuntas ahí mismo escribiendo su nombre.",
          "A quien apuntes le saldrá su nombre esperándole cuando entre por el enlace: sólo tiene que tocarlo y hereda lo que le marcaste.",
        ],
      },
      {
        pregunta: "¿Falta algo, o sobra?",
        pasos: [
          "Para añadir un plato suelto: el recuadro de puntos <B>+ Falta algo</B>, al final de la lista.",
          "Para añadir otro ticket entero a la misma cuenta: pulsa <B>+ Añadir</B> en la barra superior.",
          "Para quitar una línea o reducir su cantidad: la <B>✕</B> de su esquina. El total del ticket baja automáticamente, así que queda anotado en el <B>historial</B> con el nombre de quien lo hizo.",
          "Si el total leído no cuadra con el papel, se corrige en <B>Cuentas</B>, en <B>Total del ticket</B>.",
        ],
      },
      {
        pregunta: "¿Cómo meto a los demás?",
        pasos: [
          "Arriba a la derecha, <B>Compartir</B>. Sale el QR y el enlace de la mesa.",
          "Cada uno entra desde su móvil, escribe su nombre y marca lo suyo sobre la misma comanda.",
          "También puedes apuntarlos tú desde ahí y marcar lo que ha tomado cada uno.",
        ],
      },
      {
        pregunta: "¿Y al final, quién paga?",
        pasos: [
          "En <B>Cuentas</B>, marca quién ha pagado cada ticket de la lista.",
          "Sale lo que le debe cada uno, de más a menos. Cuando le devuelvas lo tuyo, toca <B>He pagado</B>.",
          "Quien pagó ve el balance de todos: los que deben pagar están en negro y los que tienen saldo a su favor en verde.",
        ],
      },
    ],
  },
};

export type Dict = typeof es;
