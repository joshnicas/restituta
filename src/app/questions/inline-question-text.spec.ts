import { getInlineQuestionImageError, getQuestionImageUrls, parseInlineQuestionText } from './inline-question-text';

describe('inline question text', () => {
  const media = [
    { type: 'IMAGE' as const, url: 'second.png', order: 2 },
    { type: 'IMAGE' as const, url: 'first.png', order: 1 },
  ];

  it('maps image tokens by media order and preserves surrounding text', () => {
    const parts = parseInlineQuestionText('image(2) + image(1) =', media);

    expect(parts).toEqual([
      { type: 'image', token: 'image(2)', index: 2, url: 'second.png' },
      { type: 'text', value: ' + ' },
      { type: 'image', token: 'image(1)', index: 1, url: 'first.png' },
      { type: 'text', value: ' =' },
    ]);
  });

  it('reports the required error when a referenced image has no URL', () => {
    expect(getInlineQuestionImageError('what is image(2)', media.slice(0, 1))).toBe('image url is required');
  });

  it('keeps normal questions compatible with the top-level image field', () => {
    expect(getQuestionImageUrls([], 'question.png')).toEqual(['question.png']);
    expect(getInlineQuestionImageError('What is 2 + 2?', [], 'question.png')).toBeNull();
  });
});