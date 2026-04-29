# xlsx

Crear y manipular archivos Excel (.xlsx, .xlsm, .csv) programaticamente.

## Cuando aplicar
Tareas que mencionen: `excel`, `xlsx`, `xlsm`, `csv`, `spreadsheet`, `hoja de calculo`, `tabla`, `formulas`.

## Stack por lenguaje

### Python
```bash
pip install openpyxl pandas
```
- **`openpyxl`** para crear/editar `.xlsx` con formato, formulas, charts, validaciones.
- **`pandas`** para data tabular grande, joins, transformaciones. Usa `df.to_excel()` con `engine="openpyxl"`.
- Para leer **rapido y solo valores**: `pd.read_excel("file.xlsx", engine="openpyxl")`.
- Para leer **manteniendo formulas**: `openpyxl.load_workbook("file.xlsx")`.

### Node.js / TypeScript
```bash
npm install exceljs
```
- **`exceljs`** soporta lectura/escritura con estilos, formulas, imagenes, validacion.
- Streaming para archivos grandes: `WorkbookWriter` y `WorkbookReader`.

## Reglas
- **Headers en primera fila**, congelarla con `freeze_panes` / `views.frozen`.
- **Tipos correctos**: numeros como numero (no string), fechas como `datetime`, no string.
- **Formulas como string** que empiezan con `=`: `cell.value = "=SUM(A1:A10)"`. Excel las evalua al abrir.
- **Anchos de columna** ajustados al contenido (no todo `width=10`).
- **Estilos** definidos una vez como variables, aplicados por celda. No copiar diccionarios.
- **Hojas con nombre util** ("Ventas Q1 2026" mejor que "Sheet1").
- **Tablas formales** con `Table` para que Excel reconozca rangos y permita filtros.

## Snippets utiles

### Python (openpyxl)
```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
ws = wb.active
ws.title = "Resumen"

# Headers con estilo
headers = ["Producto", "Cantidad", "Precio", "Total"]
for col, h in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=h)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="305496")

# Data + formula
ws.append(["Manzana", 10, 1.5, "=B2*C2"])
ws.append(["Pera", 8, 2.0, "=B3*C3"])
ws.append(["TOTAL", "", "", "=SUM(D2:D3)"])

# Anchos auto
for col in ws.columns:
    max_len = max(len(str(c.value or "")) for c in col)
    ws.column_dimensions[col[0].column_letter].width = max_len + 2

ws.freeze_panes = "A2"
wb.save("resumen.xlsx")
```

### CSV
```python
import csv
with open("data.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["a", "b", "c"])
    w.writerow([1, 2, 3])
```
- `utf-8-sig` agrega BOM para que Excel abra acentos bien.
- `newline=""` en Python para evitar lineas duplicadas en Windows.

## Anti-patterns
- Concatenar CSV a mano sin escapar comas/comillas.
- Guardar fechas como strings tipo "2026/04/29" en una columna que despues nadie puede sumar.
- Hojas de 100k filas sin filtros, sin congelar header.
- Estilos hardcodeados celda por celda en loop (lento + ilegible).
