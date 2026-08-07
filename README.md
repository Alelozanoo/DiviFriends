# DiviFriends

Repartir la cuenta de un bar sin calculadora ni discusiones. El cliente escanea
el QR impreso en el ticket, ve la comanda de su mesa en el móvil, marca lo que se
ha comido y la app dice al momento cuánto le debe a quien pagó.

## Cómo se usa

**Como comensal:** subes una foto del ticket en la portada (o entras con el código
de 6 caracteres). Escribes tu nombre y tocas los platos que son tuyos. Las líneas
totalmente repartidas se van plegando en «Ya repartido». En la pestaña *Cuentas*
aparece lo que le debe cada uno al pagador.

**Como bar:** creas la comanda en `/nueva` (a mano o desde la foto) e imprimes
`/t/CÓDIGO/qr`, que es el ticket con el QR listo para papel de 80 mm.

## Arrancar

```bash
npm install
cp .env.example .env.local     # rellena las claves (ver abajo)
npm run dev
```

La lectura de tickets usa **Claude Opus 5** con visión y salida estructurada.
Sin `ANTHROPIC_API_KEY` todo lo demás sigue funcionando: la app avisa y te manda
a escribir la comanda a mano.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Tests del reparto (`node --test`, sin dependencias extra) |
| `npm run lint` | ESLint |
| `firebase deploy --only firestore:rules` | Publica las reglas de seguridad |

## Firestore

Los datos viven en Firestore, un documento por comanda en `tickets/{CÓDIGO}`.

**Por qué un solo documento y no subcolecciones:** una mesa tiene decenas de
líneas, no miles, así que el documento se queda muy por debajo del límite de
1 MiB. A cambio se gana lo que aquí importa: un único `onSnapshot` sincroniza
toda la pantalla, y cada cambio es una transacción sobre un solo documento —
o sea atómica de verdad, así que dos personas tocando el mismo plato a la vez
no se pisan.

**Quién escribe:** sólo el servidor, con el Admin SDK, desde las rutas de
`app/api`. El navegador únicamente *lee* en directo. Eso mantiene la validación
(no reclamar más unidades de las que hay, un único pagador, los topes de tamaño)
donde nadie puede saltársela desde la consola del móvil. Las reglas de
[`firestore.rules`](firestore.rules) lo hacen cumplir: leer una comanda concreta
sí, listar la colección no, escribir no.

Si no pones la configuración `NEXT_PUBLIC_FIREBASE_*`, la app sigue funcionando
con sondeo cada 3 s en vez de tiempo real.

### Montarlo desde cero

```bash
firebase projects:create mi-divifriends
firebase firestore:databases:create "(default)" --project mi-divifriends --location eur3
firebase apps:create WEB "DiviFriends Web" --project mi-divifriends
firebase apps:sdkconfig WEB <appId>          # → las NEXT_PUBLIC_FIREBASE_*
firebase deploy --only firestore:rules --project mi-divifriends
```

En local, el Admin SDK usa las credenciales de `firebase login`. En App Hosting
no hace falta configurar nada: el backend corre con una cuenta de servicio que
ya tiene acceso a Firestore y `applicationDefault()` la coge sola.

## Desplegar (Firebase App Hosting)

La configuración del backend vive en [`apphosting.yaml`](apphosting.yaml) y viaja
con el commit. La clave de Anthropic **no** está ahí: vive en Secret Manager
(`anthropic-api-key`) y se inyecta sólo en tiempo de ejecución.

```bash
# 1. Sube el repo a GitHub
git remote add origin git@github.com:<usuario>/divifriends.git
git push -u origin main

# 2. Crea el backend (abre el navegador para autorizar GitHub la primera vez)
firebase apphosting:backends:create --project divifriends-2964 --location europe-west4

# 3. Da acceso al secreto a la cuenta de servicio del backend
firebase apphosting:secrets:grantaccess anthropic-api-key --project divifriends-2964 --backend <nombre>
```

A partir de ahí, cada push a la rama conectada despliega solo.

## Cómo reparte

Todo el dinero se mueve en **céntimos enteros**; nunca hay floats en juego.

- **Por unidades** (por defecto): de un `3 × Caña` cada uno coge las suyas. Lo que
  nadie reclama se queda «sin asignar» y la app lo canta.
- **Compartido**: la línea se parte a partes iguales entre quienes se apuntan.
  Un plato de 10 € entre tres son 3,34 / 3,33 / 3,33 — nunca 9,99.
- **Servicio, impuestos y descuentos**: la diferencia entre el total impreso y la
  suma de las líneas se reparte en proporción a lo que ha consumido cada uno.
- **Propina**: se añade sobre el total y se reparte igual.
- **Liquidación**: quien más debe le paga a quien más adelantó, con el mínimo
  número de transferencias.

El reparto de céntimos usa el método del resto mayor, así que la suma de las
partes es **siempre** exactamente el total. `lib/settle.ts` es una función pura
sin dependencias: corre igual en el servidor y en el navegador, y es lo que
permite que la pantalla reaccione al instante mientras el servidor confirma.

## Estructura

```
app/
  page.tsx                     portada, con el subidor de tickets en el hero
  nueva/                       alta manual de comanda (flujo del bar)
  t/[code]/                    la webapp de reparto
  t/[code]/qr/                 ticket imprimible con el QR
  api/tickets/...              API REST; toda mutación devuelve el estado entero
components/                    UI
lib/
  settle.ts                    la matemática del reparto (+ settle.test.ts)
  ocr.ts                       lectura del ticket con Claude
  store.ts                     operaciones sobre Firestore, todas transaccionales
  ticketDoc.ts                 forma del documento, compartida servidor/navegador
  firebaseAdmin.ts             Admin SDK (escrituras)
  firebaseClient.ts            SDK del navegador (sólo lectura en directo)
  useTicketSync.ts             onSnapshot + superposición optimista
firestore.rules                quién puede leer y escribir
```

## Detalles de implementación

- **Sincronía entre móviles**: un `onSnapshot` sobre el documento de la comanda.
  Lo que marcas se pinta al instante y **se mantiene superpuesto** hasta que el
  servidor confirma, así una actualización de otro móvil no borra tu pulsación a
  media transición. Sin configuración pública de Firebase cae a sondeo de 3 s.
- **Identidad**: quién eres se guarda en `localStorage` por comanda. Sin cuentas
  ni registro. Si te borran de la mesa, la app se da cuenta y te lo pregunta otra vez.
- **Fotos**: el navegador reescala a 2000 px y reescribe a JPEG antes de subir, lo
  que además convierte el HEIC del iPhone.

## Lo que falta para producción

- Los códigos de comanda no caducan ni se limpian; conviene una función
  programada que borre los documentos con más de X días.
- Cualquiera con el código puede editar la comanda. Suficiente para una mesa,
  insuficiente si se expone a internet abierto.
- Sin App Check, la clave pública del navegador permite leer cualquier comanda a
  quien adivine un código de 6 caracteres. Es el mismo riesgo que dejarse el
  ticket en la mesa, pero conviene saberlo.
