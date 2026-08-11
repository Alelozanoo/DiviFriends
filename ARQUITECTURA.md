# DiviFriends — informe de arquitectura

Documento para que alguien de fuera (o una IA) entienda el proyecto y pueda
proponer cambios con criterio. Todo lo que hay aquí está verificado contra el
código a 7 de agosto de 2026, no reconstruido de memoria.

---

## 1. Qué es

Una web para repartir la cuenta de un bar o restaurante entre los comensales.

El flujo que resuelve: alguien hace una foto del ticket → una IA lee las líneas
y el total → se crea una «comanda» con un código de 6 caracteres → cada uno
entra por QR o enlace desde su móvil, marca lo que ha comido, y la app calcula
al céntimo cuánto le debe cada uno a quien pagó.

Hay dos maneras de crear una comanda: **subir la foto** desde la portada, o
**escribirla a mano** en `/nueva` (pensado para que un bar la cree desde el TPV).

**Estado:** funcionando en producción, sin usuarios reales todavía.
**Idioma:** todo el producto y el código (comentarios, commits) están en español.

---

## 2. Pila

| | |
|---|---|
| Framework | Next.js **16.3.0**, App Router, Turbopack, rutas tipadas |
| UI | React **19.2.8** con React Compiler, Tailwind CSS **v4** (`@theme inline`) |
| Lenguaje | TypeScript 5, modo estricto |
| Base de datos | Firestore (Firebase, plan Blaze) |
| Lectura de tickets | `@anthropic-ai/sdk` 0.115 → **`claude-opus-5`** con visión |
| QR | `qrcode` 1.5.4 (se genera en el servidor) |
| Pruebas | Runner nativo de Node (`node --test`), **sin dependencias** |

**Dependencias de producción: 6.** No hay gestor de estado, ni librería de
formularios, ni de componentes, ni ORM, ni cliente HTTP. Es deliberado.

---

## 3. Dónde vive

**No hay Cloud Functions ni ningún backend separado.** Esto es lo que más se
malinterpreta del proyecto. Es **una sola aplicación Next.js** desplegada en
**Firebase App Hosting** (Cloud Run por debajo). Los «endpoints» son route
handlers de Next (`app/api/…`) ejecutándose en ese mismo servidor.

| | |
|---|---|
| Proyecto Firebase | `divifriends-2964` |
| Backend App Hosting | `divifriends`, región `europe-west4` |
| URL | `https://divifriends--divifriends-2964.europe-west4.hosted.app` |
| Repositorio | `github.com/Alelozanoo/DiviFriends`, rama `main` |
| Despliegue | **Automático al hacer push a `main`.** No hay comando que ejecutar |
| Configuración | `apphosting.yaml` (viaja con el commit) |
| Escalado | `minInstances: 0`, `maxInstances: 3`, `concurrency: 80`, 1 CPU, 512 MiB |

`minInstances: 0` es a propósito: una comanda se reparte en minutos y luego la
mesa se va, así que no compensa pagar instancias en caliente. Se acepta el
arranque en frío.

`firebase.json` sólo declara las reglas y los índices de Firestore. No existe
carpeta `functions/`.

**Secretos:** `ANTHROPIC_API_KEY` vive en Secret Manager y sólo se inyecta en
RUNTIME (nunca en el bundle). Las variables `NEXT_PUBLIC_FIREBASE_*` sí están en
el repo a propósito: sólo permiten *leer* comandas y las reglas prohíben
escribir desde el cliente.

**Aviso importante:** el desarrollo local (`npm run dev`) usa **el mismo
proyecto de Firebase que producción**. No hay entorno de pruebas separado; una
comanda creada en `localhost` aparece en el sitio publicado y dispara los
listeners en tiempo real de cualquiera que la esté mirando.

---

## 4. Estructura

4.705 líneas de TypeScript. Reparto:

