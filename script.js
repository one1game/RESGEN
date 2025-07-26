const STORAGE_KEY = 'coreboxSave';

const inventory = { 'ИИ': 1, 'Уголь': 0, 'Мусор': 0 };
let tng = 0;
const maxSlots = 9;
let coalEnabled = false;
let gameTime = 15;
let isDay = true;
let passiveCounter = 0;
let sellMode = false;
let lastUpdate = Date.now(); // Добавляем переменную для отслеживания времени

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
    lastUpdate: Date.now() // Сохраняем время последнего обновления
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
      isDay = data.isDay ?? true;
      passiveCounter = data.passiveCounter ?? 0;
      sellMode = data.sellMode ?? false;
      
      // Восстанавливаем время с учетом прошедшего времени
      if (data.lastUpdate) {
        const secondsPassed = Math.floor((Date.now() - data.lastUpdate) / 1000);
        gameTime = data.gameTime ?? 15;
        
        // Обновляем игровое время
        while (secondsPassed > 0) {
          gameTime--;
          secondsPassed--;
          if (gameTime <= 0) {
            gameTime = 15;
            isDay = !isDay;
          }
        }
      } else {
        gameTime = data.gameTime ?? 15;
      }
      
    } catch (e) {
      console.error('Ошибка загрузки сохранения', e);
    }
  }
}

// ... (остальные функции render(), обработчики событий и setInterval остаются без изменений)

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
      }
      if (Math.random() < trashChance) {
        inventory['Мусор']++;
        log('Пассивно найден мусор ♻️');
      }
    }
  }

  saveGame(); // Сохраняем игру при каждом обновлении таймера
  render();
}, 1000);

loadGame();
render();