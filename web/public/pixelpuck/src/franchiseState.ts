import { TEAM_DEFS, buildContract, buildTeams, generateSchedule } from "./data/franchiseData.js";

const FRANCHISE_KEY = "pixelpuck_franchise_save";

const buildStandingsSeed = (teams) =>
  teams.map((team) => ({
    id: team.id,
    name: team.name,
    wins: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  }));

const normalizePlayer = (player) => {
  const rating = typeof player.rating === "number" ? player.rating : 70;
  return {
    ...player,
    rating,
    potential: typeof player.potential === "number" ? player.potential : Math.min(99, Math.max(40, rating + 6)),
    morale: typeof player.morale === "number" ? player.morale : 70,
    fatigue: typeof player.fatigue === "number" ? player.fatigue : 0,
    contract: player.contract ? player.contract : buildContract(rating, player.position),
  };
};

const normalizeTeams = (teams) =>
  teams.map((team) => ({
    ...team,
    logo: team.logo || team.name.split(" ").map((word) => word[0]).join("").slice(0, 3).toUpperCase(),
    captainId: team.captainId ?? null,
    roster: Array.isArray(team.roster) ? team.roster.map((player) => normalizePlayer(player)) : [],
  }));

const normalizePoolPlayer = (player) => {
  const rating = typeof player.rating === "number" ? player.rating : 50;
  const position = player.position || "FWD";
  const attributes = player.attributes || {};
  const revealed = Array.isArray(player.revealed) ? player.revealed : [];
  const type = player.type || "prospect";
  const contract = type === "freeAgent" ? player.contract || buildContract(rating, position) : player.contract || null;
  return {
    ...player,
    rating,
    position,
    attributes,
    revealed,
    type,
    contract,
  };
};

export const createNewFranchiseSave = (teamId) => {
  const teams = buildTeams();
  const selectedTeamId = teamId || TEAM_DEFS[0].id;
  const schedule = generateSchedule(teams);
  return {
    teamId: selectedTeamId,
    season: 1,
    week: 1,
    phase: "regular",
    teams,
    schedule,
    standings: buildStandingsSeed(teams),
    freeAgents: [],
    tradeBlock: [],
    scouting: { points: 4, pool: [], lastAiWeek: 0 },
    draft: { round: 1, pickIndex: 0, rounds: 3, order: [], picks: [] },
    awards: [],
    lastGameRecap: null,
    settings: { difficulty: 3, dynamicDifficulty: 0.5 },
    practice: { preset: "shooting", noFatigue: false },
    lineup: { skaters: [], goalie: null },
    lastPlayed: Date.now(),
  };
};

export const saveFranchise = (state) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FRANCHISE_KEY, JSON.stringify({ ...state, lastPlayed: Date.now() }));
  } catch {
    // Ignore persistence errors in MVP.
  }
};

export const loadFranchise = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FRANCHISE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.teams) || !Array.isArray(parsed.schedule)) return null;
    return {
      ...parsed,
      season: typeof parsed.season === "number" ? parsed.season : 1,
      week: typeof parsed.week === "number" ? parsed.week : 1,
      phase: typeof parsed.phase === "string" ? parsed.phase : "regular",
      teamId: typeof parsed.teamId === "string" ? parsed.teamId : TEAM_DEFS[0].id,
      teams: normalizeTeams(parsed.teams),
      freeAgents: Array.isArray(parsed.freeAgents) ? parsed.freeAgents.map((player) => normalizePlayer(player)) : [],
      tradeBlock: Array.isArray(parsed.tradeBlock) ? parsed.tradeBlock : [],
      scouting:
        parsed.scouting && typeof parsed.scouting === "object"
          ? {
              points: parsed.scouting.points ?? 4,
              pool: (parsed.scouting.pool ?? parsed.scouting.prospects ?? []).map((player) => normalizePoolPlayer(player)),
              lastAiWeek: parsed.scouting.lastAiWeek ?? 0,
            }
          : { points: 4, pool: [], lastAiWeek: 0 },
      draft:
        parsed.draft && typeof parsed.draft === "object"
          ? {
              round: parsed.draft.round ?? 1,
              pickIndex: parsed.draft.pickIndex ?? 0,
              rounds: parsed.draft.rounds ?? 3,
              order: parsed.draft.order ?? [],
              picks: parsed.draft.picks ?? [],
            }
          : { round: 1, pickIndex: 0, rounds: 3, order: [], picks: [] },
      awards: Array.isArray(parsed.awards) ? parsed.awards : [],
      lastGameRecap: parsed.lastGameRecap || null,
      settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : { difficulty: 3, dynamicDifficulty: 0.5 },
      practice: parsed.practice && typeof parsed.practice === "object" ? parsed.practice : { preset: "shooting", noFatigue: false },
      lineup: parsed.lineup && typeof parsed.lineup === "object" ? parsed.lineup : { skaters: [], goalie: null },
      lastPlayed: typeof parsed.lastPlayed === "number" ? parsed.lastPlayed : Date.now(),
    };
  } catch {
    return null;
  }
};

export const resetFranchise = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FRANCHISE_KEY);
};