```
app/
  page.tsx                    196  Portada: hero con subida de foto + entrar por código
  layout.tsx                   42  Fuentes, metadatos, plantilla de títulos
  manifest.ts                  26  Manifiesto web (pantalla de inicio)
  nueva/page.tsx               32  Crear comanda a mano
  t/[code]/page.tsx            49  La comanda (server component → SplitApp)
  t/[code]/qr/page.tsx         57  Ticket imprimible con QR (para el bar)
  api/tickets/…                     ver tabla abajo

components/
  SplitApp.tsx                485  Orquestador de toda la pantalla de reparto
  AccountsPanel.tsx           298  Pestaña «Cuentas»: quién pagó, saldos, transferencias
  ItemSheet.tsx               255  Hoja por línea: quién la tomó, ÷ entre N, quitar
  ManualTicketForm.tsx        195  Formulario de /nueva
  TicketUploader.tsx          191  Subida de foto (cámara + galería), redimensiona en canvas
  ItemBubble.tsx              190  La burbuja tocable de cada línea
  TableSheet.tsx              176  «La mesa»: apuntar gente + QR y enlace para compartir
  ui.tsx                       77  Avatar, Stat, Progress, Sheet
  PaperTicket.tsx              75  El ticket en papel (compartido: imprimir + ver)
  MoneyInput.tsx               61  Entrada de dinero con formato español
  JoinByCode.tsx               57  Entrar escribiendo el código
  TicketSheet.tsx              50  Hoja «ver ticket»
  Logo.tsx                     34

lib/
  store.ts                    352  TODAS las mutaciones de Firestore (transaccionales)
  settle.ts                   206  Matemática del reparto. Pura, sin efectos
  ocr.ts                      187  Lectura del ticket con Claude + registro de coste
  ticketDoc.ts                135  Forma del documento + migración de datos viejos
  useTicketSync.ts            127  onSnapshot + superposición optimista
  types.ts                    121  Modelo de dominio
  format.ts                    67  Dinero, códigos, colores, iniciales
  claimRules.ts                54  Réplica en cliente de la regla del servidor
  api.ts                       47  Helpers de respuesta HTTP
  firebaseAdmin.ts             48  Admin SDK (escrituras)
  firebaseClient.ts            34  SDK de cliente (sólo lectura)
  useStoredParticipant.ts      43  Quién eres, en localStorage
  ticketUrl.ts                 26  URL pública + SVG del QR

  settle.test.ts              280  21 pruebas en total
  claim.test.ts               139
```

### API

| Ruta | Métodos |
|---|---|
| `/api/tickets` | `POST` — crear (desde foto o a mano) |
| `/api/tickets/[code]` | `GET`, `PATCH` |
| `/api/tickets/[code]/items` | `POST` |
| `/api/tickets/[code]/items/[itemId]` | `PATCH`, `DELETE` |
| `/api/tickets/[code]/participants` | `POST` |
| `/api/tickets/[code]/participants/[participantId]` | `PATCH`, `DELETE` |
| `/api/tickets/[code]/claims` | `POST` |

**Toda mutación devuelve el estado completo ya recalculado.** No hay respuestas
parciales ni que el cliente tenga que reconciliar nada.

---

## 5. Modelo de datos

**Un ticket = un único documento de Firestore**, en `tickets/{CÓDIGO}`, donde el
código son 6 caracteres. Los platos, los comensales y las reclamaciones son
**arrays dentro de ese documento**, no subcolecciones.

```ts
tickets/{CODE} = {
  place, tableLabel, currency, totalCents, tipCents, createdAt, updatedAt,
  items:        [{ id, name, qty, unitCents, totalCents, splitInto, manualSplit, position }],
  participants: [{ id, name, color, isPayer, paidCents }],
  claims:       [{ itemId, participantId, shares }],
}
```

**Por qué un solo documento:**

1. **Atomicidad gratis.** Dos personas tocando el mismo plato a la vez son dos
   transacciones sobre el mismo documento: Firestore las serializa. Con
   subcolecciones habría que coordinar a mano.
