const STORAGE_KEY = 'coreboxSave';
let adsManager;
let lastSavedState = '';
let lastRenderState = '';

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
  const entries = box.innerHTML.split('<br>');
  
  if (entries.length > 100) {
    entries.shift();
  }
  
  box.innerHTML = entries.join('<br>') + `🟢 ${message}<br>`;
  box.scrollTop = box.scrollHeight;
}

function updateTimeDisplay() {
  const icon = isDay ? '🌞' : '🌙';
  document.getElementById('timeDisplay').innerText = `${icon} ${isDay ? 'День' : 'Ночь'} — ${Math.ceil(gameTime)}s осталось`;
}

function updateCurrencyDisplay() {
  document.getElementById('currencyDisplay').innerText = `TNG: ${tng}₸`;
}

function generateNewQuest() {
  try {
    const randomResource = questResources[Math.floor(Math.random() * questResources.length)];
    currentQuest = {
      resource: randomResource,
      amount: 1,
      reward: 2000
    };
    questCompleted = false;
    crystalFoundToday = false;
    log(`📜 Новый квест: добыть ${currentQuest.resource}! Награда: ${currentQuest.reward}₸`);
    document.getElementById('questInfo').textContent = `📌 Квест: ${currentQuest.resource} (${currentQuest.reward}₸)`;
    saveGame();
  } catch (error) {
    console.error('Ошибка при генерации квеста:', error);
    currentQuest = {
      resource: 'Кристалл',
      amount: 1,
      reward: 2000
    };
  }
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

function addToInventory(resource, amount = 1) {
  if (!inventory.hasOwnProperty(resource)) {
    console.error('Попытка добавить неизвестный ресурс:', resource);
    return false;
  }
  
  inventory[resource] = Math.max(0, (inventory[resource] || 0) + amount);
  saveGame();
  return true;
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
    advertisements: (adsManager && typeof adsManager.getAdsData === 'function') ? adsManager.getAdsData() : [],
    lastUpdate: Date.now()
  };
  
  const currentState = JSON.stringify(saveData);
  if (currentState !== lastSavedState) {
    localStorage.setItem(STORAGE_KEY, currentState);
    lastSavedState = currentState;
  }
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      
      // Валидация и загрузка данных
      if (data.inventory) {
        Object.keys(inventory).forEach(key => {
          if (data.inventory[key] !== undefined) {
            inventory[key] = data.inventory[key];
          }
        });
      }
      
      tng = typeof data.tng === 'number' ? data.tng : 0;
      coalEnabled = !!data.coalEnabled;
      gameTime = typeof data.gameTime === 'number' ? data.gameTime : 15;
      isDay = !!data.isDay;
      passiveCounter = typeof data.passiveCounter === 'number' ? data.passiveCounter : 0;
      sellMode = !!data.sellMode;
      currentQuest = data.currentQuest || null;
      questCompleted = !!data.questCompleted;
      crystalFoundToday = !!data.crystalFoundToday;
      
      // Корректный расчет прошедшего времени
      if (data.lastUpdate) {
        const secondsPassed = Math.floor((Date.now() - data.lastUpdate) / 1000);
        const fullCycles = Math.floor(secondsPassed / 30);
        
        for (let i = 0; i < fullCycles; i++) {
          isDay = !isDay;
          crystalFoundToday = false;
        }
        
        gameTime = data.gameTime - (secondsPassed % 30);
        if (gameTime <= 0) {
          gameTime += 15;
          isDay = !isDay;
          crystalFoundToday = false;
        }
      }
      
      // Инициализация рекламной системы
      adsManager = new AdsManager({
        tng: tng,
        log: log,
        updateCurrencyDisplay: updateCurrencyDisplay,
        saveGame: saveGame
      });
      
      if (Array.isArray(data.advertisements)) {
        adsManager.loadAds(data.advertisements);
      }
      
      // Обновление информации о квесте
      if (currentQuest) {
        document.getElementById('questInfo').textContent = 
          questCompleted 
            ? '🔄 Квест обновляется...' 
            : `📌 Квест: ${currentQuest.resource} (${currentQuest.reward}₸)`;
      }
    } catch (error) {
      console.error('Ошибка загрузки сохранения:', error);
      resetGame();
    }
  }
  
  if (!currentQuest) {
    generateNewQuest();
  }
}

