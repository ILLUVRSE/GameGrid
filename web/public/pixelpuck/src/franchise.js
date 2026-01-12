import { TEAM_DEFS, buildContract, generateSchedule } from "./data/franchiseData.js";
import { createNewFranchiseSave } from "./franchiseState.js";
import {
  applyAwardBonuses,
  applyMatchOutcome,
  buildProspect,
  buildStandings,
  calcTeamRating,
  calcTeamStrengths,
  calculatePayroll,
  computeSeasonAwards,
  createRookieContract,
  evaluateTradeConfidence,
  getAutoLineup,
  getNextMatchForTeam,
  getTeamNeeds,
  resignPlayer,
  scoutProspect,
  simulateMatch,
  applySeasonGrowth,
} from "./franchiseSim.js";

const MAX_ROSTER_SIZE = 8;
const DRAFT_ROUNDS = 3;
const POOL_MAX = 50;
const POOL_POSITIONS = ["DEF", "G", "C", "W"];
const POOL_PROSPECT_RATIO = 0.6;
const PRACTICE_PRESETS = [
  { id: "shooting", name: "Shooting", desc: "Quick release reps and finishing." },
  { id: "passing", name: "Passing", desc: "Tape-to-tape speed drills." },
  { id: "defense", name: "Defense", desc: "Gap control and stick checks." },
  { id: "goalie", name: "Goalie Reads", desc: "Tracking shots and rebounds." },
];

const buildTeamMap = (teams) => new Map(teams.map((team) => [team.id, team]));

const formatSalary = (salary) => `$${salary}k`;

const updateTeam = (teams, teamId, updater) =>
  teams.map((team) => (team.id === teamId ? updater(team) : team));

const normalizeHex = (value) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) return `#${trimmed}`;
  return trimmed;
};

const buildPoolPositions = (count) => {
  const base = Math.floor(count / POOL_POSITIONS.length);
  const remainder = count % POOL_POSITIONS.length;
  const positions = [];
  POOL_POSITIONS.forEach((pos, index) => {
    const total = base + (index < remainder ? 1 : 0);
    for (let i = 0; i < total; i += 1) positions.push(pos);
  });
  return positions;
};

