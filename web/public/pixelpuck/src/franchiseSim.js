import { SALARY_BANDS, buildContract, createRoster } from "./data/franchiseData.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

export const calcTeamRating = (team) => {
  if (!team?.roster?.length) return 70;
  const total = team.roster.reduce((sum, player) => sum + (player.rating || 0), 0);
  return total / team.roster.length;
};

export const calcTeamStrengths = (team) => {
  const skaters = (team?.roster || []).filter((player) => player.position !== "G");
  const goalies = (team?.roster || []).filter((player) => player.position === "G");
  const avg = (list, keyA, keyB) => {
    if (!list.length) return 70;
    const total = list.reduce((sum, player) => sum + (player.attributes?.[keyA] || 0) + (keyB ? player.attributes?.[keyB] || 0 : 0), 0);
    return Math.round(total / (list.length * (keyB ? 2 : 1)));
  };
  return {
    offense: avg(skaters, "shooting", "passing"),
    defense: avg(skaters, "defense", "awareness"),
    goalie: avg(goalies, "reflexes", "positioning"),
  };
};

export const getAutoLineup = (team) => {
  const skaters = (team?.roster || [])
    .filter((player) => player.position !== "G")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
  const goalie = (team?.roster || []).filter((player) => player.position === "G").sort((a, b) => b.rating - a.rating)[0] || null;
  return { skaters: skaters.map((player) => player.id), goalie: goalie?.id || null };
};

export const pickLineup = (team, lineup) => {
  const roster = team?.roster || [];
  const skaters = lineup?.skaters?.length
    ? lineup.skaters.map((id) => roster.find((player) => player.id === id)).filter(Boolean)
    : getAutoLineup(team).skaters.map((id) => roster.find((player) => player.id === id)).filter(Boolean);
  const goalie = lineup?.goalie ? roster.find((player) => player.id === lineup.goalie) : roster.find((player) => player.position === "G");
  return { skaters, goalie };
};

