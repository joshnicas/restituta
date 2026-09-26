import { QuestionMedia } from '../models/educational.models';

export type InlineQuestionPart =
  | { type: 'text'; value: string }
  | { type: 'image'; token: string; index: number; url: string | null };

const IMAGE_TOKEN_PATTERN = /image\((\d+)\)/g;

export function getQuestionImageUrls(media: QuestionMedia[] | undefined, fallbackImage?: string | null): string[] {
  const imageUrls = (media ?? [])
    .filter((item) => item.type === 'IMAGE')
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.order ?? a.index) - (b.item.order ?? b.index))
    .map(({ item }) => item.url?.trim() ?? '');

  if (imageUrls.length > 0) return imageUrls;
  return fallbackImage?.trim() ? [fallbackImage.trim()] : [];
}

export function parseInlineQuestionText(
  text: string,
  media: QuestionMedia[] | undefined,
  fallbackImage?: string | null,
): InlineQuestionPart[] {
  const imageUrls = getQuestionImageUrls(media, fallbackImage);
  const parts: InlineQuestionPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  IMAGE_TOKEN_PATTERN.lastIndex = 0;
  while ((match = IMAGE_TOKEN_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const index = Number(match[1]);
    parts.push({
      type: 'image',
      token: match[0],
      index,
      url: imageUrls[index - 1] || null,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length || parts.length === 0) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

export function getInlineQuestionImageError(
  text: string,
  media: QuestionMedia[] | undefined,
  fallbackImage?: string | null,
): string | null {
  const hasMissingImage = parseInlineQuestionText(text, media, fallbackImage)
    .some((part) => part.type === 'image' && !part.url);
  return hasMissingImage ? 'image url is required' : null;
}