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
    // El botón grande de abajo, que dice cosas distintas según lo que te toque.
    quienHaPagadoBoton: "¿Quién ha pagado?",
    seleccionaAlgo: "Toca lo tuyo",
    todoPagadoBoton: "¡Todo pagado! 💸",
    historialTitulo: "Historial",
    opciones: "Opciones",
    quienPagoEste: "¿Quién ha pagado este ticket?",
    pagarTotal: "Pagar {dinero}",
  },

  /* ------------------------------------------ quién pagó un ticket suelto */
  pagadorTicket: {
    titulo: "¿Quién ha pagado {que}?",
    esteTicket: "este ticket",
    aviso:
      "Cada ticket lo puede haber puesto una persona distinta. Con eso, las cuentas de toda la mesa salen solas.",
    loPagueYo: "Lo pagué yo",
    fueOtro: "O fue otro de la mesa",
    ahoraNo: "Ahora no",
  },

  /* ------------------------------------------- el aviso de cómo va la cosa */
  estado: {
    completadoTitulo: "¡Divi completado!",
    completadoTexto: "Todo el mundo ha pagado su parte.",
    completadoRemate: "¡Cuentas claras, amistades largas!",
    alDiaTitulo: "Tú ya estás al día",
    alDiaTexto: "Has pagado tu parte, pero la mesa sigue abierta.",
    faltaUna: "Todavía falta 1 persona por pagar.",
    faltanN: "Todavía faltan {n} personas por pagar.",
    cerrar: "Cerrar",
  },

  /* ----------------------------------------------- el menú de la cabecera */
  menu: {
    titulo: "Opciones de la mesa",
    cambiarPagador: "Cambiar quién ha pagado",
    noPagueYo: "No he pagado yo la cuenta",
    noPagueYoAviso: "La mesa se quedará sin nadie marcado como quien puso el dinero.",
    configurarCobro: "Configurar cómo cobrar",
    editarPerfil: "Editar mi perfil",
    idioma: "Idioma",
    bloquear: "Cerrar la mesa",
    bloquearAviso: "Ya no se podrán añadir ni cambiar consumos. No tiene vuelta atrás.",
    salir: "Salirme de la mesa",
    salirAviso: "Se te quita de la comanda y sueltas todo lo que habías marcado.",
    // Los dos botones de cualquiera de las confirmaciones de arriba.
    si: "Sí, seguir",
    no: "Dejarlo",
  },

  /* ----------------------------------------------------------- tu perfil */
  perfil: {
    titulo: "Editar mi perfil",
    tuNombre: "Tu nombre",
    datosPago: "Datos de pago guardados",
    tuFoto: "Tu foto (opcional)",
    ponteFoto: "Ponte foto de perfil (opcional)",
    subirFoto: "Subir foto…",
    quitarFoto: "Quitar foto",
    cancelar: "Cancelar",
    entrarComo: "Entrar como {name}",
    entrarNuevo: "Entrar como otra persona",
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
    // El picker de pagador se fue al menú, así que el aviso manda al botón.
    sinPagador: "Toca «¿Quién ha pagado?» abajo y aparecerá lo que le debe cada uno.",
    mesaCerrada: "¡Mesa cerrada!",
    mesaCerradaAviso: "Los consumos están registrados y ya no se pueden cambiar.",
    diviCompletado: "¡Divi completado! 🎉",
    diviCompletadoAviso: "Todo el mundo ha pagado su parte. ¡Cuentas claras, amistades largas!",
    debesAName: "Debes a {name}",
    enPaz: "¡Estás en paz!",
    enPazAviso: "Ni debes dinero ni se te debe. Por tu parte está todo.",
    faltaPagadorUno: "Falta decir quién pagó {que}. Hasta entonces estas cuentas no cuadran.",
    faltaPagadorVarios:
      "Faltan {n} tickets por decir quién los pagó. Hasta entonces estas cuentas no cuadran.",
    decirlo: "Decirlo",
    todoCuadrado: "Todo cuadrado",
    todosSaldados: "Todos han saldado su deuda.",
    faltaSaldar: "Falta por saldar",
    faltaDevolver: "Falta por devolverle a {name}",
    faltaDevolverAmi: "Falta que te paguen",
    faltanPorPagarte: "Falta que te paguen",
    yaTeHanPagado: "Ya te han pagado",
    meHaPagado: "Me ha pagado",
    yaMeHaPagado: "Pagado ✓",
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
    debesA: "Debes {dinero} a {name}",
    pagarAhora: "Pagar ahora",
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
    puso: "puso a",
    comoPagador: "como quien pagó la cuenta de",
    sePuso: "se puso como quien pagó la cuenta de",
    pago: "le pagó a",
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
    entradilla: "Comparte el enlace o el QR para que tus amigos se unan a la mesa.",
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
    pagadorEtiqueta: "Pagador/a",
    comoUnirse: "Cómo unirse a la mesa",
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
  consent: {
    aviso: "Una sola cosa: usamos una cookie de Meta para saber si los anuncios que ponemos sirven de algo.",
    igualSiNo: "Repartir la cuenta funciona igual si dices que no.",
    queGuarda: "Qué guarda",
    no: "No, gracias",
    si: "Aceptar",
  },

  /* ------------------------------------------------------- avatar y varios */
  varios: {
    eligeAvatar: "Elige tu foto de perfil",
    otraCana: "Otra caña",
    comanda: "Comanda",
    codigoCorto: "El código tiene al menos 4 caracteres.",
    codigoNoExiste: "No encuentro esa comanda. Revisa el código del ticket.",
  },

  /* --------------------------------------------------- enlace de cookies */
  cookies: {
    cambiar: "Cookies",
  },

  /* ------------------------------------------------------------- cobrar */
  cobro: {
    // La pregunta de quién puso el dinero. «Entera» es la palabra que hace
    // falta: sin ella se confunde con «¿has pagado ya tu parte?».
    pagasteTitulo: "¿Pagaste tú toda la cuenta?",
    pagasteAviso: "Tarjeta o efectivo, da igual: quien puso el dinero en el restaurante.",
    pagueYo: "Sí, pagué yo",
    pagoOtro: "No, pagó otro",

    // Cómo quiere que se lo devuelvan.
    comoTitulo: "¿Cómo quieres que te lo devuelvan?",
    comoAviso:
      "A cada uno le saldrá un botón con su importe ya puesto. DiviFriends no toca el dinero: se abre tu app y ya está.",
    tuRevolut: "Tu usuario",
    tuBizum: "Tu móvil",
    ejemploRevolut: "tu-usuario",
    guardar: "Guardar",
    ahoraNo: "Ahora no",
    listo: "Listo",
    cambiar: "Cambiar cómo cobro",
    malRevolut: "Ese usuario no vale. Es el de revolut.me/tu-usuario, sin la arroba.",
    malBizum: "Escribe un móvil de nueve cifras.",
    algunoAlMenos: "Pon al menos uno de los dos.",
    avisoCompartido: "Lo verá quien tenga el enlace de esta comanda.",

    // Cuando te deben dinero y no has puesto cómo cobrar.
    faltaTitulo: "Falta decir cómo cobrar",
    faltaAviso: "Nadie puede pagarte de un toque hasta que no lo pongas.",
    cobrasPor: "Cobras por {metodos}",
    sinMetodo: "{name} todavía no ha dicho cómo quiere cobrar. Dáselo como podáis y márcalo aquí.",
    ponerlo: "Ponerlo",

    // Pagar.
    pagar: "Pagar",
    pagarA: "Pagarle a {name}",
    conRevolut: "Pagar con",
    conTarjeta: "Pagar con Tarjeta / Apple Pay",
    conBizum: "Pagar por",
    aMano: "Se lo he dado en mano",
    pasosBizum: "Bizum no tiene enlace. Abre tu banco, entra en Bizum y pega esto:",
    movil: "Móvil",
    concepto: "Concepto",
    importe: "Importe",
    copiar: "Copiar",
    copiado: "Copiado ✓",
    seAbre: "Se abre Revolut con el importe y el concepto ya escritos.",

    // Al volver del banco.
    enviadoTitulo: "¿Lo has enviado?",
    enviadoAviso: "Si dices que sí, a {name} le saldrá para confirmar que le ha llegado.",
    siEnviado: "Sí, ya está",
    todaviaNo: "Todavía no",

    // Lo que ve quien cobra.
    diceQuePago: "{name} dice que te ha pagado",
    teHaLlegado: "¿Te ha llegado?",
    siLlego: "Sí, ya está",
    noLlego: "Todavía no",
    esperando: "Esperando a que {name} lo confirme",
    porRevolut: "por Revolut",
    porBizum: "por Bizum",
    enMano: "en mano",
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
