// script.js

const inventorySize = 9;
const inventory = new Array(inventorySize).fill(null);
const leftSlots = document.getElementById('leftSlots');
const rightSlots = document.getElementById('rightSlots');
const inventoryDiv = document.getElementById('inventory');
const mineBtn = document.getElementById('mineBtn');
const logBox = document.getElementById('logBox');
const aiSlot = document.getElementById('aiSlot');
const timeDisplay = document.getElementById('timeDisplay');
const toggleTradeBtn = document.getElementById('toggleTrade');
const currencyDisplay = document.getElementById('currencyDisplay');

let coalSlotIndex = 0;
let sellMode = false;
let currency = 0;
let isDay = true;
let coalActive = false;
let aiActive = true;
let lastMineTime = 0;

function log(msg) {
  const entry = document.createElement('div');
  entry.textContent = msg;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

function updateCurrencyDisplay() {
  currencyDisplay.textContent = `TNG: ${currency}₸`;
}

function updateInventory() {
  inventoryDiv.innerHTML = '';
  inventory.forEach((item, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (item) {
      slot.innerHTML = `${item.icon}<br>${item.name} (${item.count})`;
    }
    if (sellMode && item?.name === 'Мусор') {
      slot.classList.add('sell-mode');
      const sellLabel = document.createElement('div');
      sellLabel.className = 'sell-label';
      sellLabel.textContent = 'Продать';
      slot.appendChild(sellLabel);
    }
    slot.addEventListener('click', () => {
      if (sellMode && item?.name === 'Мусор') {
        currency += item.count;
        inventory[i] = null;
        updateCurrencyDisplay();
        updateInventory();
        saveGame();
        return;
      }

      if (i === coalSlotIndex && item?.name === 'Уголь') {
        if (!coalActive && item.count > 0) {
          coalActive = true;
          item.count--;
          if (item.count === 0) inventory[i] = null;
          updateInventory();
          log('Уголь активирован.');
        }
        saveGame();
      }
    });
    inventoryDiv.appendChild(slot);
  });
}

function passiveMine() {
  if (!aiActive) return;
  if (Math.random() < 0.01) {
    addItem({ name: 'Мусор', icon: '🗑️', count: 1 });
  }
}

function mineResources() {
  if (!aiActive) return;
  const now = Date.now();
  if (now - lastMineTime < 3000) return;
  lastMineTime = now;

  let chance = coalActive ? 0.07 : isDay ? 0.04 : 0;
  if (Math.random() < chance) {
    addItem({ name: 'Мусор', icon: '🗑️', count: 1 });
  } else {
    log('Ничего не найдено.');
  }
  updateInventory();
  saveGame();
}

function addItem(newItem) {
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (item && item.name === newItem.name) {
      item.count += newItem.count;
      return;
    }
  }
  for (let i = 0; i < inventory.length; i++) {
    if (!inventory[i]) {
      inventory[i] = newItem;
      return;
    }
  }
}

function updateAISlot() {
  aiSlot.textContent = aiActive ? '🤖 ИИ активен' : '💤 ИИ неактивен';
}

function switchTime() {
  isDay = !isDay;
  timeDisplay.textContent = isDay ? '🌞 День' : '🌙 Ночь';

  if (!isDay) {
    const coalItem = inventory[coalSlotIndex];
    if (coalActive && coalItem && coalItem.name === 'Уголь' && coalItem.count > 0) {
      coalItem.count--;
      if (coalItem.count === 0) inventory[coalSlotIndex] = null;
      aiActive = true;
      log('Сожжён 1 уголь для питания ИИ.');
    } else {
      aiActive = false;
    }
  } else {
    aiActive = true;
  }
  updateAISlot();
  updateInventory();
  saveGame();
}

function toggleTradeMode() {
  sellMode = !sellMode;
  toggleTradeBtn.textContent = sellMode ? 'Выход из торговли' : 'Торговля';
  updateInventory();
}

function saveGame() {
  localStorage.setItem('inventory', JSON.stringify(inventory));
  localStorage.setItem('currency', currency);
  localStorage.setItem('isDay', isDay);
  localStorage.setItem('coalActive', coalActive);
  localStorage.setItem('startTime', startTime);
}

function loadGame() {
  const savedInv = JSON.parse(localStorage.getItem('inventory'));
  if (savedInv) {
    for (let i = 0; i < inventorySize; i++) {
      inventory[i] = savedInv[i];
    }
  }
  const savedCurr = localStorage.getItem('currency');
  if (savedCurr !== null) currency = +savedCurr;

  const savedDay = localStorage.getItem('isDay');
  if (savedDay !== null) isDay = savedDay === 'true';

  const savedCoal = localStorage.getItem('coalActive');
  if (savedCoal !== null) coalActive = savedCoal === 'true';

  const savedStart = localStorage.getItem('startTime');
  if (savedStart) startTime = parseInt(savedStart);
}

// Время
let startTime = Date.now();
function initTime() {
  if (!localStorage.getItem('startTime')) {
    startTime = Date.now();
    localStorage.setItem('startTime', startTime);
  } else {
    startTime = parseInt(localStorage.getItem('startTime'));
  }
  const tick = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const phase = Math.floor(elapsed / 15) % 2 === 0;
    if (phase !== isDay) switchTime();
    setTimeout(tick, 1000);
  };
  tick();
}

mineBtn.addEventListener('click', mineResources);
toggleTradeBtn.addEventListener('click', toggleTradeMode);

loadGame();
updateCurrencyDisplay();
updateAISlot();
updateInventory();
initTime();
setInterval(passiveMine, 7000);
