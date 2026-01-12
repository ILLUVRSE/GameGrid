const TEAM_DEFS = [
  {
    id: "aurora",
    name: "Aurora Wolves",
    arena: "Northern Lights Arena",
    logo: "AW",
    colors: { primary: "#43d9ad", secondary: "#0b1224" },
  },
  {
    id: "comets",
    name: "Neon Comets",
    arena: "Comet Core Arena",
    logo: "NC",
    colors: { primary: "#7aa2ff", secondary: "#0b1224" },
  },
  {
    id: "frost",
    name: "Frostbite FC",
    arena: "Glacier Vault",
    logo: "FF",
    colors: { primary: "#7dd3fc", secondary: "#0b1224" },
  },
  {
    id: "inferno",
    name: "Inferno Circuit",
    arena: "Ember Grid",
    logo: "IC",
    colors: { primary: "#f97316", secondary: "#1b0f07" },
  },
  {
    id: "nova",
    name: "Nova Pulse",
    arena: "Pulse Dome",
    logo: "NP",
    colors: { primary: "#f6c453", secondary: "#0b1224" },
  },
  {
    id: "orbit",
    name: "Orbit Titans",
    arena: "Gravity Hangar",
    logo: "OT",
    colors: { primary: "#a78bfa", secondary: "#120b24" },
  },
  {
    id: "surge",
    name: "Surge Coast",
    arena: "Tidal Deck",
    logo: "SC",
    colors: { primary: "#38bdf8", secondary: "#08202a" },
  },
  {
    id: "zenith",
    name: "Zenith Drift",
    arena: "Zenith Spire",
    logo: "ZD",
    colors: { primary: "#f472b6", secondary: "#1a0b1b" },
  },
];

const FIRST_NAMES = [
  "Ari",
  "Jett",
  "Nova",
  "Rin",
  "Kai",
  "Zoe",
  "Luca",
  "Mira",
  "Beck",
  "Sage",
  "Finn",
  "Ivy",
  "Rhys",
  "Wren",
  "Noel",
  "Rook",
];

const LAST_NAMES = [
  "Kade",
  "Sol",
  "Vega",
  "Hart",
  "Storm",
  "Vale",
  "Rowe",
  "Blaze",
  "North",
  "Cruz",
  "Stone",
  "Quill",
  "Ryder",
  "Skye",
  "Lane",
  "Ash",
];

const POSITION_TEMPLATE = ["FWD", "FWD", "DEF", "G", "FWD", "DEF"];

const SALARY_BANDS = {
  rookie: { min: 50, max: 160, years: [1, 2] },
  starter: { min: 160, max: 320, years: [2, 3] },
  star: { min: 320, max: 520, years: [3, 4] },
  goalie: { min: 100, max: 220, years: [2, 3] },
};

const randomChoice = (list) => list[Math.floor(Math.random() * list.length)];

const clampStat = (value) => Math.max(35, Math.min(99, Math.round(value)));

const buildSkaterStats = (rating) => {
  const variance = () => (Math.random() * 10 - 5);
  return {
    skating: clampStat(rating + variance()),
    shooting: clampStat(rating + variance()),
    passing: clampStat(rating + variance()),
    defense: clampStat(rating + variance()),
    awareness: clampStat(rating + variance()),
    stamina: clampStat(rating + variance()),
  };
};

const buildGoalieStats = (rating) => {
  const variance = () => (Math.random() * 10 - 5);
  return {
    reflexes: clampStat(rating + variance()),
    positioning: clampStat(rating + variance()),
    recovery: clampStat(rating + variance()),
    puckHandling: clampStat(rating + variance()),
    stamina: clampStat(rating + variance()),
  };
};

const ratingFromStats = (stats) => {
  const values = Object.values(stats);
  if (!values.length) return 70;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
};

const pickSalaryBand = (rating) => {
  if (rating >= 86) return "star";
  if (rating >= 76) return "starter";
  return "rookie";
};

const buildContract = (rating, position = "FWD") => {
  const band = pickSalaryBand(rating);
  const bandDef = position === "G" ? SALARY_BANDS.goalie : SALARY_BANDS[band];
  const years = bandDef.years[Math.floor(Math.random() * bandDef.years.length)];
  const salary = Math.round(bandDef.min + Math.random() * (bandDef.max - bandDef.min));
  return { years, salaryBand: position === "G" ? "goalie" : band, salary };
};

const createPlayer = (position, index) => {
  const name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
  const base = position === "G" ? 48 : 46;
  const ratingSeed = Math.round(base + Math.random() * 14);
  const stats = position === "G" ? buildGoalieStats(ratingSeed) : buildSkaterStats(ratingSeed);
  const rating = ratingFromStats(stats);
  const contract = buildContract(rating, position);
  return {
    id: `p_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
    name,
    position,
    rating,
    potential: clampStat(rating + (Math.random() * 18 - 6)),
    age: 18 + Math.floor(Math.random() * 13),
    stats: { goals: 0, assists: 0, saves: 0, games: 0 },
    morale: 70 + Math.floor(Math.random() * 20),
    fatigue: Math.floor(Math.random() * 10),
    contract,
    attributes: stats,
  };
};

const createRoster = () => POSITION_TEMPLATE.map((pos, index) => createPlayer(pos, index));

const buildTeams = () =>
  TEAM_DEFS.map((team) => ({
    ...team,
    logo: team.logo || team.name.split(" ").map((word) => word[0]).join("").slice(0, 3).toUpperCase(),
    roster: createRoster(),
    captainId: null,
  }));

const generateSchedule = (teams) => {
  const ids = teams.map((team) => team.id);
  const rounds = ids.length - 1;
  const half = ids.length / 2;
  const list = ids.slice();
  const schedule = [];
  for (let round = 0; round < rounds; round += 1) {
    const matches = [];
    for (let i = 0; i < half; i += 1) {
      const home = list[i];
      const away = list[list.length - 1 - i];
      matches.push({ homeId: home, awayId: away, result: null });
    }
    schedule.push({ week: round + 1, matches });
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list.splice(0, list.length, fixed, ...rest);
  }
  return schedule;
};

export { TEAM_DEFS, SALARY_BANDS, buildTeams, buildContract, createRoster, generateSchedule };
