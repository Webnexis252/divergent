import sanitizeHtml from 'sanitize-html';

/**
 * Lesson text is HTML written by admins and rendered with
 * dangerouslySetInnerHTML, so anything that can run script is removed before
 * it reaches a student's browser: <script> and <style>, event handlers such as
 * onerror, javascript: links, forms, and frames from sites other than the
 * video hosts the CSP already allows. Formatting, links, images, tables and
 * YouTube / Vimeo / Google Drive embeds are kept.
 */
const LESSON_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'iframe'],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedIframeHostnames: [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'drive.google.com',
  ],
  allowIframeRelativeUrls: false,
  transformTags: {
    // A link that opens a new tab mustn't be able to navigate this one
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
    }),
  },
};

export function sanitizeLessonHtml(html: string | null | undefined): string {
  return html ? sanitizeHtml(html, LESSON_HTML_OPTIONS) : '';
}
