const STORAGE_KEY = "slmc_omr_settings";

export interface AppSettings {
  defaultDigitCount: number;
  defaultPassMark: number;
  defaultDigitOrientation: "vertical" | "horizontal";
  defaultIdMode: "qr" | "bubble_grid" | "both";
}

const DEFAULTS: AppSettings = {
  defaultDigitCount: 8,
  defaultPassMark: 50,
  defaultDigitOrientation: "vertical",
  defaultIdMode: "qr",
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
