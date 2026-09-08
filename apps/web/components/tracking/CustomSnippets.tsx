import Script from 'next/script';

import { API_URL } from '@/lib/constants';

/**
 * Custom code snippets injected into the storefront layout.
 *
 * Admin-configured via Settings → Snippets tab. Stored as a JSON array
 * under the `customSnippets` setting key. Fetched server-side with the
 * `custom-snippets` ISR tag so admin saves reflect instantly.
 *
 * Positions:
 *   - "header" → <head> via next/script (afterInteractive / beforeInteractive)
 *   - "body"   → end of <body> via next/script (afterInteractive)
 *   - "footer" → end of <body> via next/script (lazyOnload)
 */

type Snippet = {
  id: string;
  name: string;
  position: 'header' | 'footer' | 'body';
  content: string;
  enabled: boolean;
  order: number;
};

async function getSnippets(): Promise<Snippet[]> {
  try {
    const res = await fetch(`${API_URL}/api/custom-snippets`, {
      next: { tags: ['custom-snippets'], revalidate: 0 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { success?: boolean; data?: Snippet[] };
    if (!body.success || !body.data) return [];
    return body.data.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

function snippetStrategy(position: Snippet['position']): 'beforeInteractive' | 'afterInteractive' | 'lazyOnload' {
  switch (position) {
    case 'header':
      return 'beforeInteractive';
    case 'body':
      return 'afterInteractive';
    case 'footer':
      return 'lazyOnload';
  }
}

export async function CustomSnippets() {
  const snippets = await getSnippets();
  if (snippets.length === 0) return null;

  return (
    <>
      {snippets.map((snippet) => (
        <Script
          key={snippet.id}
          id={`snippet-${snippet.id}`}
          strategy={snippetStrategy(snippet.position)}
          dangerouslySetInnerHTML={{ __html: snippet.content }}
        />
      ))}
    </>
  );
}
