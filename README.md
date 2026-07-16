# Corte

**Gestión para barberías.** El barbero **ficha cada corte** (día, horario, servicio, medio de pago),
maneja su **agenda de turnos** con los datos del cliente, comparte un **link de reservas** (Instagram /
WhatsApp) para que los clientes se agenden solos, **bloquea horarios** (cursos, trámites) y mira un
**dashboard de estadísticas**. El dueño tiene además un **panel aparte** con los números de todo el
equipo. Local-first, offline, PWA instalable. Mobile-first, pensada para usar con el dedo.

Marca: **Carbón `#221F1A`** + **Oro `#C79A3B`**, tipografías **Cabinet Grotesk** (títulos, Fontshare) +
**Inter** (cuerpo, Google Fonts).

---

## Estado del proyecto

| Módulo | Qué incluye | Estado |
|---|---|---|
| **Fichar** | Anotar cada corte en 2 toques (servicio, precio, hora, medio de pago, cliente opcional). Lista del día, editar/borrar, resumen efectivo/transferencia | ✅ Hecho y verificado |
| **Agenda (tipo Google Calendar)** | Grilla de horarios por día (bloques posicionados por hora, línea de "ahora", **tap para crear**) + vista lista. Turnos con datos del cliente, **confirmar por WhatsApp/email**, recordatorio, marcar hecho → ficha el corte solo, **bloqueos de horario** | ✅ Hecho y verificado |
| **Google Calendar** | Conectás tu cuenta (Google Identity Services, sin backend) y cada turno se crea/actualiza/cancela en tu Google Calendar con el cliente como invitado y `sendUpdates=all` → **Google manda la invitación y los recordatorios al cliente y al barbero**. Fallback "Agregar a Google Calendar" (deep link) si no está conectado | ✅ Hecho y verificado |
| **Reservas públicas** | Página `#/reservar` para el cliente: servicio → barbero → día/hora libre → datos → confirmación. Respeta horario, turnos ocupados y bloqueos | ✅ Hecho y verificado |
| **Stats (premium)** | Dashboard por **hoy / semana / mes**: hero con facturado + tendencia (área con degradado) y comparativa, KPIs (cortes, ticket promedio, promedio/día), actividad por día, medios de pago (donut), servicios más pedidos, horas pico | ✅ Hecho y verificado |
| **Barbería (dueño)** | Panel aparte: facturado del local, **comisiones a pagar y neto de la barbería**, detalle **por barbero** (facturado · comisión % · neto), turnos de hoy de todo el equipo | ✅ Hecho y verificado |
| **Asistente IA + Feedback** | Burbuja flotante con **chat IA** (función serverless → API de Claude, con la key segura en el server) que ayuda a usar la app y responde sobre tus números, y una solapa de **feedback**. Fallbacks: FAQ local sin API key, mail si no hay webhook | ✅ Hecho y verificado |
| **Ajustes** | Barberos (+ **% de comisión**), servicios y precios, **horario semanal**, **conectar Google Calendar** (Client ID + pasos), link de reservas (copiar), datos de demo, empezar de cero | ✅ Hecho y verificado |
| **Backend (sync entre dispositivos + envío programado)** | Supabase (auth + sync), para que las reservas del cliente entren desde su teléfono y el recordatorio se mande solo | ⏳ Fase 2 |

Build limpio (`npm run build` pasa el typecheck estricto). Verificado de punta a punta en el navegador.

### Conectar Google Calendar (una vez, gratis)

La sincronización real corre **desde el navegador** con Google Identity Services (no hay backend
ni secretos). Hace falta un **OAuth Client ID** de Google:

