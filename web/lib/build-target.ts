/**
 * True while building the static public site for SiteGround
 * (scripts/build-static.mjs). Pages use it to pre-render everything there,
 * while the Vercel admin build and `next dev` render public pages on demand.
 */
export const IS_STATIC_EXPORT = process.env.BUILD_TARGET === 'static';
