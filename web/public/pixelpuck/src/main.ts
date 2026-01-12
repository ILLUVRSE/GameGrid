import { renderMapScreen } from "./map.js";
import { renderMatchScreen } from "./match.js";
import { renderShopScreen } from "./shop.js";
import {
  renderHockey94OnlineScreen,
  renderHockey94SoloScreen,
  renderHockey94WatchScreen,
  renderHockey94FranchiseScreen,
} from "./hockey94/match.js?v=14";
import { renderFranchiseScreen } from "./franchise.js";
import { createNewSave, hasSave, loadGame, resetSave, saveGame } from "./state.js";
import { loadFranchise, resetFranchise, saveFranchise } from "./franchiseState.js";
import { applyMatchOutcome, applyPracticeRewards, calcTeamRating, pickLineup } from "./franchiseSim.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("PixelPuck root container missing.");
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
  });
}

let currentSave = null;
let currentFranchise = null;
let cleanup = null;

const setScreen = (node) => {
  cleanup?.();
  cleanup = null;
  root.innerHTML = "";
  root.appendChild(node);
};

const setCleanup = (fn) => {
  cleanup = fn;
};

const showMenu = () => {
  const screen = document.createElement("section");
  screen.className = "screen home-screen";
  screen.innerHTML = `
    <div class="menu-grid">
      <div class="menu-card hero-card">
        <p class="eyebrow">PIXELPUCK</p>
        <h2 class="hero-title">PixelPuck</h2>
        <p class="hero-tagline">World Air Hockey Tournament</p>
        <p class="hero-copy">
          Defeat 50 countries across five regions in a fast-paced world air hockey tournament.
          Every arena has a unique twist. First to five wins.
        </p>
      </div>
      <div class="menu-card">
        <div class="button-row">
          <button id="new-game" class="primary">New Game</button>
          <button id="continue" class="secondary">Continue</button>
          <button id="back-modes" class="secondary">Back to Modes</button>
          <button id="reset" class="danger">Reset Save</button>
        </div>
      </div>
    </div>
  `;

  const continueBtn = screen.querySelector("#continue");
  if (!hasSave()) {
    if (continueBtn) continueBtn.disabled = true;
  }

  screen.querySelector("#new-game")?.addEventListener("click", () => {
    currentSave = createNewSave();
    saveGame(currentSave);
    showMap();
  });

  continueBtn?.addEventListener("click", () => {
    const loaded = loadGame();
    if (loaded) {
      currentSave = loaded;
      showMap();
    }
  });

  screen.querySelector("#reset")?.addEventListener("click", () => {
    resetSave();
    currentSave = null;
    showMenu();
  });

  screen.querySelector("#back-modes")?.addEventListener("click", () => {
    showModeSelect();
  });

  setScreen(screen);
};

const showModeSelect = () => {
  const screen = document.createElement("section");
  screen.className = "screen home-screen mode-select";
  screen.innerHTML = `
    <div class="menu-grid mode-grid">
      <div class="menu-card hero-card">
        <p class="eyebrow">PIXELPUCK</p>
        <h2 class="hero-title">Mode Select</h2>
        <p class="hero-copy">
          Choose your rink. World Air Hockey Tournament keeps the classic paddle action,
          while 3v3 Arcade Hockey delivers a fast, top-down brawl in solo or online play.
        </p>
      </div>
      <div class="menu-card mode-card">
        <h3>World Air Hockey Tournament (vs AI)</h3>
        <p>Defeat 50 countries across five regions. Each arena brings its own twist.</p>
        <div class="button-row">
          <button id="mode-tournament" class="primary">Enter Tournament</button>
        </div>
      </div>
      <div class="menu-card mode-card">
        <h3>3v3 Arcade Hockey (Solo vs AI)</h3>
        <p>Instant offline 3v3. Control one skater and swap on the fly.</p>
        <div class="button-row">
          <button id="mode-hockey94-solo" class="primary">Drop the Puck</button>
        </div>
      </div>
      <div class="menu-card mode-card">
        <h3>3v3 Arcade Hockey (Online Multiplayer)</h3>
        <p>Host or join a room code. Up to 6 humans, bots fill the rest.</p>
        <div class="button-row">
          <button id="mode-hockey94-online" class="primary">Host / Join</button>
        </div>
      </div>
      <div class="menu-card mode-card">
        <h3>3v3 Arcade Hockey (Watch Mode)</h3>
        <p>Level 10 AI vs AI with full-length periods to study the flow.</p>
        <div class="button-row">
          <button id="mode-hockey94-watch" class="primary">Watch Mode</button>
        </div>
      </div>
      <div class="menu-card mode-card">
        <h3>Franchise Mode</h3>
        <p>Build a roster, manage your season, and guide your team to the title.</p>
        <div class="button-row">
          <button id="mode-franchise" class="primary">Start Franchise</button>
        </div>
      </div>
    </div>
  `;

  screen.querySelector("#mode-tournament")?.addEventListener("click", () => {
    showMenu();
  });

  screen.querySelector("#mode-hockey94-solo")?.addEventListener("click", () => {
    showHockey94Solo();
  });

  screen.querySelector("#mode-hockey94-online")?.addEventListener("click", () => {
    showHockey94Online();
  });

  screen.querySelector("#mode-hockey94-watch")?.addEventListener("click", () => {
    showHockey94Watch();
  });

  screen.querySelector("#mode-franchise")?.addEventListener("click", () => {
    showFranchise();
  });

  setScreen(screen);
};

