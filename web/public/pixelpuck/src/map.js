import {
  CHAMPION_IDS,
  COUNTRIES,
  FINAL_NODE,
  REGION_LABELS,
  REGIONS,
  STARTING_COUNTRIES,
  getCountry,
  getEdges,
  getRegionHaze,
  getRegionNonChampions,
} from "./data/countriesData.js";

const buildUnlockedSet = (defeated) => {
  const defeatedSet = new Set(defeated);
  const unlocked = new Set(STARTING_COUNTRIES);

  defeated.forEach((id) => {
    const country = getCountry(id);
    if (country) {
      country.nextIds.forEach((nextId) => unlocked.add(nextId));
      unlocked.add(country.id);
    }
  });

  REGIONS.forEach((region) => {
    const nonChampions = getRegionNonChampions(region);
    if (nonChampions.every((country) => defeatedSet.has(country.id))) {
      COUNTRIES.filter((country) => country.region === region && country.isChampion).forEach((champion) => {
        unlocked.add(champion.id);
      });
    }
  });

  return unlocked;
};

const allChampionsDefeated = (defeated) => {
  const defeatedSet = new Set(defeated);
  return Array.from(CHAMPION_IDS).every((id) => defeatedSet.has(id));
};

const rankFor = (defeatedCount) => {
  if (defeatedCount >= 45) return "Legend";
  if (defeatedCount >= 35) return "Elite";
  if (defeatedCount >= 25) return "Pro";
  if (defeatedCount >= 15) return "Rising";
  return "Rookie";
};

const TWIST_LABELS = {
  LowFriction: "Low friction",
  HighFriction: "High friction",
  HeavierPuck: "Heavier puck",
  HighBounceWalls: "Higher wall bounce",
  SpinBoost: "Stronger spin",
  SideDrift: "Side drift",
  SpeedBurstPeriodic: "Periodic speed burst",
  AccelerationOverTime: "Puck accelerates over time",
  SmallerGoals: "Smaller goals",
  PrecisionMode: "Precision mode",
  HigherMaxSpeed: "Higher max speed",
  FasterResets: "Faster restarts",
  MicroWallDeflections: "Micro-deflection walls",
  HigherPaddleSpeed: "Higher paddle speed cap",
  None: "None",
};

const twistLabel = (twist) => TWIST_LABELS[twist] ?? twist;

const getRadius = (node) => {
  if (node.isFinal) return 0.055;
  if (node.isChampion) return 0.048;
  return 0.04;
};