2. **Tiempo real barato.** Un `onSnapshot` por móvil sobre un documento. Con
   subcolecciones serían tres listeners y reconciliación en el cliente.
3. **El estado siempre es coherente.** Nunca se ve media actualización.

**El coste:** el límite de 1 MB por documento. De ahí `LIMITS` en `ticketDoc.ts`
— 200 líneas, 25 comensales, 50 partes por línea — y de ahí que la foto original
**no se guarde** (no cabría).

`docToState()` incluye migración hacia atrás: los documentos creados con el
modelo antiguo (`splitMode: "units" | "shared"`, `units` en vez de `shares`) se
leen igual sin tocar la base de datos.

---

## 6. Seguridad

El reparto de permisos es asimétrico y deliberado:

```
firestore.rules:
  tickets/{code}:
    allow get:    if true      ← cualquiera con el código puede leer
    allow list:   if false     ← nadie puede enumerar la colección
    allow create, update, delete: if false   ← el navegador NO escribe
```

**El navegador sólo lee.** Todas las escrituras van por la API de Next, que usa
el Admin SDK y se salta las reglas. Así la validación —no reclamar más partes de
las que hay, un único pagador, los topes de tamaño— vive en un sitio donde nadie
puede saltársela desde la consola del móvil.

**El código de 6 caracteres es la única llave.** No hay cuentas ni contraseñas.
Es la misma suposición que hace el QR impreso en un ticket de papel: quien lo
tiene, es porque estaba en la mesa. Los únicos datos personales son el nombre de
pila que cada uno escribe.

---

## 7. La lógica de dominio

Esta es la parte donde una revisión aporta más, así que va con detalle.

### El modelo de reparto: un solo número

Cada línea tiene un `splitInto`: **en cuántas partes se divide**. Ese número solo
describe todos los casos:

| Situación | `splitInto` | Resultado |
|---|---|---|
| 3 cañas | 3 | cada uno coge la suya |
| Una paella | 1 | se la queda quien la marque |
| Paella «entre 4» | 4 | tu parte vale 1/4 **desde el primer toque** |

Ese último punto es lo importante: al elegir «entre 4» tu parte queda fijada al
momento, sin esperar a que los otros tres se apunten. Antes había dos conceptos
(`splitMode: "units" | "shared"`) y dos ramas de cálculo; unificarlo en un número
colapsó la matemática a un solo camino.

`manualSplit` distingue si el reparto lo pidió una persona («entre 4») o es el
valor por defecto. Importa al soltar: un reparto pedido a mano se respeta.

### El cálculo (`lib/settle.ts`, puro y sin efectos)

1. **Por línea:** los pesos son las partes de cada uno más las partes libres.
   `splitCents()` reparte con el **método del resto mayor**, así que la suma es
   siempre exactamente el importe de la línea. Todo el dinero son enteros de
   céntimos; no hay ni un `float` en la contabilidad.
2. **Extras:** `ticket.totalCents − suma de las líneas + propina`. Es el
   servicio, el IVA no desglosado o un descuento. Se prorratea **en proporción a
   lo que ha consumido cada uno**, con lo no asignado como un peso más.
3. **Saldos:** `pagado − debe` por persona.
4. **Transferencias:** el que más debe le paga al que más adelantó, en cascada.
   Da el mínimo de transferencias para saldar la mesa.

### La regla de reclamar (`setClaim` en `store.ts`)

**Nunca se dan más partes de las que quedan libres.** Esto cambió tras un fallo
real: una línea de 9 cervezas (18 €) partida entre 2, alguien con su mitad (9 €),
y el botón `+` la puso en 18 € de un toque — porque «una parte» de esa línea son
cuatro cervezas y media, no una cerveza.

Antes la línea **crecía sola** para hacer hueco a quien la tocaba (el
«auto-compartir»). Eso es exactamente lo que cobra de más sin avisar, así que se
quitó. Ahora entrar en algo que ya tiene dueño se pide a propósito con el `÷`.

