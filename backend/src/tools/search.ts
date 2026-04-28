export async function webSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    if (!response.ok) {
      return `Error en busqueda: ${response.status}`;
    }

    const html = await response.text();

    // Simple extraction of result titles and snippets
    const results: string[] = [];
    const resultRegex = /<a[^>]+class="result__a"[^>]*>(.*?)<\/a>/gi;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/gi;

    const titles: string[] = [];
    let match;
    while ((match = resultRegex.exec(html)) !== null) {
      const title = match[1].replace(/<[^>]+>/g, "").trim();
      if (title) titles.push(title);
      if (titles.length >= 5) break;
    }

    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      const snippet = match[1].replace(/<[^>]+>/g, "").trim();
      if (snippet) snippets.push(snippet);
      if (snippets.length >= 5) break;
    }

    for (let i = 0; i < Math.min(titles.length, snippets.length); i++) {
      results.push(`${i + 1}. ${titles[i]}\n   ${snippets[i]}`);
    }

    if (results.length === 0) {
      return "No se encontraron resultados. Intenta con terminos mas especificos.";
    }

    return `Resultados de busqueda para "${query}":\n\n${results.join("\n\n")}`;
  } catch (error) {
    return `Error en busqueda web: ${error instanceof Error ? error.message : String(error)}`;
  }
}