const resolvePositions = (nodes) => {
  const working = nodes.map((node) => ({
    ...node,
    x: typeof node.x === "number" ? node.x : node.position?.x ?? 0.5,
    y: typeof node.y === "number" ? node.y : node.position?.y ?? 0.5,
    r: getRadius(node),
  }));

  for (let step = 0; step < 120; step += 1) {
    for (let i = 0; i < working.length; i += 1) {
      for (let j = i + 1; j < working.length; j += 1) {
        const a = working[i];
        const b = working[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const min = a.r + b.r + 0.012;
        if (dist < min) {
          const push = (min - dist) * 0.35;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    working.forEach((node) => {
      node.x = Math.min(0.96, Math.max(0.04, node.x));
      node.y = Math.min(0.94, Math.max(0.06, node.y));
    });
  }

  return working;
};

const buildAdjacency = (edges) => {
  const map = new Map();
  edges.forEach((edge) => {
    if (!map.has(edge.from)) map.set(edge.from, new Set());
    if (!map.has(edge.to)) map.set(edge.to, new Set());
    map.get(edge.from).add(edge.to);
    map.get(edge.to).add(edge.from);
  });
  return map;
};

const buildDetails = (country, status, onChallenge, onPractice, onBack, onAdminUnlock) => {
  const panel = document.createElement("div");
  panel.className = "details-panel";
  if (!country) {
    panel.innerHTML = `
      <h3>Select a country</h3>
      <p>Choose a node on the tournament map to see its details.</p>
      <div class="button-row">
        <button class="secondary" id="back-menu">Back</button>
      </div>
    `;
    panel.querySelector("#back-menu")?.addEventListener("click", onBack);
    return panel;
  }

  const disabled = status !== "available";
  const practiceDisabled = status === "locked";
  panel.innerHTML = `
    <div class="country-header">
      <div class="flag-large">${country.flag}</div>
      <div>
        <h3>${country.name}</h3>
        <p class="tag">${country.region}</p>
        ${country.isChampion ? '<p class="champion">CHAMPION</p>' : ""}
        ${country.isFinal ? '<p class="champion">WORLD FINALS</p>' : ""}
      </div>
    </div>
    <div class="detail-grid">
      <div>
        <span>Difficulty</span>
        <strong>Level ${country.difficulty}</strong>
      </div>
      <div>
        <span>Arena Twist</span>
        <strong>${twistLabel(country.arenaTwist)}</strong>
      </div>
      <div>
        <span>AI Style</span>
        <strong>${country.aiStyle}</strong>
      </div>
      <div>
        <span>Arena</span>
        <strong>${country.arenaName}</strong>
      </div>
      ${
        country.isFinal && status === "locked"
          ? `<div class="final-lock">Locked until all five champions are defeated.</div>
             <div class="admin-unlock">
               <input id="admin-code" type="password" placeholder="Admin code" />
               <button class="secondary" id="admin-unlock">Unlock Finals</button>
             </div>`
          : ""
      }
    </div>
    <div class="button-row">
      <button ${disabled ? "disabled" : ""} id="challenge">Challenge</button>
      <button class="secondary" ${practiceDisabled ? "disabled" : ""} id="practice">Practice</button>
      <button class="secondary" id="back-menu">Back</button>
    </div>
  `;

  panel.querySelector("#challenge")?.addEventListener("click", () => {
    if (!disabled) onChallenge(country);
  });
  panel.querySelector("#practice")?.addEventListener("click", () => {
    if (!practiceDisabled) onPractice(country);
  });
  panel.querySelector("#back-menu")?.addEventListener("click", onBack);
  panel.querySelector("#admin-unlock")?.addEventListener("click", () => {
    const input = panel.querySelector("#admin-code");
    if (input) onAdminUnlock(input.value);
  });

  return panel;
};

export const renderMapScreen = (options) => {
  const { save, onStartMatch, onBackMenu, onUpdateSave, onOpenShop } = options;

  const defeatedSet = new Set(save.defeatedCountries);
  const unlockedSet = buildUnlockedSet(save.defeatedCountries);
  const defeatedCount = save.defeatedCountries.length;

  if (save.finalsUnlockedOverride || allChampionsDefeated(save.defeatedCountries)) {
    unlockedSet.add(FINAL_NODE.id);
  }

  let selectedId = save.selectedCountryId;
  if (!selectedId || (!getCountry(selectedId) && selectedId !== FINAL_NODE.id)) {
    selectedId = Array.from(unlockedSet)[0] ?? COUNTRIES[0].id;
  }

  const screen = document.createElement("section");
  screen.className = "screen tournament";

  const topbar = document.createElement("div");
  topbar.className = "tournament-topbar";
  topbar.innerHTML = `
    <div class="topbar-actions">
      <button class="secondary" id="back"><- Back</button>
      <button class="secondary" id="shop">Shop</button>
    </div>
    <div class="title">
      <p class="eyebrow">PIXELPUCK</p>
      <h2>World Air Hockey Tournament</h2>
    </div>
    <div class="progress">
      <span>Countries Defeated: ${defeatedCount} / ${COUNTRIES.length}</span>
      <span class="rank">World Rank: ${rankFor(defeatedCount)}</span>
    </div>
  `;

  const layout = document.createElement("div");
  layout.className = "tournament-layout";

  const mapPanel = document.createElement("div");
  mapPanel.className = "map-panel";

  const worldMap = document.createElement("div");
  worldMap.className = "world-map";

  REGIONS.forEach((region) => {
    const haze = getRegionHaze(region);
    const layer = document.createElement("div");
    layer.className = "region-haze";
    layer.style.left = `${haze.x * 100}%`;
    layer.style.top = `${haze.y * 100}%`;
    layer.style.width = `${haze.w * 100}%`;
    layer.style.height = `${haze.h * 100}%`;
    layer.style.background = `radial-gradient(circle, ${haze.color}, rgba(0,0,0,0))`;
    worldMap.appendChild(layer);
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("world-lines");

  const nodes = [...COUNTRIES, FINAL_NODE];
  const adjustedNodes = resolvePositions(nodes);
  const nodeById = new Map(adjustedNodes.map((node) => [node.id, node]));

  const edges = getEdges();
  const adjacency = buildAdjacency(edges);

  const edgeElements = [];
  edges.forEach((edge) => {
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    if (!fromNode || !toNode) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${fromNode.x * 100}`);
    line.setAttribute("y1", `${fromNode.y * 100}`);
    line.setAttribute("x2", `${toNode.x * 100}`);
    line.setAttribute("y2", `${toNode.y * 100}`);
    line.dataset.from = edge.from;
    line.dataset.to = edge.to;

    const fromDefeated = defeatedSet.has(fromNode.id);
    const toAvailable = unlockedSet.has(toNode.id);
    line.classList.add("edge");
    line.classList.add(fromDefeated && toAvailable ? "edge-active" : "edge-dim");
    svg.appendChild(line);
    edgeElements.push(line);
  });

  worldMap.appendChild(svg);

  Object.entries(REGION_LABELS).forEach(([region, pos]) => {
    const label = document.createElement("div");
    label.className = "region-label";
    label.textContent = region;
    label.style.left = `${pos.x * 100}%`;
    label.style.top = `${pos.y * 100}%`;
    worldMap.appendChild(label);
  });

  const openPractice = (country) => {
    if (!country) return;
    onStartMatch(country, { practice: true });
  };

  const modal = document.createElement("div");
  modal.className = "modal modal-fixed";
  modal.style.display = "none";

  const modalCard = document.createElement("div");
  modalCard.className = "modal-card";
  modal.appendChild(modalCard);

  const closeModal = () => {
    modal.style.display = "none";
    screen.classList.remove("modal-open");
  };

  const openModal = (country) => {
    const defeated = defeatedSet.has(country.id);
    const available = unlockedSet.has(country.id);
    if (defeated || !available) return;
    modalCard.innerHTML = `
      <h3>${country.flag} ${country.name}</h3>
      <p>${country.arenaName} · ${twistLabel(country.arenaTwist)}</p>
      <p>Difficulty: Level ${country.difficulty}</p>
      <div class="button-row" style="justify-content:center;">
        <button id="confirm">Start Match</button>
        <button class="secondary" id="cancel">Cancel</button>
      </div>
    `;
    modal.style.display = "grid";
    screen.classList.add("modal-open");
    modal.querySelector("#confirm")?.addEventListener("click", () => onStartMatch(country));
    modal.querySelector("#cancel")?.addEventListener("click", closeModal);
  };

  const handleAdminUnlock = (code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (normalized !== "PIXELPUCK-ADMIN") return;
    save.finalsUnlockedOverride = true;
    unlockedSet.add(FINAL_NODE.id);
    onUpdateSave(save);
    updateDetails(FINAL_NODE.id);
  };

  let detailsPanel;

  const nodeElements = new Map();

  const setFocus = (focusId) => {
    nodeElements.forEach((node, id) => {
      node.classList.toggle("selected", id === selectedId);
      node.classList.toggle("focused", id === focusId);
      node.classList.toggle("neighbor", focusId && adjacency.get(focusId)?.has(id));
    });

    edgeElements.forEach((edge) => {
      const from = edge.dataset.from;
      const to = edge.dataset.to;
      const involved = focusId && (from === focusId || to === focusId);
      edge.classList.toggle("edge-focus", involved);
      edge.classList.toggle("edge-fade", focusId && !involved);
    });
  };

  const updateDetails = (id) => {
    const country = id === FINAL_NODE.id ? FINAL_NODE : getCountry(id);
    const defeated = defeatedSet.has(id);
    const available = unlockedSet.has(id);
    const status = defeated ? "defeated" : available ? "available" : "locked";
    detailsPanel.replaceWith(buildDetails(country, status, openModal, openPractice, onBackMenu, handleAdminUnlock));
    detailsPanel = layout.querySelector(".details-panel");
  };

  adjustedNodes.forEach((country) => {
    const defeated = defeatedSet.has(country.id);
    const available = unlockedSet.has(country.id);
    const status = defeated ? "defeated" : available ? "available" : "locked";
    const node = document.createElement("button");
    node.type = "button";
    node.className = `country-node ${status}`;
    if (save.lastDefeatedId && save.lastDefeatedId === country.id) {
      node.classList.add("defeated-animate");
    }
    if (country.isChampion) node.classList.add("champion");
    if (country.isFinal) node.classList.add("final");
    node.title = `${twistLabel(country.arenaTwist)} · Level ${country.difficulty}`;
    node.style.left = `${country.x * 100}%`;
    node.style.top = `${country.y * 100}%`;
    node.style.transform = "translate(-50%, -50%)";
    node.innerHTML = `
      <span class="flag">${country.flag}</span>
      <span class="label">${country.name}</span>
      ${country.isChampion ? '<span class="crown">👑</span>' : ""}
      ${country.isFinal ? '<span class="final-icon">🏆</span><span class="final-label">Finals</span>' : ""}
    `;

    node.addEventListener("click", () => {
      selectedId = country.id;
      save.selectedCountryId = country.id;
      onUpdateSave(save);
      updateDetails(country.id);
      setFocus(selectedId);
    });

    node.addEventListener("mouseenter", () => setFocus(country.id));
    node.addEventListener("mouseleave", () => setFocus(selectedId));

    nodeElements.set(country.id, node);
    worldMap.appendChild(node);
  });

  mapPanel.appendChild(worldMap);

  const selectedCountry = selectedId === FINAL_NODE.id ? FINAL_NODE : getCountry(selectedId);
  const selectedDefeated = defeatedSet.has(selectedId);
  const selectedAvailable = unlockedSet.has(selectedId);
  detailsPanel = buildDetails(
    selectedCountry,
    selectedDefeated ? "defeated" : selectedAvailable ? "available" : "locked",
    openModal,
    openPractice,
    onBackMenu,
    handleAdminUnlock
  );

  const legend = document.createElement("div");
  legend.className = "map-legend";
  legend.innerHTML = `
    <div><span class="legend-dot locked"></span> Locked</div>
    <div><span class="legend-dot available"></span> Available</div>
    <div><span class="legend-dot defeated"></span> Defeated</div>
    <div><span class="legend-dot champion"></span> Champion</div>
  `;

  mapPanel.appendChild(legend);

  layout.appendChild(mapPanel);
  layout.appendChild(detailsPanel);

  screen.appendChild(topbar);
  screen.appendChild(layout);

  topbar.querySelector("#back")?.addEventListener("click", onBackMenu);
  topbar.querySelector("#shop")?.addEventListener("click", () => onOpenShop?.());

  screen.appendChild(modal);

  setFocus(selectedId);

  if (save.lastDefeatedId) {
    const lastId = save.lastDefeatedId;
    window.setTimeout(() => {
      if (save.lastDefeatedId === lastId) {
        save.lastDefeatedId = null;
        onUpdateSave(save);
      }
    }, 1300);
  }

  return screen;
};
