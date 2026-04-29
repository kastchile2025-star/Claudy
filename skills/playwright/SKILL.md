# playwright

Tests E2E con Playwright.

## Cuando aplicar
Tareas que mencionen: `playwright`, `e2e`, `test end-to-end`, `browser test`, `automatizar UI`.

## Reglas
- **Locators sobre selectors crudos**: `page.getByRole('button', { name: 'Save' })` antes que `page.locator('.btn-save')`.
- Orden de preferencia: `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId` > CSS.
- **Auto-waiting**: no agregues `waitForTimeout`. Confia en los locators.
- **Web-first assertions**: `await expect(locator).toBeVisible()`, no `expect(await locator.isVisible()).toBe(true)`.
- Cada test independiente: nada de orden compartido. Usa `beforeEach` para setup.
- Aisla datos: crea fixtures por test, limpia despues.
- `test.describe.configure({ mode: 'parallel' })` cuando los tests son independientes.

## Estructura tipica
```
tests/
  fixtures.ts           # custom fixtures (auth, db)
  auth.spec.ts
  checkout.spec.ts
  pages/                # Page Object Model si el suite crece
    LoginPage.ts
playwright.config.ts
```

## Debug
- `npx playwright test --ui` para el modo interactivo.
- `--trace on` o `trace: 'retain-on-failure'` en config.
- `await page.pause()` para parar y abrir el inspector.

## Anti-patterns
- `waitForTimeout(2000)`. Si tu test lo necesita, hay un bug de espera.
- Asserts despues de `click` sin `await`.
- Reusar storage state entre tests no relacionados.
