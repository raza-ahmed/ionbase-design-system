/**
 * Ambient module declarations for the static assets Vite resolves to a URL
 * string. `.mdx` files already worked without this — the MDX loader compiles
 * them directly, bypassing `tsc` — but any `.tsx` story importing an image
 * needs it, since `tsc` has no idea what an `.svg` import should resolve to
 * otherwise.
 */
declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.avif' {
  const src: string;
  export default src;
}
