// CoreBox — основной игровой скрипт

const STORAGE_KEY = 'coreboxSave';
let lastSavedState = '';
let lastRenderState = '';
let lastSaveTime = 0;

// Инвентарь игрока
const inventory = {
  'ИИ': 1,
  'Уголь': 5,
  'Мусор': 0,
  'Кристалл': 0
};

// Параметры
let tng = 0;
const maxSlots = 9;
let coalEnabled = false; // Включён ли уголь
let gameTime = 15;
let isDay = true;
let aiActive = true;
let passiveTick = 0;

// UI элементы
const inventoryEl = document.getElementById('inventory');
const aiSlot = document.getElementById('aiSlot');
const timeDisplay = document.getElementById('timeDisplay');
const currencyDisplay = document.getElementById('currencyDisplay');
const logBox = document.getElementById('logBox');

// Отображение инвентаря
function renderInventory() {
  inventoryEl.innerHTML = '';
  Object.entries(inventory).forEach(([item, count]) => {
    const cell = document.createElement('div');
    cell.className = 'item-cell';
    cell.textContent = `${item}: ${count}`;

    // Клик на ячейку "Уголь" — включает/выключает
    if (item === 'Уголь') {
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => {
        if (coalEnabled) {
          coalEnabled = false;
          log('Уголь выключен.');
        } else if (inventory['Уголь'] > 0) {
          coalEnabled = true;
          inventory['Уголь']--;
          log('Уголь включен. -1 уголь');
        } else {
          log('Нет угля для включения.');
        }
        renderInventory();
      });
    }

    inventoryEl.appendChild(cell);
  });
}

// Отображение ИИ состояния
function renderAIState() {
  aiSlot.textContent = aiActive ? '🤖 ИИ активен' : '❌ ИИ неактивен';
}

// Лог действий
function log(msg) {
  const line = document.createElement('div');
  line.textContent = `> ${msg}`;
  logBox.appendChild(line);
  logBox.scrollTop = logBox.scrollHeight;
}

// Пассивная добыча ресурсов
function passiveMine() {
  if (!aiActive) return;
  const chance = Math.random();
  if (chance < 0.01) {
    inventory['Мусор']++;
    log('Пассивно найден мусор.');
    renderInventory();
  }
}

// Смена дня и ночи
function toggleDayNight() {
  isDay = !isDay;
  timeDisplay.textContent = isDay ? '⏰ День' : '🌙 Ночь';
  if (!isDay && coalEnabled) {
    if (inventory['Уголь'] > 0) {
      inventory['Уголь']--;
      log('Ночь: уголь сгорел. -1');
    } else {
      coalEnabled = false;
      log('Уголь закончился, выключен.');
    }
  }
  updateAIState();
  renderInventory();
  renderAIState();
}

// Обновление активности ИИ
function updateAIState() {
  if (isDay) {
    aiActive = true;
  } else {
    aiActive = coalEnabled && inventory['Уголь'] >= 0;
  }
}

// Активная добыча ресурсов
function mineResources() {
  if (!aiActive) {
    log('ИИ не активен, добыча невозможна.');
    return;
  }

  const roll = Math.random();
  let success = false;

  if (coalEnabled && roll < 0.07) {
    inventory['Кристалл']++;
    log('Найден Кристалл (уголь активен, шанс 7%).');
    success = true;
  } else if (isDay && !coalEnabled && roll < 0.04) {
    inventory['Мусор']++;
    log('Найден Мусор (день, шанс 4%).');
    success = true;
  }

  if (!success) {
    log('Ничего не найдено.');
  }

  renderInventory();
}

// Сохранение и загрузка (опционально, можно расширить)
function saveGame() {
  const state = JSON.stringify({ inventory, tng });
  localStorage.setItem(STORAGE_KEY, state);
  lastSaveTime = Date.now();
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    Object.assign(inventory, data.inventory);
    tng = data.tng;
  }
}

// Основной цикл
setInterval(() => {
  gameTime--;
  if (gameTime <= 0) {
    gameTime = 15;
    toggleDayNight();
  }
  passiveTick++;
  if (passiveTick >= 7) {
    passiveTick = 0;
    passiveMine();
  }
  currencyDisplay.textContent = `TNG: ${tng}₸`;
}, 1000);

// Кнопки

document.getElementById('mineBtn').addEventListener('click', mineResources);

// Старт
loadGame();
renderInventory();
renderAIState();
