# accessibility

Accesibilidad web (a11y) practica para WCAG AA.

## Cuando aplicar
Tareas que mencionen: `accessibility`, `a11y`, `aria`, `screen reader`, `contraste`, `wcag`.

## Reglas
- **HTML semantico primero**. `<button>` para acciones, `<a>` para navegar. Nunca `<div onClick>`.
- **Cada input** con `<label>` asociado (`htmlFor`/`id`) o `aria-label`.
- **Foco visible** en todo elemento interactivo. Nunca `outline: none` sin reemplazo.
- **Orden de tabulacion** siguiendo el flujo visual. Evita `tabIndex` positivo.
- **Contraste**: minimo 4.5:1 texto normal, 3:1 texto grande. Verifica con DevTools o axe.
- **Alt text** util en imagenes informativas. `alt=""` en imagenes decorativas.
- **Headings jerarquicos** sin saltos: `h1 -> h2 -> h3`, no `h1 -> h4`.
- **No solo color** para transmitir info (rojo/verde para error/ok -> tambien icono o texto).

## ARIA (cuando HTML no alcanza)
- Primer regla de ARIA: **no uses ARIA si HTML semantico funciona**.
- `aria-label` para botones con solo icono.
- `aria-expanded`, `aria-controls` para disclosure / menus.
- `aria-live="polite"` para anunciar cambios dinamicos sin interrumpir.
- `role="alert"` para errores que deben anunciarse YA.
- `aria-current="page"` en el link activo del nav.

## Formularios
- Errores asociados al input con `aria-describedby`.
- `aria-invalid="true"` en campos con error.
- Mensajes claros, no solo "Invalido". "Email debe tener un @" mejor.
- `<fieldset>` + `<legend>` para grupos de radios/checks.

## Testing
- **Teclado solamente**: navega tu app sin mouse. Si te trabas, hay bug.
- Lector de pantalla: VoiceOver (Mac), NVDA (Windows), TalkBack (Android).
- Automatizado: `axe-core`, `eslint-plugin-jsx-a11y`, Lighthouse.
- Ningun automatizado detecta el 100%. Combinalo con manual.

## Anti-patterns
- Modal sin trap de focus ni `Escape` para cerrar.
- Iconos clickeables sin `aria-label`.
- Placeholder como unico label.
- `tabIndex={-1}` en cosas que el usuario debe poder enfocar.