const showMap = () => {
  if (!currentSave) currentSave = loadGame() ?? createNewSave();
  const screen = renderMapScreen({
    save: currentSave,
    onStartMatch: (country, options = {}) => showMatch(country, options),
    onBackMenu: () => showMenu(),
    onUpdateSave: (save) => {
      currentSave = { ...save };
      saveGame(currentSave);
    },
    onOpenShop: () => showShop(),
  });
  setScreen(screen);
};

const showShop = () => {
  if (!currentSave) currentSave = loadGame() ?? createNewSave();
  const screen = renderShopScreen({
    save: currentSave,
    onUpdate: (save) => {
      currentSave = { ...save };
      saveGame(currentSave);
    },
    onBack: () => showMap(),
  });
  setScreen(screen);
};

const showMatch = (country, options = {}) => {
  if (!currentSave) return;
  const practice = Boolean(options.practice);
  const match = renderMatchScreen({
    country,
    save: currentSave,
    practice,
    onComplete: (didWin, options = {}) => {
      if (!currentSave) return;
      if (options.rematch) {
        showMatch(country, { practice });
        return;
      }
      if (!practice && didWin && !country.isFinal) {
        if (!currentSave.defeatedCountries.includes(country.id)) {
          currentSave.defeatedCountries.push(country.id);
          currentSave.lastDefeatedId = country.id;
          currentSave.gold += 50 + country.difficulty * 20;
        }
      }
      saveGame(currentSave);
      showMap();
    },
  });
  setScreen(match.element);
  setCleanup(match.cleanup);
};

const showHockey94Solo = () => {
  const screen = renderHockey94SoloScreen({
    onBack: () => showModeSelect(),
  });
  setScreen(screen.element);
  setCleanup(screen.cleanup);
};

const showHockey94Online = () => {
  const screen = renderHockey94OnlineScreen({
    onBack: () => showModeSelect(),
  });
  setScreen(screen.element);
  setCleanup(screen.cleanup);
};

const showHockey94Watch = () => {
  const screen = renderHockey94WatchScreen({
    onBack: () => showModeSelect(),
  });
  setScreen(screen.element);
  setCleanup(screen.cleanup);
};

const ratingToDifficulty = (rating) => {
  const scaled = Math.round((rating - 60) / 4 + 5);
  return Math.max(3, Math.min(10, scaled));
};

const pickAiStyle = (rating) => {
  if (rating >= 85) return "Adaptive";
  if (rating >= 78) return "Aggressive";
  if (rating >= 72) return "Balanced";
  return "Defensive";
};

const updateFranchiseAfterMatch = (save, match, scores) => applyMatchOutcome(save, match, scores);

const adjustOpponentRating = (rating, save) => {
  const difficulty = save?.settings?.difficulty ?? 3;
  const dynamic = save?.settings?.dynamicDifficulty ?? 0.5;
  return rating + (difficulty - 3) * 2 + (dynamic - 0.5) * 4;
};

