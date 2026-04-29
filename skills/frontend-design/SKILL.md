# frontend-design

Generar UI de alta calidad sin caer en "AI slop" generico (gradientes morados, glassmorphism aleatorio, layouts vacios).

## Cuando aplicar
Tareas que mencionen: `disenar UI`, `componente UI`, `pagina`, `landing`, `dashboard`, `frontend design`, `hero section`, `CTA`.

## Antes de escribir codigo: 4 preguntas
1. **Quien lo usa?** (publico, herramienta interna, dev tool)
2. **Que accion principal hace?** Una sola.
3. **Que jerarquia de info necesita?** Lista 1-2-3 elementos por orden de importancia.
4. **Que estado vacio / error / loading espera?** Si no lo defines, sale generico.

## Reglas anti-slop
- **Especificidad** sobre genericidad. "Card de producto SaaS B2B" tiene mas constraints que "card bonita".
- **Jerarquia visual real**: 1 elemento dominante, 2-3 secundarios, el resto soporte. Si todo grita, nada grita.
- **Whitespace generoso pero intencional**. No padding 6 en todo "porque queda limpio".
- **Tipografia con escala** (12 / 14 / 16 / 20 / 24 / 32 / 48). Maximo 2 familias.
- **Paleta acotada**: 1 primary, 1-2 neutrals, 1 accent, semanticos (success/warn/error). Eso es todo.
- **Estados completos** en cada componente: default, hover, active, disabled, focus-visible, loading, error, empty.
- **Datos realistas** en mocks, no "Lorem ipsum" + "Card 1, Card 2".
- **Mobile design real**, no solo `flex-col` y rezar.

## Stack default
- React + TypeScript estricto
- Tailwind CSS + `class-variance-authority` para variants
- Componentes primitivos: shadcn/ui o Radix UI sin estilos
- Iconos: lucide-react
- Animacion: framer-motion (con moderacion)
- Forms: react-hook-form + zod

## Patrones recomendados
- **shadcn-style**: copia componentes a tu repo, no dependas de una lib pesada.
- **Compound components** para flexibilidad: `<Card><Card.Header>...</Card.Header></Card>`.
- **`asChild` pattern** (Radix) para componer sin div extra.
- **Variants tipadas** con cva, no condicionales de strings.

## Red flags = AI slop
- Hero "Build the future" + gradiente purple-to-pink + esfera 3D random.
- Cards uniformes con icono + titulo + parrafo lorem en grid 3x2 sin jerarquia.
- Todo `rounded-2xl`, `shadow-xl`, `bg-gradient`.
- Glassmorphism sin razon.
- Stats falsos: "10M users", "99.9% uptime" en una landing de demo.
- Iconos genericos para conceptos abstractos (rocket = launch, diamond = premium).

## Checklist antes de entregar
- [ ] Cada estado del componente esta cubierto.
- [ ] Mobile real, no solo `md:` para que escale.
- [ ] Contraste cumple WCAG AA (ver skill `accessibility`).
- [ ] Foco visible y navegable por teclado.
- [ ] Datos de mock realistas y narrativos.
- [ ] No hay prop `style` inline cuando hay clase utility.
