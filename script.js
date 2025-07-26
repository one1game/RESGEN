const STORAGE_KEY = 'coreboxSave';

const inventory = { 'ИИ': 1, 'Уголь': 0, 'Мусор': 0 };
let tng = 0; // валюта
const maxSlots = 9;
let coalEnabled = false;
let gameTime = 15;
let isDay = true;
let passiveCounter = 0;
let sellMode = false;

const leftPanelItems = ['ТЭЦ', '', '', '', ''];
const rightPanelItems = ['', '', '', '', ''];

function log(message) {
  const box = document.getElementById('logBox');
  box.innerHTML += `🟢 ${message}<br>`;
  box.scrollTop = box.scrollHeight;
}

function updateTimeDisplay() {
  const icon = isDay ? '🌞' : '🌙';
  document.getElementById('timeDisplay').innerText = `${icon} ${isDay ? 'День' : 'Ночь'} — ${gameTime}s осталось`;
}

function updateCurrencyDisplay() {
  document.getElementById('currencyDisplay').innerText = `TNG: ${tng}₸`;
}

function saveGame() {
  const saveData = {
    inventory,
    tng,
    coalEnabled,
    gameTime,
    isDay,
    passiveCounter,
    sellMode,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.inventory) {
        Object.keys(inventory).forEach(key => {
          if (data.inventory[key] !== undefined) inventory[key] = data.inventory[key];
        });
      }
      tng = data.tng ?? 0;
      coalEnabled = data.coalEnabled ?? false;
      gameTime = data.gameTime ?? 15;
      isDay = data.isDay ?? true;
      passiveCounter = data.passiveCounter ?? 0;
      sellMode = data.sellMode ?? false;
    } catch (e) {
      console.error('Ошибка загрузки сохранения', e);
    }
  }
}

function render() {
  const invDiv = document.getElementById('inventory');
  const leftDiv = document.getElementById('leftSlots');
  const rightDiv = document.getElementById('rightSlots');
  const aiSlot = document.getElementById('aiSlot');

  invDiv.innerHTML = '';
  leftDiv.innerHTML = '';
  rightDiv.innerHTML = '';

  let renderedSlots = 0;
  Object.keys(inventory).forEach(name => {
    if (name === 'ИИ') return;
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.resource = name;
    slot.innerHTML = `${name} x${inventory[name]}`;

    // Если в режиме продажи, подсвечиваем мусор красным и добавляем "Продать"
    if (sellMode && name === 'Мусор' && inventory[name] > 0) {
      slot.classList.add('sell-mode');
      const sellLabel = document.createElement('div');
      sellLabel.className = 'sell-label';
      sellLabel.innerText = 'Продать';
      slot.appendChild(sellLabel);
      slot.addEventListener('click', () => {
        const count = inventory['Мусор'];
        if (count > 0) {
          inventory['Мусор'] = 0;
          tng += count; // добавляем валюту
          log(`Продано ${count} мусора за ${count}₸`);
          sellMode = false; // выключаем режим продажи после продажи
          updateCurrencyDisplay();
          saveGame();
          render();
        }
      });
    }

    // Обработка угля - включение/выключение, только если не в режиме продажи
    if (name === 'Уголь') {
      slot.style.borderColor = coalEnabled ? 'lime' : '#888';
      slot.addEventListener('click', () => {
        if (sellMode) return; // не включаем уголь в режиме продажи
        if (coalEnabled) {
          coalEnabled = false;
          log('Уголь 🔥 выключен');
          saveGame();
          render();
        } else if (inventory['Уголь'] > 0) {
          coalEnabled = true;
          inventory['Уголь']--;
          log('Уголь 🔥 включён (−1)');
          saveGame();
          render();
        }
      });
    }

    invDiv.appendChild(slot);
    renderedSlots++;
  });

  for (let i = renderedSlots; i < maxSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = '[пусто]';
    invDiv.appendChild(slot);
  }

  leftPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    leftDiv.appendChild(slot);
  });

  rightPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    rightDiv.appendChild(slot);
  });

  const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
  aiSlot.innerText = aiActive ? '🤖 ИИ активен' : '🛑 ИИ неактивен';

  updateTimeDisplay();
  updateCurrencyDisplay();
}

// Инициализация игры
function init() {
  document.getElementById('mineBtn').addEventListener('click', () => {
    const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
    if (!aiActive || (!isDay && !coalEnabled)) return;
    const coalChance = coalEnabled ? 0.07 : 0.04;
    const trashChance = coalEnabled ? 0.02 : 0.01;

    if (Math.random() < coalChance) {
      inventory['Уголь']++;
      log('Найден уголь 🪨');
      saveGame();
    }
    if (Math.random() < trashChance) {
      inventory['Мусор']++;
      log('Найден мусор ♻️');
      saveGame();
    }
    render();
  });

  document.getElementById('toggleTrade').addEventListener('click', () => {
    sellMode = !sellMode;
    if (sellMode) {
      log('Режим торговли включён. Нажмите на мусор для продажи.');
    } else {
      log('Режим торговли выключен.');
    }
    saveGame();
    render();
  });

  setInterval(() => {
    gameTime--;
    if (gameTime <= 0) {
      gameTime = 15;
      isDay = !isDay;
      if (!isDay && coalEnabled) {
        if (inventory['Уголь'] > 0) {
          inventory['Уголь']--;
          log('Наступила ночь 🌙 — сгорел 1 уголь');
        } else {
          coalEnabled = false;
          log('Наступила ночь 🌙 — уголь закончился, ИИ отключён');
        }
      } else {
        log(isDay ? 'Наступил день 🌞' : 'Наступила ночь 🌙');
      }
      saveGame();
    }

    passiveCounter++;
    if (passiveCounter >= 7) {
      passiveCounter = 0;
      const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
      if (!isDay && !coalEnabled) return;
      if (aiActive) {
        const coalChance = coalEnabled ? 0.01 : 0.005;
        const trashChance = coalEnabled ? 0.01 : 0.005;
        if (Math.random() < coalChance) {
          inventory['Уголь']++;
          log('Пассивно найден уголь 🪨');
          saveGame();
        }
        if (Math.random() < trashChance) {
          inventory['Мусор']++;
          log('Пассивно найден мусор ♻️');
          saveGame();
        }
      }
    }

    render();
  }, 1000);

  loadGame();
  render();
}

// Запуск игры при загрузке страницы
window.addEventListener('DOMContentLoaded', init);
