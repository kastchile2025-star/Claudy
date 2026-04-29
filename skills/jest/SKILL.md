# jest

Tests unitarios con Jest (o Vitest, mismo API en su mayoria).

## Cuando aplicar
Tareas que mencionen: `jest`, `vitest`, `unit test`, `mock`, `spy`, `test.spec`.

## Reglas
- Un comportamiento por test. Nombre describe el efecto: `it('returns 0 when input is empty')`.
- AAA: **Arrange, Act, Assert** separados por linea en blanco.
- Usa `describe` para agrupar por funcion/feature, no por capa.
- Mockea **fronteras** (HTTP, DB, fs), no tu propio codigo. Si necesitas mockear demasiado, el diseno tiene un problema.
- `beforeEach(() => jest.clearAllMocks())` para evitar fuga entre tests.
- Asserts especificos: `toEqual` para deep equal, `toBe` para identidad, `toMatchObject` para subset.
- Snapshots **inline** (`toMatchInlineSnapshot()`) cuando tiene sentido. Snapshots externos solo para output grande estable.
- Coverage NO es objetivo, es indicador. 80% bien escogido > 100% basura.

## Async
```ts
it("resolves user", async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe("Ada");
});
```

## Mocks tipicos
```ts
jest.mock("./api", () => ({ getUser: jest.fn() }));
const { getUser } = await import("./api");
(getUser as jest.Mock).mockResolvedValue({ id: 1, name: "Ada" });
```

## Anti-patterns
- Tests que prueban implementacion en vez de comportamiento (rompen al refactorizar sin cambio funcional).
- `expect(true).toBe(true)` despues de un setup sin asserts del comportamiento real.
- Snapshots de UI complejos que nadie revisa al actualizar.
