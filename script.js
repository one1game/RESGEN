// После объявления других переменных
let adsManager;

// В функции loadGame() после загрузки данных:
adsManager = new AdsManager(this);
if (data.advertisements) {
  adsManager.loadAds(data.advertisements);
}

// В функции saveGame() в объект saveData добавьте:
advertisements: adsManager.getSaveData(),

// В конце скрипта (после loadGame()):
adsManager = new AdsManager({
  tng,
  log: log,
  updateCurrencyDisplay: updateCurrencyDisplay,
  saveGame: saveGame
});

const STORAGE_KEY = 'coreboxSave';

const inventory = { 'ИИ': 1, 'Уголь': 0, 'Мусор': 0, 'Кристалл': 0 };
let tng = 0;
const maxSlots = 9;
let coalEnabled = false;
let gameTime = 15;
let isDay = true;
let passiveCounter = 0;
let sellMode = false;
let currentQuest = null;
let questCompleted = false;
let crystalFoundToday = false;
const questResources = ['Кристалл'];

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

function generateNewQuest() {
  const randomResource = questResources[Math.floor(Math.random() * questResources.length)];
  currentQuest = {
    resource: randomResource,
    amount: 1,
    reward: 2000 // Увеличено до 2000₸
  };
  questCompleted = false;
  crystalFoundToday = false;
  log(`📜 Новый квест: добыть ${currentQuest.resource}! Награда: ${currentQuest.reward}₸`);
  document.getElementById('questInfo').textContent = `📌 Квест: ${currentQuest.resource} (${currentQuest.reward}₸)`;
  saveGame();
}

function checkQuest(resource) {
  if (!currentQuest || questCompleted) return;
  
  if (resource === currentQuest.resource) {
    questCompleted = true;
    tng += currentQuest.reward;
    log(`🎉 Квест выполнен! Получено ${currentQuest.reward}₸`);
    updateCurrencyDisplay();
    setTimeout(generateNewQuest, 2000);
    saveGame();
  }
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
    currentQuest,
    questCompleted,
    crystalFoundToday,
    lastUpdate: Date.now()
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
      currentQuest = data.currentQuest || null;
      questCompleted = data.questCompleted || false;
      crystalFoundToday = data.crystalFoundToday ?? false;
      
      if (data.lastUpdate) {
        const secondsPassed = Math.floor((Date.now() - data.lastUpdate) / 1000);
        gameTime = data.gameTime ?? 15;
        
        while (secondsPassed > 0) {
          gameTime--;
          secondsPassed--;
          if (gameTime <= 0) {
            gameTime = 15;
            isDay = !isDay;
            crystalFoundToday = false;
          }
        }
      }
      
      if (currentQuest) {
        document.getElementById('questInfo').textContent = 
          questCompleted 
            ? '🔄 Квест обновляется...' 
            : `📌 Квест: ${currentQuest.resource} (${currentQuest.reward}₸)`;
      }
    } catch (e) {
      console.error('Ошибка загрузки сохранения', e);
    }
  }
  if (!currentQuest) {
    generateNewQuest();
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
    
    if (name === 'Кристалл' && inventory[name] === 0) return;
    
    const slot = document.createElement('div');
    slot.className = 'slot' + (name === 'Кристалл' ? ' crystal-slot' : '');
    slot.dataset.resource = name;
    slot.innerHTML = `${name} x${inventory[name]}`;

    if (name === 'Кристалл' && inventory[name] > 0) {
      inventory['Кристалл'] = 0;
      saveGame();
    }

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
          tng += count;
          log(`Продано ${count} мусора за ${count}₸`);
          sellMode = false;
          updateCurrencyDisplay();
          saveGame();
          render();
        }
      });
    }

    if (name === 'Уголь') {
      slot.style.borderColor = coalEnabled ? 'lime' : '#888';
      slot.addEventListener('click', () => {
        if (sellMode) return;
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

document.getElementById('mineBtn').addEventListener('click', () => {
  const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
  if (!aiActive || (!isDay && !coalEnabled)) return;
  
  const coalChance = (coalEnabled ? 0.07 : 0.04) / 2;
  const trashChance = (coalEnabled ? 0.02 : 0.01) / 2;
  const crystalChance = (!crystalFoundToday && currentQuest && !questCompleted) ? 0.0167 : 0; // 1.67% шанс

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
  if (Math.random() < crystalChance) {
    inventory['Кристалл'] = 1;
    crystalFoundToday = true;
    log('✨ Найден редкий кристалл! (исчезнет при обновлении инвентаря)');
    checkQuest('Кристалл');
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
    crystalFoundToday = false;
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
      // Пассивная добыча кристалла удалена
    }
  }

  render();
}, 1000);

loadGame();
render();