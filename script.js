const inventoryEl = document.getElementById("inventory");
const timeDisplay = document.getElementById("timeDisplay");
const aiSlot = document.getElementById("aiSlot");

let inventory = {
  coal: 65
};
let isDay = true;

function updateInventory() {
  inventoryEl.innerHTML = '';
  for (let key in inventory) {
    const itemEl = document.createElement('div');
    itemEl.className = 'item';
    itemEl.textContent = `${key}: ${inventory[key]}`;
    inventoryEl.appendChild(itemEl);
  }
}

function switchTime() {
  isDay = !isDay;
  timeDisplay.textContent = isDay ? "⏰ День" : "🌙 Ночь";

  if (inventory.coal > 0) {
    inventory.coal--;
    aiSlot.textContent = "🤖 ИИ активен";
  } else {
    if (isDay) {
      aiSlot.textContent = "☀️ ИИ активен от солнца";
    } else {
      aiSlot.textContent = "💤 ИИ выключен";
    }
  }
  updateInventory();
}

function tryMine() {
  if (!isDay && inventory.coal <= 0) return;

  let chance = 0;
  if (isDay) {
    chance = inventory.coal > 0 ? 0.5 : 0.15;
  } else {
    chance = 0.4; // ночью можно копать только с углём
  }

  if (Math.random() < chance) {
    inventory.coal = (inventory.coal || 0) + 1;
    updateInventory();
  }
}

document.getElementById("mineBtn").addEventListener("click", tryMine);
document.getElementById("craftBtn").addEventListener("click", () => alert("Крафт пока не реализован"));

updateInventory();
setInterval(switchTime, 10000);