Consecuencias en la interfaz:
- Una línea llena no se deja tocar (pero sí soltar la tuya).
- El contador `− n +` sólo aparece cuando cada parte es una unidad de verdad
  (`splitInto === qty`).
- La burbuja dice «9,00 € **de 18,00 €**» para que se vea que pagas un trozo.

### Borrar una línea baja el total

No es obvio y es fácil equivocarse: si borras una línea y el total no baja, su
importe reaparece como «extras» prorrateados entre todos. La línea desaparece de
la pantalla y **todos la siguen pagando**.

La regla es: el total baja lo que costaba la línea, **pero nunca por debajo de lo
que suman las líneas que quedan**. Ese tope cubre el caso contrario — quitar algo
añadido a mano, o inventado por la lectura de la foto, no arrastra el total
impreso hacia abajo. Cuatro pruebas cubren los dos sentidos.

---

## 8. Tiempo real y sensación de instantáneo

`useTicketSync.ts` hace dos cosas:

1. **`onSnapshot`** sobre `tickets/{code}`. Si falta la configuración pública de
   Firebase, cae a un sondeo de 3 s contra `GET /api/tickets/[code]`.
2. **Superposición optimista.** Al tocar una burbuja, el cambio se pinta antes de
   que salga la petición, y se mantiene **encima** del estado del servidor hasta
   que éste confirma. Sin eso, una actualización de otro móvil llegando a mitad
   de tu toque borraría tu pulsación de la pantalla para devolverla medio segundo
   después.

Para que la superposición no mienta, `claimRules.ts` es una **réplica exacta en
cliente** de `setClaim` del servidor. Son dos implementaciones de la misma regla
que hay que mantener sincronizadas — es la deuda técnica más clara del proyecto.
Medido: 132 ms de toque a pintado.

---

## 9. La lectura del ticket

`lib/ocr.ts`: `claude-opus-5` con visión, `effort: "medium"`, salida estructurada
(`output_config.format` con `json_schema`), `max_tokens: 16000`. El navegador
redimensiona la foto a 2000 px y la reescribe como JPEG en un canvas antes de
subirla (eso convierte de paso el HEIC de iOS).

`normalize()` rellena huecos previsibles: si falta el precio unitario lo deduce
del total de línea y viceversa, y **si el total es incoherente cae a la suma de
las líneas**. Ese contraste suma-vs-total es un validador que ahora mismo no se
está aprovechando (ver huecos, más abajo).

**Coste medido** (mismo ticket, las cinco configuraciones acertaron las 6 líneas):

| Configuración | Coste | Latencia |
|---|---|---|
| `claude-opus-5` · medium · 2000px (**producción**) | **2,96 ¢** | 10,1 s |
| `claude-opus-5` · low · 1200px | 1,67 ¢ | 8,1 s |
| `claude-sonnet-5` · low · 1200px | 0,67 ¢ | 4,4 s |
| `claude-haiku-4-5` · 1200px | 0,32 ¢ | 8,3 s |
| `claude-haiku-4-5` · 800px | **0,22 ¢** | 5,5 s |

`logCost()` registra el coste de cada lectura en los logs. Es la única variable
que crece con los usuarios. **Aviso:** era un ticket sintético y limpio; una foto
arrugada con reflejos es otra cosa y ahí Haiku se dejará líneas.

---

## 10. Pruebas

`npm test` → runner nativo de Node con stripping de tipos, **cero dependencias**.
21 pruebas, todas sobre la lógica de dinero:

- `settle.test.ts` — reparto, resto mayor, extras, propina, transferencias,
  detección de cobro de más, y los cuatro casos de borrar una línea.
- `claim.test.ts` — la regla de reclamar, incluido el caso de las 9 cervezas.

**No hay pruebas de componentes ni end-to-end.** La verificación de interfaz se
ha hecho conduciendo Chrome por CDP a mano durante el desarrollo (pulsando de
verdad, comprobando que nada quede tapado), no de forma automatizada.

---

