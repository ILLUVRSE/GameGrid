const SAVE_KEY = "pixelpuck_mvp_save";

const POWER_UPS = new Set([
  "PaddleSizePlus10",
  "PaddleAccelBoost",
  "PowerHit",
  "ControlGrip",
  "StabilityCore",
]);

export const createNewSave = () => ({
  gold: 0,
  defeatedCountries: [],
  selectedCountryId: null,
  finalsUnlockedOverride: false,
  lastDefeatedId: null,
  ownedPowerUps: [],
  equippedPowerUp: null,
  lastPlayed: Date.now(),
});

export const saveGame = (state) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lastPlayed: Date.now() }));
  } catch {
    // Ignore persistence errors in MVP.
  }
};

export const loadGame = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.defeatedCountries || !Array.isArray(parsed.defeatedCountries)) return null;
    const ownedPowerUps = Array.isArray(parsed.ownedPowerUps)
      ? parsed.ownedPowerUps.filter((id) => POWER_UPS.has(id))
      : [];
    const equippedPowerUp = POWER_UPS.has(parsed.equippedPowerUp) ? parsed.equippedPowerUp : null;
    return {
      gold: typeof parsed.gold === "number" ? Math.max(0, parsed.gold) : 0,
      defeatedCountries: parsed.defeatedCountries,
      selectedCountryId: typeof parsed.selectedCountryId === "string" ? parsed.selectedCountryId : null,
      finalsUnlockedOverride: parsed.finalsUnlockedOverride === true,
      lastDefeatedId: typeof parsed.lastDefeatedId === "string" ? parsed.lastDefeatedId : null,
      ownedPowerUps,
      equippedPowerUp: ownedPowerUps.includes(equippedPowerUp) ? equippedPowerUp : null,
      lastPlayed: typeof parsed.lastPlayed === "number" ? parsed.lastPlayed : Date.now(),
    };
  } catch {
    return null;
  }
};

export const hasSave = () => {
  if (typeof window === "undefined") return false;
  return Boolean(loadGame());
};

export const resetSave = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
};
