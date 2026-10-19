// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sanitizeLessonHtml } from '@/lib/sanitize-lesson-html';

describe('sanitizeLessonHtml', () => {
  it('keeps ordinary lesson formatting', () => {
    const html = '<h2>Kinematics</h2><p>Use <strong>v = u + at</strong>.</p><ul><li>one</li></ul><table><tr><td colspan="2">x</td></tr></table>';
    expect(sanitizeLessonHtml(html)).toBe(html);
  });

  it('removes scripts, event handlers and javascript: links', () => {
    const html = '<p onclick="steal()">Hi</p><script>steal()</script><img src="x.png" onerror="steal()"><a href="javascript:steal()">go</a>';
    const clean = sanitizeLessonHtml(html);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(clean).toContain('<p>Hi</p>');
    expect(clean).toContain('<img src="x.png" />');
  });

  it('keeps video embeds from allowed hosts only', () => {
    const youtube = '<iframe src="https://www.youtube.com/embed/abc" allowfullscreen></iframe>';
    expect(sanitizeLessonHtml(youtube)).toContain('src="https://www.youtube.com/embed/abc"');
    expect(sanitizeLessonHtml('<iframe src="https://evil.example/x"></iframe>')).not.toContain('evil.example');
  });

  it('stops new-tab links from controlling the lesson tab', () => {
    expect(sanitizeLessonHtml('<a href="https://example.com" target="_blank">x</a>')).toContain('rel="noopener noreferrer"');
  });

  it('returns an empty string for empty lesson text', () => {
    expect(sanitizeLessonHtml(null)).toBe('');
  });
});