const createPoolEntry = (position, index, type) => {
  const base = buildProspect(index);
  const poolPosition = position;
  const isForward = poolPosition === "C" || poolPosition === "W";
  const positionId = isForward ? "FWD" : poolPosition;
  const role = isForward ? poolPosition : null;
  const attributes = base.attributes || {};
  const revealAll = Object.keys(attributes);
  const contract = type === "freeAgent" ? buildContract(base.rating, positionId === "G" ? "G" : "FWD") : null;
  return {
    id: `pool_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
    name: base.name,
    position: positionId,
    role,
    poolPosition,
    rating: base.rating,
    potential: base.potential,
    age: base.age,
    attributes,
    revealed: type === "freeAgent" ? revealAll : [],
    type,
    contract,
  };
};

const buildPoolEntries = (count, offset = 0) => {
  const positions = buildPoolPositions(count);
  return positions.map((position, index) => {
    const type = Math.random() < POOL_PROSPECT_RATIO ? "prospect" : "freeAgent";
    return createPoolEntry(position, offset + index, type);
  });
};

const trimPool = (pool) => {
  if (pool.length <= POOL_MAX) return pool;
  return [...pool]
    .sort((a, b) => (a.potential || 50) - (b.potential || 50) || (a.age || 18) - (b.age || 18))
    .slice(0, POOL_MAX);
};

const assignPlayerToAiTeam = (teams, userTeamId, player) => {
  const candidates = teams.filter((team) => team.id !== userTeamId);
  if (!candidates.length) return teams;
  const pos = player.position === "FWD" ? "FWD" : player.position;
  const targetTeam = [...candidates].sort((a, b) => {
    const needsA = getTeamNeeds(a);
    const needsB = getTeamNeeds(b);
    return needsA.indexOf(pos) - needsB.indexOf(pos);
  })[0];
  if (!targetTeam) return teams;
  return updateTeam(teams, targetTeam.id, (team) => {
    const signed = { ...player, contract: buildContract(player.rating, player.position) };
    const roster = [...team.roster, signed];
    const trimmed =
      roster.length > MAX_ROSTER_SIZE
        ? roster.sort((a, b) => b.rating - a.rating).slice(0, MAX_ROSTER_SIZE)
        : roster;
    return { ...team, roster: trimmed };
  });
};

const applyAiSigning = (save) => {
  if (save.phase !== "regular") return save;
  if (save.scouting?.lastAiWeek === save.week) return save;
  const pool = save.scouting?.pool || [];
  const freeAgents = pool.filter((player) => player.type === "freeAgent").sort(() => Math.random() - 0.5);
  if (!freeAgents.length) return { ...save, scouting: { ...save.scouting, lastAiWeek: save.week } };
  const signCount = Math.min(2 + Math.floor(Math.random() * 2), freeAgents.length);
  let updatedTeams = save.teams;
  let remainingPool = [...pool];
  for (let i = 0; i < signCount; i += 1) {
    const candidate = freeAgents[i];
    remainingPool = remainingPool.filter((player) => player.id !== candidate.id);
    updatedTeams = assignPlayerToAiTeam(updatedTeams, save.teamId, candidate);
  }
  return {
    ...save,
    teams: updatedTeams,
    scouting: { ...save.scouting, pool: remainingPool, lastAiWeek: save.week },
  };
};

const ensurePool = (save) => {
  const pool = save.scouting?.pool || [];
  const trimmed = trimPool(pool);
  if (trimmed.length >= POOL_MAX) return { save, changed: pool !== trimmed };
  const additions = buildPoolEntries(POOL_MAX - trimmed.length, trimmed.length);
  return {
    save: { ...save, scouting: { ...save.scouting, pool: [...trimmed, ...additions] } },
    changed: true,
  };
};

const sortRoster = (roster, sortBy) => {
  const sorted = [...roster];
  switch (sortBy) {
    case "age":
      return sorted.sort((a, b) => a.age - b.age || b.rating - a.rating);
    case "position":
      return sorted.sort((a, b) => a.position.localeCompare(b.position) || b.rating - a.rating);
    default:
      return sorted.sort((a, b) => b.rating - a.rating || a.age - b.age);
  }
};

const getRosterDisplay = (roster, filterText, filterPosition, sortBy) => {
  const filtered = roster.filter((player) => {
    const matchesText = filterText
      ? player.name.toLowerCase().includes(filterText.toLowerCase())
      : true;
    const matchesPosition = filterPosition === "all" ? true : player.position === filterPosition;
    return matchesText && matchesPosition;
  });
  return sortRoster(filtered, sortBy);
};

const startOffseason = (save) => {
  const awards = computeSeasonAwards(save.teams);
  const awardedTeams = applyAwardBonuses(save.teams, awards);
  const difficulty = save.settings?.difficulty ?? 3;
  const dynamic = save.settings?.dynamicDifficulty ?? 0.5;
  const growthModifier = 1 + (difficulty - 3) * 0.06 + (dynamic - 0.5) * 0.2;
  const grownTeams = awardedTeams.map((team) =>
    team.id === save.teamId ? applySeasonGrowth(team, 1) : applySeasonGrowth(team, growthModifier)
  );
  const freeAgents = [];
  const updatedTeams = grownTeams.map((team) => {
    const roster = [];
    team.roster.forEach((player) => {
      const nextYears = (player.contract?.years ?? 1) - 1;
      if (nextYears <= 0) {
        freeAgents.push({
          ...player,
          contract: { ...player.contract, years: 0 },
          formerTeamId: team.id,
        });
        return;
      }
      roster.push({ ...player, contract: { ...player.contract, years: nextYears } });
    });
    return { ...team, roster };
  });
  const standings = buildStandings(updatedTeams, save.schedule);
  const order = standings.slice().reverse().map((row) => row.id);
  return {
    ...save,
    phase: "freeAgency",
    awards,
    teams: updatedTeams,
    freeAgents,
    scouting: { ...save.scouting, points: 6 },
    draft: { round: 1, pickIndex: 0, rounds: DRAFT_ROUNDS, order, picks: [] },
  };
};

const resetPlayerSeasonStats = (player) => ({
  ...player,
  stats: { goals: 0, assists: 0, saves: 0, games: 0 },
  fatigue: Math.max(0, (player.fatigue ?? 0) - 15),
});

const startNextSeason = (save) => {
  const refreshedTeams = save.teams.map((team) => ({
    ...team,
    roster: team.roster.map((player) => resetPlayerSeasonStats(player)),
  }));
  const schedule = generateSchedule(refreshedTeams);
  return {
    ...save,
    season: save.season + 1,
    week: 1,
    phase: "regular",
    teams: refreshedTeams,
    schedule,
    standings: buildStandings(refreshedTeams, schedule),
    scouting: { points: 4, prospects: [] },
    draft: { round: 1, pickIndex: 0, rounds: DRAFT_ROUNDS, order: [], picks: [] },
    lastGameRecap: null,
  };
};

const autoSignFreeAgents = (teams, freeAgents, userTeamId) => {
  const pool = [...freeAgents].sort((a, b) => b.rating - a.rating);
  const updatedTeams = teams.map((team) => {
    if (team.id === userTeamId) return team;
    const roster = [...team.roster];
    while (roster.length < MAX_ROSTER_SIZE && pool.length) {
      const pick = pool.shift();
      if (!pick) break;
      roster.push({ ...pick, contract: createRookieContract(pick.rating, pick.position) });
    }
    return { ...team, roster };
  });
  return { teams: updatedTeams, freeAgents: pool };
};

const makeDraftPick = (save, prospectId) => {
  const pool = save.scouting?.pool || [];
  const prospect = pool.find((item) => item.id === prospectId && item.type === "prospect");
  if (!prospect) return save;
  const order = save.draft.order || [];
  const pickTeamId = order[save.draft.pickIndex];
  if (!pickTeamId) return save;
  const draftedPlayer = {
    id: prospect.id.replace("pool_", "p_"),
    name: prospect.name,
    position: prospect.position,
    role: prospect.role,
    rating: prospect.rating,
    potential: prospect.potential,
    age: prospect.age,
    morale: 72,
    fatigue: 0,
    stats: { goals: 0, assists: 0, saves: 0, games: 0 },
    attributes: prospect.attributes,
    contract: createRookieContract(prospect.rating, prospect.position),
  };
  const updatedTeams = updateTeam(save.teams, pickTeamId, (team) => ({
    ...team,
    roster:
      team.roster.length + 1 > MAX_ROSTER_SIZE
        ? [...team.roster, draftedPlayer].sort((a, b) => b.rating - a.rating).slice(0, MAX_ROSTER_SIZE)
        : [...team.roster, draftedPlayer],
  }));
  const nextPool = pool.filter((item) => item.id !== prospectId);
  let nextRound = save.draft.round;
  let nextIndex = save.draft.pickIndex + 1;
  let phase = save.phase;
  if (nextIndex >= order.length) {
    nextRound += 1;
    nextIndex = 0;
  }
  if (nextRound > save.draft.rounds) {
    phase = "offseason";
  }
  return {
    ...save,
    phase,
    teams: updatedTeams,
    scouting: { ...save.scouting, pool: nextPool },
    draft: {
      ...save.draft,
      round: Math.min(nextRound, save.draft.rounds),
      pickIndex: nextIndex,
      picks: [...save.draft.picks, { round: save.draft.round, teamId: pickTeamId, player: draftedPlayer.name }],
    },
  };
};

const simulateDraftPick = (save) => {
  const pool = save.scouting?.pool || [];
  const prospects = pool.filter((item) => item.type === "prospect");
  const topProspect = [...prospects].sort((a, b) => b.rating - a.rating)[0];
  if (!topProspect) return save;
  return makeDraftPick(save, topProspect.id);
};

const buildContractSummary = (player) => {
  const years = player.contract?.years ?? 1;
  const band = player.contract?.salaryBand ?? "rookie";
  const salary = player.contract?.salary ?? 140;
  return `${band.toUpperCase()} · ${formatSalary(salary)} · ${years}y`;
};

export const renderFranchiseScreen = ({ save, onBack, onCreateSave, onUpdateSave, onReset, onPlayMatch, onPractice }) => {
  const screen = document.createElement("section");
  screen.className = "screen franchise-screen";

  const renderCreate = () => {
    screen.innerHTML = `
      <div class="franchise-header">
        <div>
          <p class="eyebrow">PIXELPUCK</p>
          <h2>Franchise Mode</h2>
        </div>
        <div class="button-row">
          <button class="secondary" id="franchise-back">Back to Modes</button>
        </div>
      </div>
      <div class="franchise-card">
        <h3>Start a Franchise</h3>
        <p>Pick your team, then manage the roster across a full season.</p>
        <div class="setup-row">
          <label for="franchise-team">Team</label>
          <select id="franchise-team"></select>
        </div>
        <p class="setup-preview" id="franchise-team-preview">Team: --</p>
        <div class="button-row">
          <button class="primary" id="franchise-start" disabled>Start Franchise</button>
        </div>
      </div>
    `;

    const back = screen.querySelector("#franchise-back");
    const teamSelect = screen.querySelector("#franchise-team");
    const preview = screen.querySelector("#franchise-team-preview");
    const start = screen.querySelector("#franchise-start");
    TEAM_DEFS.forEach((team) => {
      const option = document.createElement("option");
      option.value = team.id;
      option.textContent = team.name;
      teamSelect?.appendChild(option);
    });
    const updatePreview = () => {
      const selected = TEAM_DEFS.find((team) => team.id === teamSelect?.value);
      if (preview) preview.textContent = `Team: ${selected?.name ?? "--"}`;
      if (start) start.disabled = !selected;
    };
    teamSelect?.addEventListener("change", updatePreview);
    updatePreview();
    back?.addEventListener("click", () => onBack?.());
    start?.addEventListener("click", () => {
      const teamId = teamSelect?.value;
      const newSave = createNewFranchiseSave(teamId);
      onCreateSave?.(newSave);
    });
  };

  const renderHub = () => {
    if (!save) return;
    const teamMap = buildTeamMap(save.teams);
    const activeTeam = teamMap.get(save.teamId);
    let activeTab = "overview";
    let rosterFilter = "";
    let rosterPosition = "all";
    let rosterSort = "rating";
    let matchupOpen = false;
    let tradePartner = save.teams.find((team) => team.id !== save.teamId)?.id || "";
    let tradeOutgoing = [];
    let tradeIncoming = [];

    const commitSave = (nextSave) => onUpdateSave?.(nextSave);

    const render = () => {
      const standings = buildStandings(save.teams, save.schedule);
      const nextMatch = getNextMatchForTeam(save.teamId, save.schedule);
      const otherTeams = save.teams.filter((team) => team.id !== save.teamId);
      const nextOpponent = nextMatch
        ? teamMap.get(nextMatch.homeId === save.teamId ? nextMatch.awayId : nextMatch.homeId)
        : null;
      const matchupHome = nextMatch ? teamMap.get(nextMatch.homeId) : null;
      const matchupAway = nextMatch ? teamMap.get(nextMatch.awayId) : null;
      const pickKeys = (team) => {
        if (!team) return [];
        const skaters = team.roster.filter((player) => player.position !== "G").sort((a, b) => b.rating - a.rating);
        const goalie = team.roster.filter((player) => player.position === "G").sort((a, b) => b.rating - a.rating)[0];
        return [...skaters.slice(0, 2), goalie].filter(Boolean);
      };
      const homeKeys = pickKeys(matchupHome);
      const awayKeys = pickKeys(matchupAway);
      const userLineup = getAutoLineup(activeTeam);
      const homeStrengths = matchupHome ? calcTeamStrengths(matchupHome) : { offense: 70, defense: 70, goalie: 70 };
      const awayStrengths = matchupAway ? calcTeamStrengths(matchupAway) : { offense: 70, defense: 70, goalie: 70 };
      const isSeasonComplete = !save.schedule.some((week) => week.matches.some((match) => !match.result));
      const payroll = activeTeam ? calculatePayroll(activeTeam) : 0;
      const capSpace = Math.max(0, 1000 - payroll);
      const rosterDisplay = getRosterDisplay(activeTeam?.roster || [], rosterFilter, rosterPosition, rosterSort);
      const tradeTeam = otherTeams.find((team) => team.id === tradePartner);
      const tradeNeeds = tradeTeam ? getTeamNeeds(tradeTeam) : [];
      const tradeConfidence = tradeTeam
        ? evaluateTradeConfidence({
            offerPlayers: tradeOutgoing.map((id) => activeTeam.roster.find((player) => player.id === id)).filter(Boolean),
            targetPlayers: tradeIncoming.map((id) => tradeTeam.roster.find((player) => player.id === id)).filter(Boolean),
            targetTeamNeeds: tradeNeeds,
          })
        : 0;

      if (activeTab === "scouting") {
        let updated = save;
        const poolResult = ensurePool(updated);
        if (poolResult.changed) {
          commitSave(poolResult.save);
          return;
        }
        updated = applyAiSigning(updated);
        if (updated !== save) {
          commitSave(updated);
          return;
        }
      }

      screen.innerHTML = `
        <div class="franchise-header">
          <div>
            <p class="eyebrow">PIXELPUCK</p>
            <h2>Franchise Mode</h2>
            <p class="muted">Season ${save.season} · Week ${save.week} · ${save.phase === "regular" ? "Regular Season" : "Offseason"}</p>
          </div>
          <div class="button-row">
            <button class="secondary" id="franchise-back">Back to Modes</button>
            <button class="secondary" id="franchise-reset">Reset Franchise</button>
          </div>
        </div>
        <div class="franchise-tabs">
          <button class="secondary ${activeTab === "overview" ? "active" : ""}" data-tab="overview">Overview</button>
          <button class="secondary ${activeTab === "roster" ? "active" : ""}" data-tab="roster">Roster</button>
          <button class="secondary ${activeTab === "schedule" ? "active" : ""}" data-tab="schedule">Schedule</button>
          <button class="secondary ${activeTab === "practice" ? "active" : ""}" data-tab="practice">Practice</button>
          <button class="secondary ${activeTab === "trades" ? "active" : ""}" data-tab="trades">Trades</button>
          <button class="secondary ${activeTab === "contracts" ? "active" : ""}" data-tab="contracts">Contracts</button>
          <button class="secondary ${activeTab === "scouting" ? "active" : ""}" data-tab="scouting">Scouting</button>
          <button class="secondary ${activeTab === "customize" ? "active" : ""}" data-tab="customize">Customize</button>
        </div>
        <div class="franchise-body">
          ${
            activeTab === "overview"
              ? `
            <div class="franchise-grid">
              <div class="franchise-card">
                <div class="franchise-title-row">
                  <h3>${activeTeam?.name ?? "Your Team"}</h3>
                  <span class="team-logo">${activeTeam?.logo ?? "PP"}</span>
                </div>
                <p>Arena: ${activeTeam?.arena ?? "TBD"}</p>
                <div class="franchise-metrics">
                  <div><span>Record</span><strong>${standings.find((row) => row.id === save.teamId)?.wins ?? 0}-${standings.find(
                    (row) => row.id === save.teamId
                  )?.losses ?? 0}</strong></div>
                  <div><span>Team Rating</span><strong>${Math.round(calcTeamRating(activeTeam))}</strong></div>
                  <div><span>Next Opponent</span><strong>${nextOpponent?.name ?? "Season complete"}</strong></div>
                  <div><span>Cap Space</span><strong>${formatSalary(capSpace)}</strong></div>
                </div>
                <div class="button-row">
                  <button class="primary" id="franchise-play" ${nextMatch ? "" : "disabled"}>Play Next</button>
                  <button class="secondary" id="franchise-sim-game" ${nextMatch ? "" : "disabled"}>Sim Game</button>
                  <button class="secondary" id="franchise-sim-week">Sim Week</button>
                  <button class="secondary" id="franchise-sim-season">Sim Season</button>
                </div>
                <p class="muted">Difficulty affects AI ratings and growth. Adjust per season in Customize.</p>
              </div>
              <div class="franchise-card">
                <h3>Standings</h3>
                <div class="standings">
                  ${standings
                    .map(
                      (row, index) => `
                  <div class="standings-row ${row.id === save.teamId ? "active" : ""}">
                    <span>${index + 1}. ${row.name}</span>
                    <strong>${row.wins}-${row.losses}</strong>
                  </div>
                `
                    )
                    .join("")}
                </div>
              </div>
              ${
                save.lastGameRecap
                  ? `
                <div class="franchise-card">
                  <h3>Post-game Recap</h3>
                  <div class="recap-score">
                    <span>${save.lastGameRecap.home.name}</span>
                    <strong>${save.lastGameRecap.home.score} - ${save.lastGameRecap.away.score}</strong>
                    <span>${save.lastGameRecap.away.name}</span>
                  </div>
                  <div class="recap-leaders">
                    <div>
                      <span class="muted">${save.lastGameRecap.home.name}</span>
                      <strong>${save.lastGameRecap.home.leader.name}</strong>
                      <span class="muted">${save.lastGameRecap.home.leader.goals}G ${save.lastGameRecap.home.leader.assists}A</span>
                    </div>
                    <div>
                      <span class="muted">${save.lastGameRecap.away.name}</span>
                      <strong>${save.lastGameRecap.away.leader.name}</strong>
                      <span class="muted">${save.lastGameRecap.away.leader.goals}G ${save.lastGameRecap.away.leader.assists}A</span>
                    </div>
                  </div>
                  <div class="momentum-grid">
                    <div><span>Shots</span><strong>${save.lastGameRecap.momentum.shots.home}-${save.lastGameRecap.momentum.shots.away}</strong></div>
                    <div><span>Hits</span><strong>${save.lastGameRecap.momentum.hits.home}-${save.lastGameRecap.momentum.hits.away}</strong></div>
                    <div><span>Possession</span><strong>${save.lastGameRecap.momentum.possession.home}%</strong></div>
                  </div>
                </div>
              `
                  : ""
              }
              ${
                save.awards?.length
                  ? `
                <div class="franchise-card">
                  <h3>Season Awards</h3>
                  <div class="award-list">
                    ${save.awards.map((award) => `<div>${award.type}: <strong>${award.player}</strong> (${award.team})</div>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }
              ${
                isSeasonComplete && save.phase === "regular"
                  ? `
                <div class="franchise-card">
                  <h3>Season Complete</h3>
                  <p>Finalize awards, contracts, and get ready for the offseason.</p>
                  <div class="button-row">
                    <button class="primary" id="franchise-offseason">Begin Offseason</button>
                  </div>
                </div>
              `
                  : ""
              }
              ${
                matchupOpen && nextMatch
                  ? `
                <div class="franchise-card">
                  <h3>Matchup Preview</h3>
                  <div class="matchup-row">
                    <div>
                      <span class="muted">Home</span>
                      <strong>${teamMap.get(nextMatch.homeId)?.name ?? "Home"}</strong>
                    </div>
                    <div class="matchup-vs">VS</div>
                    <div>
                      <span class="muted">Away</span>
                      <strong>${teamMap.get(nextMatch.awayId)?.name ?? "Away"}</strong>
                    </div>
                  </div>
                  <div class="matchup-details">
                    <div>
                      <span class="muted">Key Players</span>
                      ${homeKeys.map((player) => `<div>${player.name} (${player.position})</div>`).join("")}
                    </div>
                    <div>
                      <span class="muted">Key Players</span>
                      ${awayKeys.map((player) => `<div>${player.name} (${player.position})</div>`).join("")}
                    </div>
                  </div>
                  <div class="matchup-strengths">
                    <div><span>Home Offense</span><strong>${homeStrengths.offense}</strong></div>
                    <div><span>Home Defense</span><strong>${homeStrengths.defense}</strong></div>
                    <div><span>Away Offense</span><strong>${awayStrengths.offense}</strong></div>
                    <div><span>Away Defense</span><strong>${awayStrengths.defense}</strong></div>
                    <div><span>Home Goalie</span><strong>${homeStrengths.goalie}</strong></div>
                    <div><span>Away Goalie</span><strong>${awayStrengths.goalie}</strong></div>
                  </div>
                  <div class="button-row">
                    <button class="primary" id="franchise-start-match">Start Match</button>
                    <button class="secondary" id="franchise-close-matchup">Close</button>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          `
              : activeTab === "roster"
                ? `
            <div class="franchise-card">
              <h3>${activeTeam?.name ?? "Roster"} Roster</h3>
              <div class="roster-controls">
                <input type="text" id="roster-filter" placeholder="Filter by name" value="${rosterFilter}" />
                <select id="roster-position">
                  <option value="all">All positions</option>
                  <option value="FWD" ${rosterPosition === "FWD" ? "selected" : ""}>Forward</option>
                  <option value="DEF" ${rosterPosition === "DEF" ? "selected" : ""}>Defense</option>
                  <option value="G" ${rosterPosition === "G" ? "selected" : ""}>Goalie</option>
                </select>
                <select id="roster-sort">
                  <option value="rating" ${rosterSort === "rating" ? "selected" : ""}>Sort by rating</option>
                  <option value="age" ${rosterSort === "age" ? "selected" : ""}>Sort by age</option>
                  <option value="position" ${rosterSort === "position" ? "selected" : ""}>Sort by position</option>
                </select>
                <button class="secondary" id="roster-auto">Auto-lineup</button>
              </div>
              <div class="roster-grid">
                ${rosterDisplay
                  .map(
                    (player) => `
                  <div class="roster-card">
                    <div>
                      <strong>${player.name}</strong>
                      <span class="muted">${player.position} · Age ${player.age} · ${buildContractSummary(player)}</span>
                      <span class="muted">Morale ${player.morale ?? 70} · Fatigue ${player.fatigue ?? 0}</span>
                    </div>
                    <div class="roster-actions">
                      <div class="rating-pill">${player.rating}</div>
                      <button class="ghost" data-captain="${player.id}">${activeTeam?.captainId === player.id ? "Captain" : "Set Captain"}</button>
                      <input type="text" class="rename-input" data-rename="${player.id}" value="${player.name}" />
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
              <div class="lineup-card">
                <h4>Suggested Lineup</h4>
                <div class="lineup-list">
                  ${userLineup.skaters
                    .map((id) => activeTeam?.roster.find((player) => player.id === id))
                    .filter(Boolean)
                    .map((player) => `<span>${player.name}</span>`)
                    .join("")}
                </div>
                <p class="muted">Goalie: ${activeTeam?.roster.find((player) => player.id === userLineup.goalie)?.name ?? "TBD"}</p>
              </div>
            </div>
          `
                : activeTab === "schedule"
                  ? `
            <div class="franchise-card">
              <h3>Schedule</h3>
              <div class="schedule-list">
                ${save.schedule
                  .map(
                    (week) => `
                  <div class="schedule-week">
                    <div class="schedule-title">Week ${week.week}</div>
                    ${week.matches
                      .map((match) => {
                        const home = teamMap.get(match.homeId);
                        const away = teamMap.get(match.awayId);
                        const score = match.result ? `${match.result.home}-${match.result.away}` : "vs";
                        return `
                        <div class="schedule-row ${match.homeId === save.teamId || match.awayId === save.teamId ? "active" : ""}">
                          <span>${home?.name ?? match.homeId}</span>
                          <strong>${score}</strong>
                          <span>${away?.name ?? match.awayId}</span>
                        </div>
                      `;
                      })
                      .join("")}
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
                  : activeTab === "practice"
                    ? `
            <div class="franchise-grid">
              <div class="franchise-card">
                <h3>Practice Mode</h3>
                <p>Run focused drills to give a small XP boost to featured players.</p>
                <div class="practice-controls">
                  <label for="practice-preset">Preset</label>
                  <select id="practice-preset">
                    ${PRACTICE_PRESETS.map(
                      (preset) => `
                      <option value="${preset.id}" ${save.practice?.preset === preset.id ? "selected" : ""}>${preset.name}</option>
                    `
                    ).join("")}
                  </select>
                  <label class="toggle-row"><input type="checkbox" id="practice-fatigue" ${save.practice?.noFatigue ? "checked" : ""}/>No fatigue</label>
                </div>
                <div class="button-row">
                  <button class="primary" id="franchise-practice">Start Practice</button>
                </div>
                <p class="muted">Drill rewards apply after the scrimmage ends.</p>
              </div>
              <div class="franchise-card">
                <h3>Focus Areas</h3>
                <div class="roster-grid">
                  ${PRACTICE_PRESETS.map(
                    (preset) => `
                    <div class="roster-card">
                      <div>
                        <strong>${preset.name}</strong>
                        <span class="muted">${preset.desc}</span>
                      </div>
                      <div class="rating-pill">${preset.id === "goalie" ? "Goalie" : preset.name}</div>
                    </div>
                  `
                  ).join("")}
                </div>
              </div>
            </div>
          `
                    : activeTab === "trades"
                      ? `
            <div class="franchise-grid">
              <div class="franchise-card">
                <h3>Trade Block</h3>
                <p>List players to signal trade availability.</p>
                <div class="roster-grid">
                  ${(activeTeam?.roster || [])
                    .map(
                      (player) => `
                    <div class="roster-card">
                      <div>
                        <strong>${player.name}</strong>
                        <span class="muted">${player.position} · ${buildContractSummary(player)}</span>
                      </div>
                      <button class="ghost" data-block="${player.id}">${save.tradeBlock?.includes(player.id) ? "Remove" : "Add"}</button>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
              <div class="franchise-card">
                <h3>Trade Offers</h3>
                <div class="trade-controls">
                  <label for="trade-partner">Partner</label>
                  <select id="trade-partner">
                    ${otherTeams
                      .map((team) => `<option value="${team.id}" ${tradePartner === team.id ? "selected" : ""}>${team.name}</option>`)
                      .join("")}
                  </select>
                </div>
                <p class="muted">Team needs: ${tradeNeeds.join(", ") || "Balanced"}</p>
                <div class="trade-grid">
                  <div>
                    <span class="muted">You offer (1-2)</span>
                    ${(activeTeam?.roster || [])
                      .map(
                        (player) => `
                      <label class="trade-row">
                        <input type="checkbox" data-offer="${player.id}" ${tradeOutgoing.includes(player.id) ? "checked" : ""} />
                        ${player.name} (${player.position})
                      </label>
                    `
                      )
                      .join("")}
                  </div>
                  <div>
                    <span class="muted">They offer (1)</span>
                    ${(tradeTeam?.roster || [])
                      .map(
                        (player) => `
                      <label class="trade-row">
                        <input type="checkbox" data-target="${player.id}" ${tradeIncoming.includes(player.id) ? "checked" : ""} />
                        ${player.name} (${player.position})
                      </label>
                    `
                      )
                      .join("")}
                  </div>
                </div>
                <div class="trade-meter">
                  <span>Confidence</span>
                  <div class="meter-bar"><span style="width: ${tradeConfidence}%;"></span></div>
                  <strong>${tradeConfidence}%</strong>
                </div>
                <div class="button-row">
                  <button class="primary" id="trade-propose" ${tradeOutgoing.length === 0 || tradeIncoming.length === 0 ? "disabled" : ""}>Propose Trade</button>
                </div>
              </div>
            </div>
          `
                      : activeTab === "contracts"
                        ? `
            <div class="franchise-grid">
              <div class="franchise-card">
                <h3>Contracts</h3>
                <div class="roster-grid">
                  ${(activeTeam?.roster || [])
                    .map(
                      (player) => `
                    <div class="roster-card">
                      <div>
                        <strong>${player.name}</strong>
                        <span class="muted">${player.position} · ${buildContractSummary(player)}</span>
                      </div>
                      <div class="contract-pill">${player.morale ?? 70} morale</div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
              <div class="franchise-card">
                <h3>Cap Outlook</h3>
                <div class="franchise-metrics">
                  <div><span>Team Payroll</span><strong>${formatSalary(payroll)}</strong></div>
                  <div><span>Cap Space</span><strong>${formatSalary(capSpace)}</strong></div>
                  <div><span>Open Slots</span><strong>${Math.max(0, MAX_ROSTER_SIZE - (activeTeam?.roster?.length || 0))}</strong></div>
                </div>
                <p class="muted">Morale responds to minutes played versus salary band.</p>
              </div>
              ${
                save.phase === "freeAgency"
                  ? `
                <div class="franchise-card">
                  <h3>Free Agency</h3>
                  <p>Re-sign expiring talent or add depth from the open market.</p>
                  <div class="roster-grid">
                    ${(save.freeAgents || [])
                      .map(
                        (player) => `
                      <div class="roster-card">
                        <div>
                          <strong>${player.name}</strong>
                          <span class="muted">${player.position} · ${player.formerTeamId === save.teamId ? "Former team" : "Free agent"}</span>
                        </div>
                        <button class="ghost" data-sign="${player.id}">${player.formerTeamId === save.teamId ? "Re-sign" : "Sign"}</button>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                  <div class="button-row">
                    <button class="secondary" id="advance-draft">Advance to Draft</button>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          `
                        : activeTab === "scouting"
                          ? `
            <div class="franchise-grid">
              <div class="franchise-card">
                <h3>Scouting Pool</h3>
                <p>Year-round pool of free agents and draft prospects (max ${POOL_MAX}).</p>
                <div class="button-row">
                  <button class="secondary" id="scout-point" ${save.scouting?.points > 0 ? "" : "disabled"}>Scout (${save.scouting?.points ?? 0})</button>
                </div>
                <div class="pool-counts">
                  <span>Total: ${save.scouting?.pool?.length ?? 0}</span>
                  <span>Prospects: ${(save.scouting?.pool || []).filter((player) => player.type === "prospect").length}</span>
                  <span>Free Agents: ${(save.scouting?.pool || []).filter((player) => player.type === "freeAgent").length}</span>
                </div>
                <div class="roster-grid">
                  ${(save.scouting?.pool || [])
                    .map(
                      (player) => `
                    <div class="roster-card">
                      <div>
                        <strong>${player.name}</strong>
                        <span class="muted">${player.role || player.position} · Age ${player.age} · Potential ${player.potential}</span>
                        <span class="muted">${Object.keys(player.attributes || {})
                          .map((key) => `${key}: ${(player.revealed || []).includes(key) ? player.attributes[key] : "??"}`)
                          .join(" · ")}</span>
                      </div>
                      <div class="pool-meta">
                        <div class="rating-pill">${player.type === "freeAgent" ? player.rating : (player.revealed || []).length ? player.rating : "??"}</div>
                        <span class="pool-tag">${player.type === "freeAgent" ? "Free Agent" : "Prospect"}</span>
                        ${player.type === "freeAgent" ? `<button class="ghost" data-sign="${player.id}">Sign</button>` : ""}
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
              ${
                save.phase === "draft"
                  ? `
                <div class="franchise-card">
                  <h3>Draft Room</h3>
                  <p>Round ${save.draft.round} of ${save.draft.rounds}</p>
                  <p class="muted">On the clock: ${teamMap.get(save.draft.order?.[save.draft.pickIndex])?.name ?? "TBD"}</p>
                  <div class="roster-grid">
                    ${(save.scouting?.pool || [])
                      .filter((player) => player.type === "prospect")
                      .slice(0, 6)
                      .map(
                        (prospect) => `
                      <div class="roster-card">
                        <div>
                          <strong>${prospect.name}</strong>
                          <span class="muted">${prospect.role || prospect.position} · Rating ${prospect.rating}</span>
                        </div>
                        <button class="ghost" data-draft="${prospect.id}">Draft</button>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                  <div class="button-row">
                    <button class="secondary" id="draft-sim">Sim Pick</button>
                  </div>
                </div>
              `
                  : ""
              }
              ${
                save.phase === "offseason"
                  ? `
                <div class="franchise-card">
                  <h3>Offseason Complete</h3>
                  <p>Draft is wrapped. Launch the next season when ready.</p>
                  <div class="button-row">
                    <button class="primary" id="next-season">Start Next Season</button>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          `
                          : `
            <div class="franchise-grid">
              <div class="franchise-card">
                <h3>Team Branding</h3>
                <div class="customize-grid">
                  <label>Logo<input type="text" id="team-logo" value="${activeTeam?.logo ?? "PP"}" /></label>
                  <label>Arena<input type="text" id="team-arena" value="${activeTeam?.arena ?? ""}" /></label>
                  <label>Primary Color<input type="text" id="team-color-primary" value="${activeTeam?.colors?.primary ?? ""}" /></label>
                  <label>Secondary Color<input type="text" id="team-color-secondary" value="${activeTeam?.colors?.secondary ?? ""}" /></label>
                </div>
                <div class="button-row">
                  <button class="primary" id="team-brand-save">Save Branding</button>
                </div>
              </div>
              <div class="franchise-card">
                <h3>Difficulty & Balance</h3>
                <div class="customize-grid">
                  <label>Franchise Difficulty
                    <input type="range" id="difficulty" min="1" max="5" step="1" value="${save.settings?.difficulty ?? 3}" />
                  </label>
                  <label>Dynamic Difficulty
                    <input type="range" id="dynamic" min="0" max="1" step="0.1" value="${save.settings?.dynamicDifficulty ?? 0.5}" />
                  </label>
                </div>
                <p class="muted">Higher difficulty boosts AI ratings and growth.</p>
              </div>
            </div>
          `
          }
        </div>
      `;

      screen.querySelectorAll("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => {
          activeTab = button.getAttribute("data-tab") || "overview";
          render();
        });
      });
      screen.querySelector("#franchise-back")?.addEventListener("click", () => onBack?.());
      screen.querySelector("#franchise-reset")?.addEventListener("click", () => onReset?.());
      screen.querySelector("#franchise-play")?.addEventListener("click", () => {
        if (!nextMatch) return;
        matchupOpen = true;
        render();
      });
      screen.querySelector("#franchise-start-match")?.addEventListener("click", () => {
        if (!nextMatch) return;
        onPlayMatch?.(nextMatch, save);
      });
      screen.querySelector("#franchise-close-matchup")?.addEventListener("click", () => {
        matchupOpen = false;
        render();
      });
      screen.querySelector("#franchise-offseason")?.addEventListener("click", () => {
        commitSave(startOffseason(save));
      });
      screen.querySelector("#franchise-sim-game")?.addEventListener("click", () => {
        if (!nextMatch) return;
        const teamMapLocal = buildTeamMap(save.teams);
        const simulated = simulateMatch(nextMatch, teamMapLocal);
        const updated = applyMatchOutcome(save, nextMatch, simulated.result);
        commitSave(updated);
      });
      screen.querySelector("#franchise-sim-week")?.addEventListener("click", () => {
        let updatedSave = { ...save };
        const week = updatedSave.schedule.find((item) => item.week === updatedSave.week);
        if (!week) return;
        week.matches.forEach((match) => {
          if (match.result) return;
          const simulated = simulateMatch(match, buildTeamMap(updatedSave.teams));
          updatedSave = applyMatchOutcome(updatedSave, match, simulated.result);
        });
        commitSave(updatedSave);
      });
      screen.querySelector("#franchise-sim-season")?.addEventListener("click", () => {
        let updatedSave = { ...save };
        updatedSave.schedule.forEach((week) => {
          week.matches.forEach((match) => {
            if (match.result) return;
            const simulated = simulateMatch(match, buildTeamMap(updatedSave.teams));
            updatedSave = applyMatchOutcome(updatedSave, match, simulated.result);
          });
        });
        commitSave(updatedSave);
      });
      screen.querySelector("#franchise-practice")?.addEventListener("click", () => {
        const preset = screen.querySelector("#practice-preset")?.value || "shooting";
        const noFatigue = !!screen.querySelector("#practice-fatigue")?.checked;
        commitSave({ ...save, practice: { preset, noFatigue } });
        onPractice?.({ preset, noFatigue });
      });
      screen.querySelector("#roster-filter")?.addEventListener("input", (event) => {
        rosterFilter = event.target.value;
        render();
      });
      screen.querySelector("#roster-position")?.addEventListener("change", (event) => {
        rosterPosition = event.target.value;
        render();
      });
      screen.querySelector("#roster-sort")?.addEventListener("change", (event) => {
        rosterSort = event.target.value;
        render();
      });
      screen.querySelector("#roster-auto")?.addEventListener("click", () => {
        const lineup = getAutoLineup(activeTeam);
        commitSave({ ...save, lineup });
      });
      screen.querySelectorAll("[data-captain]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-captain");
          if (!id) return;
          commitSave({
            ...save,
            teams: updateTeam(save.teams, save.teamId, (team) => ({ ...team, captainId: id })),
          });
        });
      });
      screen.querySelectorAll("[data-rename]").forEach((input) => {
        input.addEventListener("change", () => {
          const id = input.getAttribute("data-rename");
          if (!id) return;
          const nextName = input.value.trim();
          if (!nextName) return;
          commitSave({
            ...save,
            teams: updateTeam(save.teams, save.teamId, (team) => ({
              ...team,
              roster: team.roster.map((player) => (player.id === id ? { ...player, name: nextName } : player)),
            })),
          });
        });
      });
      screen.querySelectorAll("[data-block]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-block");
          if (!id) return;
          const exists = save.tradeBlock?.includes(id);
          const tradeBlock = exists ? save.tradeBlock.filter((item) => item !== id) : [...(save.tradeBlock || []), id];
          commitSave({ ...save, tradeBlock });
        });
      });
      screen.querySelector("#trade-partner")?.addEventListener("change", (event) => {
        tradePartner = event.target.value;
        tradeOutgoing = [];
        tradeIncoming = [];
        render();
      });
      screen.querySelectorAll("[data-offer]").forEach((input) => {
        input.addEventListener("change", () => {
          const id = input.getAttribute("data-offer");
          if (!id) return;
          if (input.checked) {
            tradeOutgoing = [...tradeOutgoing, id].slice(0, 2);
          } else {
            tradeOutgoing = tradeOutgoing.filter((item) => item !== id);
          }
          render();
        });
      });
      screen.querySelectorAll("[data-target]").forEach((input) => {
        input.addEventListener("change", () => {
          const id = input.getAttribute("data-target");
          if (!id) return;
          if (input.checked) {
            tradeIncoming = [id];
          } else {
            tradeIncoming = tradeIncoming.filter((item) => item !== id);
          }
          render();
        });
      });
      screen.querySelector("#trade-propose")?.addEventListener("click", () => {
        if (!tradeTeam) return;
        const outgoingPlayers = tradeOutgoing.map((id) => activeTeam.roster.find((player) => player.id === id)).filter(Boolean);
        const incomingPlayers = tradeIncoming.map((id) => tradeTeam.roster.find((player) => player.id === id)).filter(Boolean);
        if (!outgoingPlayers.length || !incomingPlayers.length) return;
        if (tradeConfidence < 60 || Math.random() > tradeConfidence / 100) {
          alert("Trade declined. The other GM is not convinced.");
          return;
        }
        const updatedTeams = save.teams.map((team) => {
          if (team.id === activeTeam.id) {
            const roster = team.roster.filter((player) => !tradeOutgoing.includes(player.id)).concat(incomingPlayers);
            const trimmed = roster.length > MAX_ROSTER_SIZE ? roster.sort((a, b) => b.rating - a.rating).slice(0, MAX_ROSTER_SIZE) : roster;
            return { ...team, roster: trimmed };
          }
          if (team.id === tradeTeam.id) {
            const roster = team.roster.filter((player) => !tradeIncoming.includes(player.id)).concat(outgoingPlayers);
            const trimmed = roster.length > MAX_ROSTER_SIZE ? roster.sort((a, b) => b.rating - a.rating).slice(0, MAX_ROSTER_SIZE) : roster;
            return { ...team, roster: trimmed };
          }
          return team;
        });
        commitSave({ ...save, teams: updatedTeams });
      });
      screen.querySelectorAll("[data-sign]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-sign");
          if (!id) return;
          const candidate = save.freeAgents.find((player) => player.id === id);
          if (!candidate) return;
          if ((activeTeam?.roster?.length || 0) >= MAX_ROSTER_SIZE) return;
          const signed = resignPlayer(candidate);
          const nextFreeAgents = save.freeAgents.filter((player) => player.id !== id);
          commitSave({
            ...save,
            freeAgents: nextFreeAgents,
            teams: updateTeam(save.teams, save.teamId, (team) => ({ ...team, roster: [...team.roster, signed] })),
          });
        });
      });
      screen.querySelector("#advance-draft")?.addEventListener("click", () => {
        const auto = autoSignFreeAgents(save.teams, save.freeAgents, save.teamId);
        commitSave({
          ...save,
          phase: "draft",
          teams: auto.teams,
          freeAgents: auto.freeAgents,
        });
      });
      screen.querySelector("#scout-point")?.addEventListener("click", () => {
        if ((save.scouting?.points ?? 0) <= 0) return;
        const prospects = (save.scouting?.pool || []).filter((player) => player.type === "prospect");
        if (!prospects.length) return;
        const targetIndex = Math.floor(Math.random() * prospects.length);
        const targetId = prospects[targetIndex]?.id;
        const nextPool = (save.scouting?.pool || []).map((player) =>
          player.id === targetId ? scoutProspect(player) : player
        );
        commitSave({
          ...save,
          scouting: { ...save.scouting, points: save.scouting.points - 1, pool: nextPool },
        });
      });
      screen.querySelectorAll("[data-draft]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-draft");
          if (!id) return;
          const onClock = save.draft.order?.[save.draft.pickIndex];
          if (onClock !== save.teamId) {
            alert("Not your pick yet.");
            return;
          }
          commitSave(makeDraftPick(save, id));
        });
      });
      screen.querySelector("#draft-sim")?.addEventListener("click", () => {
        commitSave(simulateDraftPick(save));
      });
      screen.querySelectorAll("[data-sign]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-sign");
          if (!id) return;
          const pool = save.scouting?.pool || [];
          const player = pool.find((item) => item.id === id && item.type === "freeAgent");
          if (!player) return;
          if ((activeTeam?.roster?.length || 0) >= MAX_ROSTER_SIZE) {
            alert("Roster is full.");
            return;
          }
          const rating = player.rating || 50;
          const potential = player.potential || 70;
          const interest = Math.min(0.85, Math.max(0.2, 0.25 + (rating - 50) * 0.01 + (potential - 70) * 0.005));
          if (Math.random() < interest) {
            const updatedTeams = assignPlayerToAiTeam(save.teams, save.teamId, player);
            const updatedSave = {
              ...save,
              teams: updatedTeams,
              scouting: { ...save.scouting, pool: pool.filter((item) => item.id !== id), lastAiWeek: save.scouting.lastAiWeek },
            };
            alert("Another team signed the player first.");
            commitSave(updatedSave);
            return;
          }
          const signed = { ...player, contract: buildContract(player.rating, player.position) };
          const nextPool = pool.filter((item) => item.id !== id);
          commitSave({
            ...save,
            scouting: { ...save.scouting, pool: nextPool },
            teams: updateTeam(save.teams, save.teamId, (team) => ({ ...team, roster: [...team.roster, signed] })),
          });
        });
      });
      screen.querySelector("#next-season")?.addEventListener("click", () => {
        commitSave(startNextSeason(save));
      });
      screen.querySelector("#team-brand-save")?.addEventListener("click", () => {
        const logo = screen.querySelector("#team-logo")?.value.trim() || activeTeam?.logo || "PP";
        const arena = screen.querySelector("#team-arena")?.value.trim() || activeTeam?.arena || "";
        const primary = normalizeHex(screen.querySelector("#team-color-primary")?.value);
        const secondary = normalizeHex(screen.querySelector("#team-color-secondary")?.value);
        commitSave({
          ...save,
          teams: updateTeam(save.teams, save.teamId, (team) => ({
            ...team,
            logo,
            arena,
            colors: {
              primary: primary || team.colors?.primary,
              secondary: secondary || team.colors?.secondary,
            },
          })),
        });
      });
      screen.querySelector("#difficulty")?.addEventListener("change", (event) => {
        commitSave({
          ...save,
          settings: { ...save.settings, difficulty: Number(event.target.value) },
        });
      });
      screen.querySelector("#dynamic")?.addEventListener("change", (event) => {
        commitSave({
          ...save,
          settings: { ...save.settings, dynamicDifficulty: Number(event.target.value) },
        });
      });
    };

    render();
  };

  if (!save) {
    renderCreate();
  } else {
    renderHub();
  }

  return screen;
};
