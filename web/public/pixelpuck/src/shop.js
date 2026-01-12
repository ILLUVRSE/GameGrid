const POWER_UPS = [
  {
    id: "PaddleSizePlus10",
    name: "Paddle Size +10%",
    description: "10% larger paddle, slightly slower accel.",
    cost: 200,
  },
  {
    id: "PaddleAccelBoost",
    name: "Paddle Accel Boost",
    description: "Faster accel with the same top speed.",
    cost: 200,
  },
  {
    id: "PowerHit",
    name: "Power Hit",
    description: "Slightly stronger hits when moving fast.",
    cost: 220,
  },
  {
    id: "ControlGrip",
    name: "Control Grip",
    description: "Reduces spin randomness for steadier control.",
    cost: 180,
  },
  {
    id: "StabilityCore",
    name: "Stability Core",
    description: "Smoother decel with less abrupt stopping.",
    cost: 180,
  },
];

export const renderShopScreen = (options) => {
  const { save, onUpdate, onBack } = options;

  const screen = document.createElement("section");
  screen.className = "screen";

  const header = document.createElement("div");
  header.innerHTML = `
    <h2>Shop</h2>
    <p>Equip one passive paddle mod at a time. Power-ups never affect the AI.</p>
  `;

  const goldCard = document.createElement("div");
  goldCard.className = "stat-card";
  goldCard.innerHTML = `
    <h3>Gold</h3>
    <div class="stat-value" id="shop-gold">${save.gold}</div>
  `;

  const grid = document.createElement("div");
  grid.className = "shop-grid";

  const renderItems = () => {
    grid.innerHTML = "";
    POWER_UPS.forEach((item) => {
      const owned = save.ownedPowerUps.includes(item.id);
      const equipped = save.equippedPowerUp === item.id;
      const canAfford = save.gold >= item.cost;

      const card = document.createElement("div");
      card.className = "shop-item";
      card.innerHTML = `
        <div>
          <h4>${item.name}</h4>
          <p>${item.description}</p>
        </div>
        <div class="shop-meta">
          <div class="level">${owned ? "Owned" : `Cost: ${item.cost}`}</div>
          <button ${owned ? "" : canAfford ? "" : "disabled"}>
            ${owned ? (equipped ? "Equipped" : "Equip") : "Buy"}
          </button>
        </div>
      `;

      const button = card.querySelector("button");
      if (button) {
        button.addEventListener("click", () => {
          if (!owned) {
            if (!canAfford) return;
            save.gold -= item.cost;
            save.ownedPowerUps.push(item.id);
          }
          save.equippedPowerUp = item.id;
          onUpdate(save);
          const goldValue = goldCard.querySelector("#shop-gold");
          if (goldValue) goldValue.textContent = String(save.gold);
          renderItems();
        });
      }

      grid.appendChild(card);
    });
  };

  renderItems();

  const actions = document.createElement("div");
  actions.className = "button-row";
  actions.innerHTML = `<button class="secondary" id="back-map">Return to Map</button>`;
  actions.querySelector("#back-map")?.addEventListener("click", onBack);

  screen.appendChild(header);
  screen.appendChild(goldCard);
  screen.appendChild(grid);
  screen.appendChild(actions);

  return screen;
};