export const buildStandings = (teams, schedule) => {
  const map = new Map();
  teams.forEach((team) => {
    map.set(team.id, { id: team.id, name: team.name, wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });
  });
  schedule.forEach((week) => {
    week.matches.forEach((match) => {
      if (!match.result) return;
      const home = map.get(match.homeId);
      const away = map.get(match.awayId);
      if (!home || !away) return;
      home.goalsFor += match.result.home;
      home.goalsAgainst += match.result.away;
      away.goalsFor += match.result.away;
      away.goalsAgainst += match.result.home;
      if (match.result.home > match.result.away) {
        home.wins += 1;
        away.losses += 1;
      } else {
        away.wins += 1;
        home.losses += 1;
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => b.wins - a.wins || b.goalsFor - a.goalsFor);
};

export const getNextMatchForTeam = (teamId, schedule) => {
  for (const week of schedule) {
    for (const match of week.matches) {
      if (match.result) continue;
      if (match.homeId === teamId || match.awayId === teamId) return match;
    }
  }
  return null;
};

export const simulateMatch = (match, teamMap) => {
  if (match.result) return match;
  const home = teamMap.get(match.homeId);
  const away = teamMap.get(match.awayId);
  const homeRating = calcTeamRating(home) + 2.5;
  const awayRating = calcTeamRating(away);
  const baseHome = 2 + (homeRating - 70) * 0.06;
  const baseAway = 2 + (awayRating - 70) * 0.06;
  let homeGoals = Math.max(0, Math.round(baseHome + Math.random() * 2.4));
  let awayGoals = Math.max(0, Math.round(baseAway + Math.random() * 2.4));
  if (homeGoals === awayGoals) {
    if (Math.random() < 0.5) homeGoals += 1;
    else awayGoals += 1;
  }
  return {
    ...match,
    result: { home: homeGoals, away: awayGoals },
  };
};

const updatePlayerMorale = (player, didPlay) => {
  const contractBand = player.contract?.salaryBand || "rookie";
  let delta = didPlay ? 2 : -2;
  if (contractBand === "star" && !didPlay) delta -= 3;
  if (contractBand === "rookie" && didPlay) delta += 1;
  if (player.fatigue > 70) delta -= 1;
  const next = clamp((player.morale ?? 70) + delta, 40, 99);
  return { ...player, morale: next };
};

const updatePlayerFatigue = (player, didPlay, noFatigue) => {
  if (noFatigue) return player;
  const delta = didPlay ? 6 : -3;
  const next = clamp((player.fatigue ?? 0) + delta, 0, 99);
  return { ...player, fatigue: next };
};

const awardXp = (player, amount) => {
  const nextRating = clamp(Math.round(player.rating + amount), 35, 99);
  return { ...player, rating: nextRating };
};

const pickWeighted = (players) => {
  const weights = players.map((player) => (player.rating || 60) + Math.random() * 12);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < players.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return players[i];
  }
  return players[0];
};

const allocateGoals = (team, goals, lineup) => {
  const skaters = lineup?.skaters?.length ? lineup.skaters : (team?.roster || []).filter((player) => player.position !== "G");
  const results = [];
  for (let i = 0; i < goals; i += 1) {
    const scorer = pickWeighted(skaters);
    const assister = skaters.length > 1 ? pickWeighted(skaters.filter((player) => player.id !== scorer.id)) : null;
    results.push({ scorer, assister });
  }
  return results;
};

export const buildMomentum = (homeTeam, awayTeam, scores) => {
  const ratingDiff = calcTeamRating(homeTeam) - calcTeamRating(awayTeam);
  const homeShots = clamp(Math.round(24 + ratingDiff * 0.4 + Math.random() * 6), 12, 40);
  const awayShots = clamp(Math.round(22 - ratingDiff * 0.3 + Math.random() * 6), 10, 36);
  const homeHits = clamp(randomInt(12, 28) + Math.round(scores.home - scores.away), 8, 36);
  const awayHits = clamp(randomInt(12, 28) + Math.round(scores.away - scores.home), 8, 36);
  const homePoss = clamp(Math.round(50 + ratingDiff * 0.4 + Math.random() * 6 - 3), 40, 60);
  const awayPoss = clamp(100 - homePoss, 40, 60);
  return {
    shots: { home: homeShots, away: awayShots },
    hits: { home: homeHits, away: awayHits },
    possession: { home: homePoss, away: awayPoss },
  };
};

export const applyMatchStats = (team, scores, momentum, lineup, isHome, noFatigue) => {
  const nextRoster = (team?.roster || []).map((player) => ({ ...player }));
  const lookup = new Map(nextRoster.map((player) => [player.id, player]));
  const activeSkaters = lineup.skaters.map((player) => lookup.get(player.id)).filter(Boolean);
  const goalie = lineup.goalie ? lookup.get(lineup.goalie.id) : null;
  const goals = isHome ? scores.home : scores.away;
  const shots = isHome ? momentum.shots.home : momentum.shots.away;
  const goalEvents = allocateGoals(team, goals, { skaters: activeSkaters });
  goalEvents.forEach(({ scorer, assister }) => {
    const scorerRef = lookup.get(scorer.id);
    if (scorerRef) scorerRef.stats.goals += 1;
    if (assister) {
      const assisterRef = lookup.get(assister.id);
      if (assisterRef) assisterRef.stats.assists += 1;
    }
  });
  const saves = Math.max(0, shots - goals);
  if (goalie) {
    goalie.stats.saves += saves;
    goalie.stats.games += 1;
  }
  activeSkaters.forEach((player) => {
    const ref = lookup.get(player.id);
    if (ref) ref.stats.games += 1;
  });
  nextRoster.forEach((player) => {
    const didPlay = activeSkaters.some((skater) => skater.id === player.id) || player.id === goalie?.id;
    const withMorale = updatePlayerMorale(player, didPlay);
    const withFatigue = updatePlayerFatigue(withMorale, didPlay, noFatigue);
    Object.assign(player, withFatigue);
  });
  return { ...team, roster: nextRoster };
};

export const buildRecap = (homeTeam, awayTeam, scores, momentum) => {
  const pickLeader = (team) => {
    const skaters = (team?.roster || []).filter((player) => player.position !== "G");
    const sorted = skaters.sort((a, b) => (b.stats.goals + b.stats.assists) - (a.stats.goals + a.stats.assists));
    const leader = sorted[0];
    return leader
      ? { name: leader.name, points: leader.stats.goals + leader.stats.assists, goals: leader.stats.goals, assists: leader.stats.assists }
      : { name: "TBD", points: 0, goals: 0, assists: 0 };
  };
  return {
    home: { id: homeTeam.id, name: homeTeam.name, score: scores.home, leader: pickLeader(homeTeam) },
    away: { id: awayTeam.id, name: awayTeam.name, score: scores.away, leader: pickLeader(awayTeam) },
    momentum,
    playedAt: Date.now(),
  };
};

export const calculatePayroll = (team) =>
  (team?.roster || []).reduce((total, player) => total + (player.contract?.salary || 0), 0);

export const getTeamNeeds = (team) => {
  const positions = ["G", "DEF", "FWD"];
  const averages = positions.map((pos) => {
    const list = (team?.roster || []).filter((player) => player.position === pos);
    const avg = list.length ? list.reduce((sum, player) => sum + player.rating, 0) / list.length : 60;
    return { pos, avg };
  });
  averages.sort((a, b) => a.avg - b.avg);
  return averages.map((entry) => entry.pos);
};

export const evaluateTradeConfidence = ({ offerPlayers, targetPlayers, targetTeamNeeds }) => {
  const sumRating = (list) => list.reduce((sum, player) => sum + (player.rating || 0), 0);
  const sumSalary = (list) => list.reduce((sum, player) => sum + (player.contract?.salary || 0), 0);
  const offerValue = sumRating(offerPlayers);
  const targetValue = sumRating(targetPlayers);
  const salaryDelta = sumSalary(targetPlayers) - sumSalary(offerPlayers);
  const needBonus = offerPlayers.some((player) => targetTeamNeeds.includes(player.position)) ? 8 : 0;
  const giveNeedPenalty = targetPlayers.some((player) => targetTeamNeeds.includes(player.position)) ? -6 : 0;
  const score = 38 + (offerValue - targetValue) * 1.2 + salaryDelta * 0.01 + needBonus + giveNeedPenalty;
  return clamp(Math.round(score), 5, 95);
};

export const applySeasonGrowth = (team, growthModifier = 1) => {
  const roster = (team?.roster || []).map((player) => {
    const potential = player.potential || 70;
    const ageFactor = player.age <= 21 ? 1.15 : player.age <= 27 ? 1 : 0.85;
    const growth = Math.max(0, Math.round(((potential - 60) / 40) * 2.2 * ageFactor * growthModifier));
    const nextRating = clamp(player.rating + growth, 35, 99);
    return { ...player, rating: nextRating, age: player.age + 1 };
  });
  return { ...team, roster };
};

export const buildProspect = (index) => {
  const roster = createRoster();
  const base = roster[randomInt(0, roster.length - 1)];
  return {
    id: `pr_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
    name: base.name,
    position: base.position,
    rating: clamp(base.rating + randomInt(-8, 4), 45, 80),
    potential: clamp(base.potential + randomInt(4, 16), 55, 99),
    age: clamp(base.age, 17, 22),
    attributes: base.attributes,
    revealed: [],
  };
};

export const buildProspectPool = (count = 24) => Array.from({ length: count }, (_, index) => buildProspect(index));

export const scoutProspect = (prospect) => {
  const keys = Object.keys(prospect.attributes || {});
  const revealable = keys.filter((key) => !prospect.revealed.includes(key));
  if (!revealable.length) return prospect;
  const pick = revealable[Math.floor(Math.random() * revealable.length)];
  return { ...prospect, revealed: [...prospect.revealed, pick] };
};

export const createRookieContract = (rating, position = "FWD") => {
  const bandDef = position === "G" ? SALARY_BANDS.goalie : SALARY_BANDS.rookie;
  const salary = Math.round(bandDef.min + Math.random() * (bandDef.max - bandDef.min));
  return { years: 2, salaryBand: position === "G" ? "goalie" : "rookie", salary };
};

export const resignPlayer = (player) => ({
  ...player,
  contract: buildContract(player.rating, player.position),
  morale: clamp((player.morale || 70) + 6, 40, 99),
});

export const computeSeasonAwards = (teams) => {
  const allPlayers = teams.flatMap((team) => team.roster.map((player) => ({ ...player, teamId: team.id, teamName: team.name })));
  const skaters = allPlayers.filter((player) => player.position !== "G");
  const goalies = allPlayers.filter((player) => player.position === "G");
  const topScorer = skaters.sort((a, b) => b.stats.goals - a.stats.goals)[0];
  const bestGoalie = goalies.sort((a, b) => b.stats.saves - a.stats.saves)[0];
  const rookies = skaters.filter((player) => player.age <= 20);
  const rookie = rookies.sort((a, b) => (b.stats.goals + b.stats.assists) - (a.stats.goals + a.stats.assists))[0];
  return [
    topScorer ? { type: "Top Scorer", player: topScorer.name, team: topScorer.teamName } : null,
    bestGoalie ? { type: "Best Goalie", player: bestGoalie.name, team: bestGoalie.teamName } : null,
    rookie ? { type: "Rookie of the Year", player: rookie.name, team: rookie.teamName } : null,
  ].filter(Boolean);
};

export const applyAwardBonuses = (teams, awards) =>
  teams.map((team) => ({
    ...team,
    roster: team.roster.map((player) => {
      const winner = awards.find((award) => award.player === player.name);
      if (!winner) return player;
      const boosted = awardXp(player, 1);
      return { ...boosted, morale: clamp((boosted.morale || 70) + 5, 40, 99) };
    }),
  }));

export const applyMatchOutcome = (save, match, scores, options = {}) => {
  const teamMap = new Map(save.teams.map((team) => [team.id, team]));
  const homeTeam = teamMap.get(match.homeId);
  const awayTeam = teamMap.get(match.awayId);
  if (!homeTeam || !awayTeam) return save;
  const momentum = buildMomentum(homeTeam, awayTeam, scores);
  const homeLineup = match.homeId === save.teamId ? pickLineup(homeTeam, save.lineup) : pickLineup(homeTeam, null);
  const awayLineup = match.awayId === save.teamId ? pickLineup(awayTeam, save.lineup) : pickLineup(awayTeam, null);
  const noFatigue = options.noFatigue || false;
  const updatedTeams = save.teams.map((team) => {
    if (team.id === homeTeam.id) return applyMatchStats(team, scores, momentum, homeLineup, true, noFatigue);
    if (team.id === awayTeam.id) return applyMatchStats(team, scores, momentum, awayLineup, false, noFatigue);
    return team;
  });
  const updatedSchedule = save.schedule.map((week) => ({
    ...week,
    matches: week.matches.map((item) => {
      const isTarget =
        item === match || (item.homeId === match.homeId && item.awayId === match.awayId && !item.result);
      return isTarget ? { ...item, result: { home: scores.home, away: scores.away } } : item;
    }),
  }));
  const nextWeek = updatedSchedule.find((week) => week.matches.some((item) => !item.result));
  const standings = buildStandings(updatedTeams, updatedSchedule);
  const recap = buildRecap(
    updatedTeams.find((team) => team.id === homeTeam.id),
    updatedTeams.find((team) => team.id === awayTeam.id),
    scores,
    momentum
  );
  return {
    ...save,
    teams: updatedTeams,
    schedule: updatedSchedule,
    week: nextWeek ? nextWeek.week : save.week,
    standings,
    lastGameRecap: recap,
  };
};

export const applyPracticeRewards = (team, preset, noFatigue = false) => {
  const roster = team.roster.map((player) => ({ ...player }));
  const focusPositions = preset === "goalie" ? ["G"] : preset === "defense" ? ["DEF"] : ["FWD", "DEF"];
  const focus = roster
    .filter((player) => focusPositions.includes(player.position))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2);
  const updated = roster.map((player) => {
    const isFocus = focus.some((item) => item.id === player.id);
    const boosted = isFocus ? awardXp(player, 1) : player;
    if (noFatigue) return boosted;
    return { ...boosted, fatigue: clamp((boosted.fatigue ?? 0) + (isFocus ? 2 : 1), 0, 99) };
  });
  return { ...team, roster: updated };
};