1. [console.cloud.google.com](https://console.cloud.google.com) → nuevo proyecto.
2. APIs y servicios → Biblioteca → activá **Google Calendar API**.
3. Pantalla de consentimiento OAuth → **Externo** → cargá tu mail.
4. Credenciales → Crear → **ID de cliente OAuth** → **Aplicación web**.
5. En **Orígenes de JavaScript autorizados** pegá el dominio de la app (Vercel).
6. Copiá el Client ID y pegalo en **Ajustes → Google Calendar → Conectar**.

El Client ID **no es secreto** (va en el frontend). El token de acceso vive ~1 h en el dispositivo;
al vencer, la app lo vuelve a pedir en silencio. Sin Client ID, cada turno ofrece un link
"Agregar a Google Calendar" como respaldo manual.

### Asistente IA + Feedback (burbuja flotante)

La burbuja de abajo a la derecha abre un chat con un **asistente IA** y una solapa de **feedback**.
Corren sobre dos **funciones serverless** (`api/chat.ts`, `api/feedback.ts`) para no exponer secretos.
Variables de entorno en **Vercel → proyecto vacio → Settings → Environment Variables**:

| Variable | Para qué | Si falta |
|---|---|---|
| `ANTHROPIC_API_KEY` | Asistente IA real (API de Claude, modelo `claude-haiku-4-5`). | La burbuja responde con una **ayuda básica (FAQ)** local. |
| `FEEDBACK_WEBHOOK_URL` | Recibir el feedback en un webhook (p. ej. Discord). | El feedback cae a **abrir un mail** a `feedbackEmail` (o al mail por defecto). |

La API key **solo vive en el server** (nunca en el navegador). El asistente puede usar un resumen de
tus números (facturado/servicios del período) para responder preguntas sobre el negocio.

---

## Arrancar

```bash
npm install
npm run dev      # desarrollo
npm run build    # producción → dist/
npm run preview  # previsualizar el build
```

## Stack y decisiones tomadas

- **Vite 5 + React 18 + TypeScript** · **Tailwind CSS v3** · **Dexie.js** (IndexedDB) · **vite-plugin-pwa**.
- **Sin backend todavía.** Todo es local-first con Dexie. El sync entre dispositivos y el envío
  automático de WhatsApp/email son de la **Fase 2**.
- **Los avisos al cliente hoy son semi-automáticos:** la app abre WhatsApp (`wa.me`) o el mail
  (`mailto:`) con el mensaje **ya escrito**; el barbero solo toca *enviar*. Cuando entre el backend,
  pasan a mandarse solos y programados (recordatorio automático el día antes).
- **La página de reservas vive en el mismo dispositivo** (ruteo por hash `#/reservar`). Es 100%
  funcional para demostrar el flujo; para que un cliente reserve desde **su** teléfono y caiga en tu
  agenda hace falta el backend (Fase 2). El link ya está listo para compartir.
- **Planes (a futuro):** **Pro** = Fichar + Agenda + Stats simples. **Full** = multi-barbero con panel
  del dueño avanzado, sync y envío automático.

## Los tres pilares

1. **Fichar** (home): la función principal. Terminás un corte, lo anotás. Queda separado por día y
   por horario, con su medio de pago. Alimenta todas las estadísticas.
2. **Agenda**: turnos a futuro con los datos del cliente. Se confirman/recuerdan por WhatsApp o email.
   Cuando el turno se hace, se marca "hecho" y **se ficha como corte automáticamente**. Los horarios
   se pueden **bloquear** (de tal hora a tal hora) para cursos u otras cosas.
3. **Reservas del cliente**: el link que va en el perfil de Instagram. El cliente elige y el turno
   cae en la agenda del barbero (marcado como "reservó por el link").

## Modelo de datos (Dexie v1)

Todas las tablas llevan `uuid · updatedAt` (listo para el sync de la Fase 2, last-write-wins).

- **barberos**: `uuid, nombre, emoji?, orden, activo`
- **servicios**: `uuid, nombre, precio, duracionMin, emoji?, orden, activo`
- **cortes**: `uuid, fecha, dia, barberoUuid, servicioUuid, servicioNombre, precio, medioPago,
  clienteNombre?, turnoUuid?` — `servicioNombre` y `precio` son **snapshot**: si después cambiás el
  servicio, el historial no se toca.
- **turnos**: `uuid, dia, hora, duracionMin, barberoUuid, servicioUuid, servicioNombre, precio,
  clienteNombre, clienteTelefono?, clienteEmail?, estado, origen (barbero|cliente), nota?`
- **bloqueos**: `uuid, dia, desde, hasta, motivo?, barberoUuid`
- **config**: `nombreBarberia, barberoActivoUuid, esDuenio, horario[7], duracionTurnoDefault,
  onboardingCompletado`

## Estructura

```
src/
├─ db/            Dexie: db.ts, types.ts, config.ts, barberos.ts, servicios.ts, cortes.ts,
│                 turnos.ts, bloqueos.ts, demo.ts (datos de ejemplo)
├─ lib/           Lógica pura: fecha.ts, format.ts, uuid.ts, agenda.ts (slots/solapes),
│                 stats.ts (agregados del dashboard), mensajes.ts (wa.me / mailto)
├─ data/          serviciosIniciales.ts (onboarding)
├─ components/    UI compartida: Header/Pantalla, BottomNav, Sheet, Campo, BarberoChips, Iconos, Logo
└─ features/      onboarding · fichar · agenda · reservar · stats · duenio (panel) · ajustes
                  Cada feature con su *.copy.ts (todos los textos, en rioplatense informal).
```

## Deploy

- Repo: **github.com/lucianobrocchi/vacio**. `netlify.toml` y `vercel.json` ya configurados
  (build `npm run build`, publish `dist`, redirect SPA a `index.html`).
- Como es HTTPS, ahí se **instala como app** (Add to Home Screen) y anda **offline** después de la
  primera carga.

---

## Roadmap (lo que sigue)

1. **Fase 2 — backend**: Supabase (auth + sync last-write-wins entre el teléfono del barbero y el del
   dueño), y que las **reservas del cliente** caigan de verdad en la agenda desde otro dispositivo.
2. **Envío automático**: WhatsApp / email de confirmación y **recordatorio programado** (el día antes).
3. **Multi-sucursal** y permisos por rol (dueño / barbero).
4. **Más stats**: clientes que más vuelven, tasa de ausentismo (no-shows), proyección del mes.

## Para retomar en otra conversación

- Todo el código está en el repo, rama `claude/barbershop-app-rebuild-mvtfya`. Build verificado y
  smoke test de navegador pasado (onboarding → fichar → demo → stats → panel dueño → agenda →
  reservar).
- **Para ver la app llena:** Ajustes → "Cargar datos de demo" (~3 semanas de cortes + turnos + un
  bloqueo). No es destructivo; se saca con "Empezar de cero".
- Convención: textos de UI siempre en archivos `*.copy.ts` por feature; español rioplatense informal
  (vos, tocá, fichá, la plata).
- Próximo paso natural: **Fase 2 — backend** (Supabase), para sync real y que las reservas del cliente
  entren desde su propio teléfono.
