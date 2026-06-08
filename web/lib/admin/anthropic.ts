import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './style-guide';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

export interface FormattedPost {
  title: string;
  slug: string;
  excerpt: string;
  htmlContent: string;
  categorySlug: string;
  tags: { slug: string; name: string }[];
}

const PUBLISH_POST_TOOL: Anthropic.Tool = {
  name: 'publish_post',
  description: 'Submit the formatted blog post for publication.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Headline case, 60–90 chars. May use a colon for features.',
      },
      slug: {
        type: 'string',
        description: 'kebab-case URL slug, 4–7 words, lowercase ASCII, hyphen-separated.',
      },
      excerpt: {
        type: 'string',
        description: 'Plain-text one-sentence summary, 30–50 words. No HTML.',
      },
      htmlContent: {
        type: 'string',
        description:
          'Body HTML using only <p>, <blockquote>, <h2>, <h3>, <strong>, <em>, <a>, <ul>, <ol>, <li>, <br>. No <h1>.',
      },
      categorySlug: {
        type: 'string',
        description: 'One slug from the supplied category list. Use "general" if nothing fits.',
      },
      tags: {
        type: 'array',
        description: '3–8 tags. Reuse known slugs when possible; propose new ones for proper nouns.',
        items: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'kebab-case slug, lowercase ASCII.' },
            name: { type: 'string', description: 'Title-cased display name.' },
          },
          required: ['slug', 'name'],
        },
      },
    },
    required: ['title', 'slug', 'excerpt', 'htmlContent', 'categorySlug', 'tags'],
  },
};

export interface FormatPostInput {
  rawText: string;
  title?: string;
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
}

export async function formatPost(input: FormatPostInput): Promise<FormattedPost> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set.');
  }

  const client = new Anthropic({ apiKey });
  const systemText = buildSystemPrompt({
    categories: input.categories,
    tags: input.tags,
  });

  const userText =
    `Optional title (empty means generate one): ${input.title ?? ''}\n\n` +
    `--- BEGIN RAW ARTICLE BODY ---\n${input.rawText}\n--- END RAW ARTICLE BODY ---`;

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: systemText,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [PUBLISH_POST_TOOL],
      tool_choice: { type: 'tool', name: 'publish_post' },
      messages: [{ role: 'user', content: userText }],
    },
    // Give Anthropic up to 270s, leaving ~30s headroom under the route's
    // maxDuration=300 so a slow model call surfaces as a clean JSON error
    // ("Request was aborted.") rather than a Vercel function timeout.
    { timeout: 270_000 }
  );

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'publish_post'
  );
  if (!toolUse) {
    throw new Error('Claude did not call the publish_post tool.');
  }

  return toolUse.input as FormattedPost;
}
