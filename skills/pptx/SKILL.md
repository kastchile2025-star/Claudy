# pptx

Crear presentaciones PowerPoint (.pptx) programaticamente.

## Cuando aplicar
Tareas que mencionen: `pptx`, `powerpoint`, `presentacion`, `slides`, `deck`, `pitch deck`.

## Stack
```bash
pip install python-pptx
```

## Estructura basica
```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)  # 16:9

# Layout 5 = blank
slide = prs.slides.add_slide(prs.slide_layouts[5])

# Titulo
title = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12), Inches(1))
tf = title.text_frame
tf.text = "Q1 2026 Resultados"
tf.paragraphs[0].font.size = Pt(36)
tf.paragraphs[0].font.bold = True

prs.save("deck.pptx")
```

## Reglas de diseno (importan tanto como el codigo)
- **Una idea por slide.** Si tiene 3 ideas, son 3 slides.
- **Texto: max 6 lineas / 6 palabras por linea.** Mas que eso = nadie lee.
- **Tipografia escala**: titulo 28-44pt, body 18-24pt, footnotes 12-14pt. Nunca <12pt.
- **Contraste alto**: oscuro sobre claro o viceversa. Nada de gris claro sobre blanco.
- **Imagenes a sangre** (ocupan todo el slide) o con padding generoso. Nada en medias tintas.
- **Una paleta**: 1 color primario, 1 acento, neutros. Maximo 4 colores totales.
- **Charts > tablas** para tendencias. Tabla solo si los numeros exactos importan.
- **Sin clipart** ni iconos low-res. Lucide / Heroicons / Phosphor son seguros.

## Patrones tipicos

### Title slide
- Logo arriba o esquina
- Titulo grande centrado
- Subtitulo / fecha / autor abajo

### Content slide
- Titulo izquierda
- Body con bullets cortos O imagen + caption
- Footer con paginacion + nombre del deck

### Data slide
- 1 chart dominante
- 2-3 takeaways como bullets a un lado

## Snippets utiles

### Imagen full-bleed
```python
slide.shapes.add_picture("hero.jpg", 0, 0, prs.slide_width, prs.slide_height)
```

### Tabla
```python
rows, cols = 4, 3
table = slide.shapes.add_table(
    rows, cols,
    Inches(1), Inches(2), Inches(11), Inches(4)
).table
table.cell(0, 0).text = "Mes"
table.cell(0, 1).text = "Ventas"
table.cell(0, 2).text = "Crecimiento"
```

### Chart (bar)
```python
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

data = CategoryChartData()
data.categories = ["Ene", "Feb", "Mar"]
data.add_series("2026", (12000, 15000, 18500))

slide.shapes.add_chart(
    XL_CHART_TYPE.COLUMN_CLUSTERED,
    Inches(1), Inches(2), Inches(11), Inches(4.5),
    data
)
```

## Anti-patterns
- Slide con 200 palabras y un titulo arriba.
- Animaciones que rotan/aparecen/giran sin razon.
- Logos de clientes en grid 6x4 con stretch (ninguno se respeta).
- Charts 3D, pie charts con 12 slices, ejes sin etiquetas.
- "Thank you" como ultima slide vacia. Mejor recap + contacto + Q&A.
