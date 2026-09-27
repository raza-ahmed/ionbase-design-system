'use client';

/**
 * I18nProvider — react-aria's, re-exported so an app can set the locale
 * without depending on react-aria itself.
 *
 * The locale is what react-aria's components read for direction: arrow keys
 * in Tabs, Toolbar, Menu, Slider, Calendar and TreeView follow it, not the
 * `dir` attribute. Right-to-left is both — `dir="rtl"` on the page for the
 * layout, and an RTL locale here for the keys:
 *
 *   <html lang="he" dir="rtl">
 *     <I18nProvider locale="he-IL">…</I18nProvider>
 *
 * Without it, react-aria falls back to the browser's language.
 */
export { I18nProvider, useLocale } from 'react-aria';
export type { I18nProviderProps } from 'react-aria';
