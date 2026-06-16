import { cookies } from "next/headers";
import { tSync, type Locale, type TranslationKey } from "@/lib/locale";

export { tSync, type Locale, type TranslationKey };

/** Server-only: read locale from the request cookie. */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const val = c.get("locale")?.value;
  return val === "en" ? "en" : "vi";
}

/** Server-only: translate a key using the request cookie locale. */
export async function t(key: TranslationKey): Promise<string> {
  const locale = await getLocale();
  return tSync(key, locale);
}
