import en from "./en.json";
import hi from "./hi.json";
import gu from "./gu.json";

const resources = { en, hi, gu };

export function getTranslation(lang = "en") {
  return resources[lang] || resources.en;
}

export function t(key, lang = "en", params = {}) {
  const dict = getTranslation(lang);
  const keys = key.split(".");
  let val = dict;
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = val[k];
    } else {
      // Fallback to English if missing in target language
      let fallbackVal = resources.en;
      for (const fk of keys) {
        if (fallbackVal && typeof fallbackVal === "object" && fk in fallbackVal) {
          fallbackVal = fallbackVal[fk];
        } else {
          return key;
        }
      }
      val = fallbackVal;
      break;
    }
  }

  if (typeof val === "string") {
    let result = val;
    for (const [pKey, pVal] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${pKey}}}`, "g"), String(pVal));
    }
    return result;
  }
  return val;
}