## 11. Decisiones ya tomadas

Para no volver a proponerlas:

| Decisión | Razón |
|---|---|
| Un documento por ticket, no subcolecciones | Atomicidad y un solo listener |
| El cliente no escribe en Firestore | La validación no debe poder saltarse |
| Sin auth ni cuentas | El código es la llave, como el QR del papel |
| Dinero en enteros de céntimos | Nunca perder ni inventar un céntimo |
| Sin auto-compartir al tocar una línea llena | Cobraba de más sin avisar |
| La foto original no se guarda | No cabe en el documento; Storage está sin montar |
| Sin librería de componentes ni de estado | 6 dependencias en total, a propósito |
| El SVG del logo (208 KB) no es el favicon | Se usa PNG; a 32 px se ve igual |

---

## 12. Huecos conocidos — aquí es donde se agradecen consejos

Por orden de gravedad:

1. **Falta App Check en `POST /api/tickets`.** Ya hay topes de uso
   (`lib/rateLimit.ts`): 20 lecturas/hora por IP y **300 al día en total**,
   contadas en Firestore de forma transaccional para que valgan entre las tres
   instancias. Eso acota el daño máximo a ~9 €/día. Lo que sigue faltando es
   distinguir a la app de un script: App Check es el mecanismo diseñado para eso,
   y necesita pasos en la consola de Firebase además de código. El tope por IP va
   holgado a propósito porque el wifi de un bar y el CGNAT móvil hacen que mucha
   gente comparta IP.
2. **Local y producción comparten base de datos.** No hay entorno de desarrollo.
3. **Las comandas no caducan.** Se acumulan en Firestore para siempre, con los
   nombres de pila dentro. No hay borrado programado ni política de retención.
4. **Cualquiera con el código de 6 caracteres puede editar**, incluido borrar
   líneas y quitar comensales. El espacio de códigos es pequeño; no se ha
   evaluado si es enumerable por fuerza bruta a un ritmo razonable.
5. **`claimRules.ts` duplica la lógica de `setClaim`.** Si se separan, la pantalla
   miente durante el medio segundo que tarda el servidor. No hay ninguna prueba
   que verifique que las dos siguen coincidiendo.
6. **La cascada de OCR no está implementada.** `normalize()` ya puede detectar una
   lectura mala (la suma de las líneas no cuadra con el total impreso), así que se
   podría leer con Haiku y reintentar con Opus sólo cuando falle. Bajaría la
   factura ~90 % sin perder precisión. Está propuesto y sin hacer.
7. **Sin observabilidad.** Sólo `console.info` del coste. No hay métricas, ni
   trazas, ni alertas, ni forma de saber cuántas comandas se completan.
8. **Sin pruebas de interfaz.** Toda la lógica de pantalla —el reparto óptimista,
   las hojas, los estados bloqueados— está sin cubrir.
9. **No se guarda la foto**, así que no se puede volver al papel original cuando
   la lectura se equivoca. Necesitaría Firebase Storage + reglas + borrado.
10. **La primera carga es lenta** por `minInstances: 0`. Aceptado a cambio del
    coste, pero no se ha medido cuánto penaliza a alguien escaneando un QR en un
    bar con mala cobertura.

---

## 13. Hacia dónde va

El objetivo declarado es **vender a TPVs y restaurantes**: que el bar imprima el
QR junto al total y la mesa se reparta sola. La web donde cualquiera sube una
foto existe como **canal de distribución**, no como el negocio — llegar a un TPV
con «esto ya lo usan N mesas» es una conversación muy distinta a llegar con una
demo.

Repartir cuentas entre amigos monetiza mal por sí solo (Splitwise, Tricount): se
usa a ráfagas y quien sube la foto le está haciendo un favor al grupo, así que
cobrarle es cobrarle a la peor persona posible. En España tampoco hay margen que
capturar en el pago, porque Bizum es gratis. De ahí que bajar el coste variable
a casi cero sea estratégico y no una micro-optimización.
