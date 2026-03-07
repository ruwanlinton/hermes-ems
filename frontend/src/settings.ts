const STORAGE_KEY = "slmc_omr_settings";

export interface AppSettings {
  defaultDigitCount: number;
}

const DEFAULTS: AppSettings = {
  defaultDigitCount: 8,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
