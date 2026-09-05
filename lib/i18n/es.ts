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
    claimMovil: "La cuenta del bar, repartida al céntimo.",
    entradillaMovil: "Una foto al ticket y cada uno marca lo que ha tomado.",
    capturaAlt: "La comanda de DiviFriends: cada línea del ticket, con quién la ha marcado",
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
    asiSeVe: "Cada uno marca lo suyo y ve lo que le toca. Al final sale quién le paga a quién.",
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
    /*
      El resumen del móvil: cuatro líneas sin dibujos.

      Va aparte de los cuatro pasos ilustrados de arriba a propósito. Aquellos
      explican la app entera —incluido lo de juntar varios tickets en una
      cuenta, que se cuenta con un dibujo—; esto son cuatro renglones para
      quien acaba de abrir el enlace y quiere saber en qué se mete.
    */
    resumen: [
      "Le haces una foto al ticket",
      "Seleccionas lo que has tomado",
      "Sale quién le paga a quién",
      "Pagas tu parte con tarjeta, Apple Pay o Bizum",
    ],
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
    boton: "Haz foto al ticket",
    conFoto: "Entrar con una foto",
    conCodigo: "Entrar con un código",
    entraConEl: "¿Te han pasado un código? Entra con él",
    fotoAyuda: "Se lee sola y te abre la mesa.",
    tienesCodigo: "¿Te han pasado un código?",
    preparando: "Preparando la foto…",
    abriendoMesa: "Abriendo la mesa…",
    analizando: "Analizando foto…",
    leyendo: "Leyendo comandas…",
    extrayendo: "Extrayendo precios…",
    finalizando: "Finalizando…",
    mientrasLee: "Mientras lo escribes, la foto se está leyendo sola.",
    preparandoMesa: "Preparando la mesa…",
    tardo: "Tardo unos segundos en reconocer cada línea.",
    cuadrando: "La IA está cuadrando los totales.",
    progreso: "Progreso",
    codigoTitulo: "El código de la mesa",
    codigoAyuda: "Te lo pasa quien haya creado el Divi.",
    otroTicket: "Subir otro ticket",
    fallo: "No ha podido ser",
  },

  /* ------------------------------------------------------- tus divis */
  /* ------------------------------------------------------- tus números */
  resumen: {
    titulo: "Tus números",
    vacio: "Cuando pases por una divi, aquí verás lo que pusiste y quién te debe.",
    entradilla: "Lo que has puesto y lo que te falta por cobrar.",
    teDeben: "Te deben",
    enPaz: "Estás en paz",
    pusiste: "Pusiste",
    tuyo: "De eso, tuyo era",
    adelantaste: "Adelantaste",
    devuelto: "Ya te han devuelto",
    sinDatos: "{n} divis de antes no entran en la cuenta. Se apuntan solas la próxima vez que las abras.",
    sinDatosUna: "Una divi de antes no entra en la cuenta. Se apunta sola la próxima vez que la abras.",
    quienTeDebe: "Quién te debe",
    nadieTeDebe: "Nadie, de momento.",
    debesTu: "Lo que debes tú",
  },

  registro: {
    titulo: "Antes de empezar",
    entradilla:
      "Con cuenta, tu nombre, tus divis y tus avisos te siguen de un móvil a otro. Y te avisamos cuando te paguen.",
    google: "Continuar con Google",
    luego: "Ahora no",
  },
  inicio: {
    hola: "Hola, {name}",
    titulo: "Tus mesas",
    teDeben: "Te deben",
    debes: "Debes",
    abiertas: "Abiertas",
    cuadradas: "Divis cerrados",
    cuadrada: "Divi cerrado",
    editar: "Editar",
    listo: "Listo",
    y: "y",
    personas: "{n} personas",
    primerTitulo: "Haz tu primer divi",
    primerTexto:
      "Foto al ticket, cada uno marca lo suyo desde su móvil y sale quién le paga a quién. La mesa se queda aquí hasta que esté cuadrada.",
    todoCuadrado: "Todo cuadrado.",
    todoCuadradoTexto: "No hay ninguna mesa abierta. Nadie te debe nada y tú no debes nada.",
    nuevaMesa: "Nueva mesa",
  },
  cuentaNueva: {
    titulo: "Tu cuenta, en un minuto",
    entradilla: "Cómo te ven tus amigos y cómo te devuelven el dinero. Se hace una vez.",
    terminosAntes: "He leído y acepto los ",
    terminosEnlace: "términos y condiciones",
    novedades: "Avísame de las novedades de DiviFriends.",
    novedadesNota: "Pocas, útiles y sin spam. Te das de baja cuando quieras.",
    guardar: "Guardar y empezar",
    faltaNombre: "Ponte un nombre: es lo que verá la mesa.",
    faltaUsuario: "Elige un usuario: es con lo que te añaden tus amigos.",
    faltaTerminos: "Para seguir hay que aceptar los términos.",
    sinSesionTitulo: "Primero, entra",
    sinSesionTexto: "Con Google, en un toque. Después eliges tu usuario y cómo te pagan.",
    google: "Continuar con Google",
  },
  /* ------------------------------------------------------ recordar */
  recordar: {
    boton: "Recordárselo por correo",
    titulo: "Recordárselo a {name}",
    entradilla: "Le mandamos un correo con la cifra, la mesa y el enlace. Tú eliges el tono.",
    leLlega: "Le llega por correo, a su cuenta",
    tono: "El tono",
    tonos: {
      neutro: { nombre: "Neutro", muestra: "«Te toca devolverle 12,50 €. Cuando puedas.»" },
      serio: { nombre: "Serio", muestra: "«Sigue esperando 12,50 €. Hoy, si puede ser.»" },
      gracioso: { nombre: "Gracioso", muestra: "«Tus 12,50 € no se han evaporado. Aquí paz.»" },
      agresivo: { nombre: "Agresivo", muestra: "«12,50 €. Hoy. No es un favor, es tu cuenta.»" },
    },
    unaAlDia: "Una vez al día por persona: al segundo intento no sale nada.",
    enviar: "Enviar el correo",
    enviando: "Enviando…",
    mandadoTitulo: "Enviado",
    mandado: "Le llega ahora, con el enlace a la mesa.",
    noMandadoTitulo: "No ha salido",
    repetido: "Ya le has escrito hoy por esta mesa. Mañana puedes otra vez.",
    sinCuenta: "{name} no está registrado en DiviFriends, así que no hay correo al que escribir. Dile que entre con Google y la próxima le llegará.",
    baja: "{name} tiene los correos apagados. Lo verá igual en su campana al abrir la web.",
    tope: "Hoy ya han salido todos los correos que salen. Mañana más.",
    fallo: "No se ha podido mandar. Inténtalo más tarde.",
  },

  misDivis: {
    titulo: "Tus divis",
    donde: "en este móvil",
    enTuCuenta: "en tu cuenta",
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

  /* ------------------------------------------------------------ tu cuenta */
  cuenta: {
    entrar: "Entrar",
    usuario: "Tu usuario",
    usuarioElige: "Elige tu usuario",
    usuarioAyuda: "Con él te añaden tus amigos, en vez de con el código: @usuario. De 3 a 20 letras minúsculas, cifras o guion bajo. Quien lo sepa podrá pedirte amistad, que sigues teniendo que aceptar.",
    usuarioGuardar: "Guardar",
    cambiar: "Cambiar",
    sinVer: "{n} sin ver",
    solicitudes: "{n} por aceptar",
    teHanMetido: "Te han metido en",
    porQuien: "por {name}",
    amigos: "Amigos",
    avisos: "Avisos por correo",
    avisosSi: "encendidos",
    avisosNo: "apagados",
    avisosNota: "Te llega un correo cuando un amigo te mete en una mesa, cuando se cierra y cuando te pagan. Nada más, y nunca publicidad.",
    entrarLargo: "Entrar con Google",
    notificaciones: "Notificaciones",
    notificacionesSub: "Los correos de tus mesas y las novedades de la app. Se encienden y se apagan aquí.",
    novedades: "Novedades de DiviFriends",
    novedadesNota: "De vez en cuando, lo nuevo de la app. Sin publicidad de terceros, y se apaga aquí cuando quieras.",
    terminos: "Términos y condiciones",
    usuarioNota14: "Se puede cambiar una vez cada 14 días.",
    usuarioBloqueado: "Lo cambiaste el {desde}. Podrás cambiarlo otra vez a partir del {hasta}.",
    titulo: "Tu cuenta",
    entradilla: "Tu nombre, tu foto y tus divis te siguen de un móvil a otro.",
    sinPerfil: "Todavía sin nombre",
    editarPerfil: "Editar mi perfil",
    divis: "Tus divis",
    divisN: "{n} en tu cuenta",
    divisCero: "ninguna todavía",
    salir: "Cerrar la sesión",
    salirNota: "Lo de este móvil se queda; en tu cuenta sigue todo.",
    borrar: "Borrar mi cuenta",
    borrarTitulo: "¿Borrar tu cuenta?",
    borrarAviso:
      "Se borran tu perfil y tus divis de la cuenta, y la entrada con Google. Las mesas en las que estuviste no se tocan: son de la mesa, no tuyas.",
    borrarSi: "Sí, borrar",
    borrarNo: "Dejarlo",
    borrarPalabra: "BORRAR",
    borrarEscribe: "Escribe {palabra} para confirmar",
    borrarEntra: "Para borrar tu cuenta, entra con ella primero desde la portada.",
    borrarHecho: "Cuenta borrada. Aquí ya no queda nada tuyo.",
    borrarFallo: "No se ha podido borrar. Inténtalo otra vez.",
    privacidad: "Privacidad y borrado",
    falloTitulo: "No se ha podido entrar",
    apagado: "La entrada con Google no está activada todavía en el servidor.",
    bloqueado: "El navegador ha bloqueado la ventana de Google. Prueba desde Safari o Chrome.",
    sinRed: "Sin conexión. Inténtalo cuando vuelva.",
    otro: "Algo ha fallado al entrar. Inténtalo otra vez.",
    cerrar: "Cerrar",
  },

  /* --------------------------------------------------------------- amigos */
  amigos: {
    titulo: "Tus amigos",
    entradilla: "Con un amigo en la lista, lo metes en la mesa de un toque y le llega el aviso.",
    tuEnlace: "Tu enlace de amigo",
    compartirEnlace: "Mandar mi enlace",
    copiado: "Copiado ✓",
    invitacion: "Añádeme en DiviFriends y nos metemos en la misma mesa de un toque 👇",
    pegaCodigo: "O escribe su @usuario o código",
    pedir: "Pedir",
    pedida: "Pedido. En cuanto acepte, aparece aquí.",
    teLoPiden: "Te lo piden",
    aceptar: "Aceptar",
    rechazarA: "Rechazar a {name}",
    tusAmigos: "Tus amigos",
    ninguno: "Todavía nadie. Manda tu enlace a quien coma contigo a menudo.",
    quitarA: "Quitar a {name}",
    esperando: "Esperando a que acepten",
    sinAceptar: "sin aceptar",
    queVen: "Tus amigos ven tu nombre y tu foto, nunca tu correo.",
    cerrar: "Cerrar",
    // El enlace abierto.
    quiereSerTuAmigo: "{name} quiere añadirte",
    paraQue: "Si aceptas, os podéis meter en la misma mesa de un toque, y te avisará por correo cuando lo haga.",
    aceptarA: "Añadir a {name}",
    entrarParaAceptar: "Entrar con Google para aceptar",
    pedidaA: "Hecho con {name}",
    pedidaAviso: "Si ya erais amigos, ya está. Si no, en cuanto acepte os veréis en la lista.",
    ahoraNo: "Ahora no",
    enlaceRoto: "Este enlace no es de nadie",
    enlaceRotoAviso: "Puede que esté mal copiado, o que esa persona haya borrado su cuenta.",
  },

  /* ------------------------------------------------------------- la campana */
  notificaciones: {
    titulo: "Avisos",
    entradilla: "Lo que ha pasado en tus mesas y con tus amigos.",
    teLoPiden: "Te lo piden",
    avisos: "Lo demás",
    vacio: "Nada todavía. Cuando te metan en una mesa, se cierre o te paguen, sale aquí.",
    cerrar: "Cerrar",
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
    leyendoTicket: "Leyendo el ticket…",
    leyendoAyuda: "Va saliendo solo. Mientras, dile a la mesa que entre.",
    lecturaFallo: "Añade las consumiciones a mano con «Falta algo», o vuelve a probar con otra foto.",
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
    quienPagoEste: "¿Quién lo pagó?",
    pagarTotal: "Pagar {dinero}",
    // La barra de arriba: cuánto lleváis repartido del ticket.
    repartido: "Repartido",
    laMesa: "La mesa",
    // El segmentado que filtra la lista.
    filtrar: "Filtrar la lista",
    filtroTodo: "Todo",
    filtroLibres: "Libres",
    filtroMio: "Lo mío",
    nadaTuyoTitulo: "Todavía no has cogido nada",
    nadaTuyoTexto: "Toca una línea y pulsa «Es mío».",
    nadaLibreTitulo: "Ya no queda nada libre",
    nadaLibreTexto: "Podéis pasar a Cuentas.",
    verTodo: "Ver todo",
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
    // La hoja del escudo: lo que sólo puede hacer quien puso el dinero.
    tituloPagador: "Tú pusiste el dinero",
    entradillaPagador: "Estas opciones sólo las ve quien ha pagado un ticket.",
    opcionesPagador: "Opciones de pagador",
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
    // El aviso al cerrar con cambios sin guardar.
    sinGuardarTitulo: "¿Salir sin guardar?",
    sinGuardarAviso: "Has cambiado algo y todavía no se ha guardado.",
    salirSinGuardar: "Salir sin guardar",
    seguirEditando: "Seguir editando",
    ponerFoto: "Poner tu foto",
    cambiarFoto: "Cambiar tu foto",
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
    yaNo: "Ya no es mío",
    esMio: "Es mío",
    // Lo que la fila dice de tu parte. Antes era «Tuyo ×2 ÷2», que hay que
    // descifrar: ni el ✕ ni el ÷ significan lo mismo para quien no los puso.
    nDeM: "{n} de {total}",
    tuYUnoMas: "Tú y 1 más",
    tuYVariosMas: "Tú y {n} más",
    tuyo: "Tuyo",
    masOpciones: "Más opciones de {name}",
    // Con plantilla porque en inglés el número va delante: «3 left».
    quedanN: "quedan {n}",
  },

  /* -------------------------------------------------- hoja de repartir */
  repartir: {
    todas: "todas",
    deN: "de {n}",
    laOtraAparte: "La otra se queda en su propia línea, para repartirla aparte.",
    lasOtrasAparte: "Las otras {n} se quedan en su propia línea, para repartirlas aparte.",
    todaLaMesa: "Toda la mesa · {n}",
    hueco: "libre",
    quienOcupa: "¿Quién ocupa este hueco?",
    cadaUnoPaga: "Repartido del todo. Cada parte son {dinero}.",
    huecoEspera: "Queda un hueco libre, {dinero}. Se lo queda quien entre después.",
    huecosEsperan: "Quedan {n} huecos libres, {dinero} cada uno. Se los quedan los que entren después.",
    paso: "Paso {n} de {total}",
    cuantasUnidades: "¿Cuántas vas a repartir?",
    cuantasAyuda:
      "Hay {n} en el ticket. Las que dejes fuera se quedan en su propia línea, para repartirlas aparte o que se las quede alguien enteras.",
    entreCuantos: "¿Entre cuántos se reparte?",
    unidadesCambiar: "{n} unidades · cambiar",
    anadeAQuienFalte: "Añade a quien falte",
    anadir: "Añadir",
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
    sinRepartirAviso:
      "Vuelve a la comanda y reparte lo que queda: hasta entonces estas cuentas se quedan cortas.",
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
    leDebes: "Le debes",
    teDebe: "Te debe",
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
    cambioCobro: "cambió su {via} para cobrar",
    renombro: "le puso a la mesa",
    pago: "le pagó a",
  },

  /* --------------------------------------------------------- quién eres */
  entrar: {
    conGoogle: "Entrar con Google",
    googleAyuda: "Tu nombre, tu foto y tus divis te siguen a cualquier móvil.",
    comoInvitado: "Entrar como invitado",
    invitadoAyuda: "Sólo para esta mesa. Se queda en este móvil.",
    invitadoTitulo: "Entrar como invitado",
    invitadoEntradilla: "Sin cuenta y sólo para esta mesa.",
    comoTePagan: "Por si pones tú la tarjeta",
    comoTePaganAyuda: "Si acabas pagando tú, la mesa ve esto y te devuelve de un toque. Puedes dejarlo en blanco.",
    titulo: "¿Quién eres?",
    entradilla: "Para que la mesa sepa qué platos son tuyos.",
    tocaTuNombre: "Toca tu nombre si ya estás en la lista",
    noEstas: "¿No estás? Escríbelo",
    aviso: "Tu nombre y tu foto los verá quien tenga el enlace de esta mesa.",
    tuNombre: "Tu nombre",
    entrar: "Entrar",
    volver: "Volver",
  },

  /* -------------------------------------------------------------- mesa */
  mesa: {
    titulo: "La mesa",
    invitarFallo: "No se ha podido meter. Inténtalo otra vez.",
    anadeAmigo: "Mete a un amigo",
    anadido: "Dentro ✓",
    todosDentro: "Todos tus amigos están ya en la mesa.",
    sinAmigos: "Todavía no tienes amigos añadidos. Se hacen desde «Tu cuenta».",
    entradilla: "Comparte el enlace o el QR para que tus amigos se unan a la mesa.",
    anadeAlguien: "Añade a alguien",
    anadir: "Añadir",
    oQueSeMetan: "O que se metan ellos",
    escanean: "Escanean el QR y marcan lo suyo. No hace falta instalar nada.",
    compartirEnlace: "Compartir enlace",
    copiar: "Copiar",
    copiado: "Copiado ✓",
    imprimir: "Ver el ticket con el QR para imprimir",
    // Cómo se llama la mesa. Va en el enlace, así que es lo que ve quien lo recibe.
    nombreMesa: "Nombre de la mesa",
    ponleNombre: "Ponle nombre a la mesa",
    nombreAyuda: "Es lo que verán tus amigos al recibir el enlace. «BBQ 29 de julio», «Cena de Ana»…",
    nombreEjemplo: "BBQ 29 de julio",
    guardarNombre: "Guardar",
    // El mensaje con el que sale el enlace por WhatsApp.
    invitacion: "Paga tu parte de «{sitio}» aquí 👇",
    invitacionSinNombre: "Repartimos la cuenta aquí 👇 Marca lo que te has tomado y paga tu parte.",
    quienEsta: "Quién está",
    caduca: "Las mesas se borran solas a los 30 días sin usarse.",
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

  /* ------------------------------------------------------ la bienvenida */
  bienvenida: {
    titulo: "Ya tienes cuenta",
    entradilla: "Dos cosas y estás: cómo te encuentran tus amigos y cómo te devuelven el dinero.",
    usuarioAyuda: "Es lo que le das a tus amigos en vez del código.",
    usuarioEjemplo: "tunombre",
    comoTePagan: "Cómo te pagan",
    comoTePaganAyuda:
      "Si un día pones tú la tarjeta, la mesa te devuelve su parte de un toque. Puedes dejarlo para luego.",
    guardar: "Guardar y empezar",
    luego: "Lo hago luego",
  },

  /* ------------------------------------------------------- avatar y varios */
  varios: {
    eligeAvatar: "Elige tu foto de perfil",
    otraCana: "Otra caña",
    comanda: "Comanda",
    codigoCorto: "El código tiene seis caracteres.",
    codigoNoExiste: "El código no es correcto. Revísalo en el ticket.",
  },

  /* --------------------------------------------------- enlace de cookies */
  cookies: {
    avisoLegal: "Aviso legal",
    privacidad: "Privacidad",
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
    esperandoCorto: "Esperando",
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
          "Toca la línea del plato: se abre y salen los botones.",
          "Pulsa <B>Es mío</B>. La línea se pone en ámbar y abajo del todo <B>Lo tuyo</B> va sumando en directo.",
          "Si había varias unidades —tres cañas, por ejemplo— usa el <B>+</B> para ir sumando las tuyas de una en una. Y <B>Ya no es mío</B> para soltarlo si te has colado.",
        ],
      },
      {
        pregunta: "¿Cómo divido un plato entre varios?",
        pasos: [
          "Abre la línea del plato y toca <B>÷ Dividir</B>. Van dos preguntas seguidas.",
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
          "Para quitar una línea o reducir su cantidad: ábrela y toca <B>⋯</B>. El total del ticket baja automáticamente, así que queda anotado en el <B>historial</B> con el nombre de quien lo hizo.",
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
