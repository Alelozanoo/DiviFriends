# Tipografías para la estampa del enlace

Estos dos ficheros son sólo para `app/t/[code]/opengraph-image.tsx`, la imagen
que sale al pegar el enlace de una mesa en WhatsApp.

**Por qué están aquí y no salen de `next/font`.** `next/font/google` deja los
ficheros en `.next` en formato **woff2**, y Satori —el motor que dibuja la
estampa— no lo entiende: sólo lee TTF, OTF y WOFF. Descargarlos en cada
petición tampoco vale, porque una llamada a Google desde el servidor añade
latencia y falla justo cuando WhatsApp está esperando la imagen. Así que van
en el repo, en TTF.

Son las mismas dos de la app, así que la estampa se ve como la app.

| Fichero | Familia | Licencia |
| --- | --- | --- |
| `SpaceGrotesk-Bold.ttf` | Space Grotesk 700 | SIL Open Font License 1.1 |
| `JetBrainsMono-Bold.ttf` | JetBrains Mono 700 | SIL Open Font License 1.1 |

La OFL permite redistribuirlas dentro de un proyecto como éste. Sólo está el
peso 700 de cada una: la estampa no usa ningún otro, y cada peso extra son
cien kilobytes que hay que desplegar para nada.

Origen: `fonts.gstatic.com`, servidos por la API de Google Fonts al pedir el
CSS con un *user agent* antiguo, que es como se consigue el TTF en vez del
woff2.
