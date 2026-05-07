import { cleanWordPressHtml } from '@/lib/html';
import { AdSlot } from './AdSlot';

interface ArticleBodyProps {
  html: string;
}

/**
 * Renders sanitized WordPress HTML and injects an ad slot after the
 * 3rd top-level paragraph (best-effort — falls back gracefully when
 * the article has fewer paragraphs).
 */
export function ArticleBody({ html }: ArticleBodyProps) {
  const cleaned = cleanWordPressHtml(html);
  const { before, after, hasSplit } = splitForMidArticleAd(cleaned);

  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[var(--container-prose)]">
        <div
          className="prose prose-lg"
          dangerouslySetInnerHTML={{ __html: before }}
        />
        {hasSplit && (
          <div className="my-10">
            <AdSlot placement="in-article" />
          </div>
        )}
        {hasSplit && (
          <div
            className="prose prose-lg"
            dangerouslySetInnerHTML={{ __html: after }}
          />
        )}
        <div className="mt-12">
          <AdSlot placement="article-end" />
        </div>
      </div>
    </div>
  );
}

function splitForMidArticleAd(html: string): { before: string; after: string; hasSplit: boolean } {
  // find end of 3rd </p>
  let count = 0;
  let pos = -1;
  while ((pos = html.indexOf('</p>', pos + 1)) !== -1) {
    count++;
    if (count === 3) {
      const idx = pos + '</p>'.length;
      return { before: html.slice(0, idx), after: html.slice(idx), hasSplit: true };
    }
  }
  return { before: html, after: '', hasSplit: false };
}