function resetGame() {
  Object.keys(inventory).forEach(key => inventory[key] = 0);
  inventory['ИИ'] = 1;
  tng = 0;
  coalEnabled = false;
  gameTime = 15;
  isDay = true;
  passiveCounter = 0;
  sellMode = false;
  currentQuest = null;
  questCompleted = false;
  crystalFoundToday = false;
  saveGame();
}

function handleCoalClick() {
  if (sellMode) return;
  
  if (coalEnabled) {
    coalEnabled = false;
    log('Уголь 🔥 выключен');
  } else if (inventory['Уголь'] > 0) {
    coalEnabled = true;
    addToInventory('Уголь', -1);
    log('Уголь 🔥 включён (−1)');
  }
  
  render();
}

function handleTrashClick() {
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
}

function render() {
  const currentState = JSON.stringify(inventory) + tng + isDay + Math.floor(gameTime) + sellMode + coalEnabled;
  if (currentState === lastRenderState) return;
  lastRenderState = currentState;

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
      checkQuest('Кристалл');
    }

    if (sellMode && name === 'Мусор' && inventory[name] > 0) {
      slot.classList.add('sell-mode');
      const sellLabel = document.createElement('div');
      sellLabel.className = 'sell-label';
      sellLabel.innerText = 'Продать';
      slot.appendChild(sellLabel);
      slot.addEventListener('click', handleTrashClick);
    }

    if (name === 'Уголь') {
      slot.style.borderColor = coalEnabled ? 'lime' : '#888';
      slot.addEventListener('click', handleCoalClick);
    }

    invDiv.appendChild(slot);
    renderedSlots++;
  });

  // Заполнение пустых слотов
  for (let i = renderedSlots; i < maxSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = '[пусто]';
    invDiv.appendChild(slot);
  }

  // Левая панель
  leftPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    leftDiv.appendChild(slot);
  });

  // Правая панель
  rightPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    rightDiv.appendChild(slot);
  });

  // Статус ИИ
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
  const crystalChance = (!crystalFoundToday && currentQuest && !questCompleted) ? 0.0167 : 0;

  if (Math.random() < coalChance) {
    addToInventory('Уголь', 1);
    log('Найден уголь 🪨');
  }
  
  if (Math.random() < trashChance) {
    addToInventory('Мусор', 1);
    log('Найден мусор ♻️');
  }
  
  if (Math.random() < crystalChance) {
    addToInventory('Кристалл', 1);
    crystalFoundToday = true;
    log('✨ Найден редкий кристалл!');
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

let lastFrameTime = Date.now();

function gameLoop() {
  const currentTime = Date.now();
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;

  gameTime -= deltaTime;
  
  if (gameTime <= 0) {
    gameTime = 15;
    isDay = !isDay;
    crystalFoundToday = false;
    
    if (!isDay && coalEnabled) {
      if (inventory['Уголь'] > 0) {
        addToInventory('Уголь', -1);
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

  // Пассивное добывание ресурсов
  if (passiveCounter >= 7) {
    passiveCounter = 0;
    const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
    
    if (aiActive) {
      const coalChance = coalEnabled ? 0.01 : 0.005;
      const trashChance = coalEnabled ? 0.01 : 0.005;
      
      if (Math.random() < coalChance) {
        addToInventory('Уголь', 1);
        log('Пассивно найден уголь 🪨');
      }
      
      if (Math.random() < trashChance) {
        addToInventory('Мусор', 1);
        log('Пассивно найден мусор ♻️');
      }
    }
  } else {
    passiveCounter += deltaTime;
  }

  render();
  requestAnimationFrame(gameLoop);
}

// Инициализация игры
if (!adsManager) {
  adsManager = new AdsManager({
    tng: tng,
    log: log,
    updateCurrencyDisplay: updateCurrencyDisplay,
    saveGame: saveGame
  });
}

loadGame();
gameLoop();