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
| **Agenda** | Calendario por día, turnos con datos del cliente, **confirmar por WhatsApp/email** (mensaje pre-armado), recordatorio, marcar hecho → ficha el corte solo, **bloqueos de horario** | ✅ Hecho y verificado |
| **Reservas públicas** | Página `#/reservar` para el cliente: servicio → barbero → día/hora libre → datos → confirmación. Respeta horario, turnos ocupados y bloqueos | ✅ Hecho y verificado |
| **Stats** | Dashboard por **hoy / semana / mes**: facturado, cortes, promedios, comparativa vs. período anterior, cortes por día, medios de pago, ranking de servicios, horas pico | ✅ Hecho y verificado |
| **Barbería (dueño)** | Panel aparte: total de la barbería, **ranking por barbero**, turnos de hoy de todo el equipo | ✅ Hecho y verificado |
| **Ajustes** | Barberos, servicios y precios, **horario semanal**, link de reservas (copiar), datos de demo, empezar de cero | ✅ Hecho y verificado |
| **Backend (sync + envío automático)** | Supabase (auth + sync), envío real de WhatsApp/email programado | ⏳ Fase 2 |

Build limpio (`npm run build` pasa el typecheck estricto). Verificado de punta a punta en el navegador.

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