const showFranchiseMatch = (match) => {
  if (!currentFranchise) return;
  const teamMap = new Map(currentFranchise.teams.map((team) => [team.id, team]));
  const opponentId = match.homeId === currentFranchise.teamId ? match.awayId : match.homeId;
  const opponent = teamMap.get(opponentId);
  const homeTeam = teamMap.get(match.homeId);
  const awayTeam = teamMap.get(match.awayId);
  const difficulty = ratingToDifficulty(adjustOpponentRating(calcTeamRating(opponent), currentFranchise));
  const homeLineup = pickLineup(homeTeam, match.homeId === currentFranchise.teamId ? currentFranchise.lineup : null);
  const awayLineup = pickLineup(awayTeam, match.awayId === currentFranchise.teamId ? currentFranchise.lineup : null);
  const config = {
    opponentName: opponent?.name || "Opponent",
    arenaName: homeTeam?.arena || null,
    difficulty,
    aiStyle: pickAiStyle(calcTeamRating(opponent)),
    homeSkaters: homeLineup.skaters,
    awaySkaters: awayLineup.skaters,
    homeGoalie: homeLineup.goalie,
    awayGoalie: awayLineup.goalie,
  };
  const screen = renderHockey94FranchiseScreen({
    onBack: () => showFranchise(),
    config,
    onComplete: (scores) => {
      currentFranchise = updateFranchiseAfterMatch(currentFranchise, match, scores);
      saveFranchise(currentFranchise);
      showFranchise();
    },
  });
  setScreen(screen.element);
  setCleanup(screen.cleanup);
};

const showFranchisePractice = (practiceConfig) => {
  if (!currentFranchise) return;
  const teamMap = new Map(currentFranchise.teams.map((team) => [team.id, team]));
  const homeTeam = teamMap.get(currentFranchise.teamId);
  const opponents = currentFranchise.teams.filter((team) => team.id !== currentFranchise.teamId);
  const opponent = opponents[Math.floor(Math.random() * opponents.length)];
  const homeLineup = pickLineup(homeTeam, currentFranchise.lineup);
  const awayLineup = pickLineup(opponent, null);
  const difficulty = ratingToDifficulty(calcTeamRating(opponent));
  const config = {
    opponentName: opponent?.name || "Scrimmage",
    arenaName: homeTeam?.arena || null,
    difficulty: Math.max(3, Math.min(7, difficulty)),
    aiStyle: "Balanced",
    homeSkaters: homeLineup.skaters,
    awaySkaters: awayLineup.skaters,
    homeGoalie: homeLineup.goalie,
    awayGoalie: awayLineup.goalie,
  };
  const preset = practiceConfig?.preset || currentFranchise.practice?.preset || "shooting";
  const noFatigue = practiceConfig?.noFatigue ?? currentFranchise.practice?.noFatigue ?? false;
  const screen = renderHockey94FranchiseScreen({
    onBack: () => showFranchise(),
    config,
    onComplete: () => {
      currentFranchise = {
        ...currentFranchise,
        teams: currentFranchise.teams.map((team) =>
          team.id === currentFranchise.teamId ? applyPracticeRewards(team, preset, noFatigue) : team
        ),
      };
      saveFranchise(currentFranchise);
      showFranchise();
    },
  });
  setScreen(screen.element);
  setCleanup(screen.cleanup);
};

const showFranchise = () => {
  if (!currentFranchise) currentFranchise = loadFranchise();
  const screen = renderFranchiseScreen({
    save: currentFranchise,
    onBack: () => showModeSelect(),
    onCreateSave: (save) => {
      currentFranchise = { ...save };
      saveFranchise(currentFranchise);
      showFranchise();
    },
    onUpdateSave: (save) => {
      currentFranchise = { ...save };
      saveFranchise(currentFranchise);
      showFranchise();
    },
    onReset: () => {
      resetFranchise();
      currentFranchise = null;
      showFranchise();
    },
    onPlayMatch: (match) => showFranchiseMatch(match),
    onPractice: (practiceConfig) => showFranchisePractice(practiceConfig),
  });
  setScreen(screen);
};

showModeSelect();

window.addEventListener("beforeunload", () => {
  if (currentSave) saveGame(currentSave);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const screenClass = root.firstElementChild?.classList;
    if (screenClass?.contains("tournament")) {
      showMenu();
    } else if (screenClass?.contains("hockey94-screen")) {
      showModeSelect();
    }
  }
});
