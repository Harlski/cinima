import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
  canonicalWebOrigin,
} from "@cinima/shared";

export const siteOrigin = canonicalWebOrigin(
  import.meta.env.VITE_SITE_ORIGIN || "https://cinima.app"
);

export const siteMeta = {
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  themeColor: SITE_THEME_COLOR,
  locale: SITE_LOCALE,
  origin: siteOrigin,
  canonicalUrl: `${siteOrigin}/`,
} as const;
