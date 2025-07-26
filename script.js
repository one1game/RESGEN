const STORAGE_KEY = 'coreboxSave';
let adsManager;
let lastSavedState = '';
let lastRenderState = '';
let lastSaveTime = 0;

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
let crystalCooldown = 0;
const CRYSTAL_COOLDOWN = 3 * 60 * 60; // 3 часа в секундах
const CRYSTAL_GOAL = 10;
const CRYSTAL_REWARD = 10;
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
  const timeLeft = Math.ceil(gameTime);
  document.getElementById('timeDisplay').innerText = `${icon} ${isDay ? 'День' : 'Ночь'} — ${timeLeft}s`;
  
  // Обновляем информацию о кристаллах
  if (crystalCooldown > 0) {
    const hours = Math.floor(crystalCooldown / 3600);
    const minutes = Math.floor((crystalCooldown % 3600) / 60);
    document.getElementById('crystalInfo').textContent = 
      `⏳ Кристаллы: ${hours}ч ${minutes}м до возобновления`;
  } else {
    document.getElementById('crystalInfo').textContent = 
      `✨ Кристаллы: ${inventory['Кристалл']}/${CRYSTAL_GOAL}`;
  }
}

function updateCurrencyDisplay() {
  document.getElementById('currencyDisplay').innerText = `TNG: ${tng}₸`;
}

function generateNewQuest() {
  try {
    const randomResource = questResources[Math.floor(Math.random() * questResources.length)];
    currentQuest = {
      resource: randomResource,
      amount: CRYSTAL_GOAL,
      reward: CRYSTAL_REWARD
    };
    questCompleted = false;
    log(`📜 Новый квест: собрать ${currentQuest.amount} ${currentQuest.resource}! Награда: ${currentQuest.reward}₸`);
    document.getElementById('questInfo').textContent = 
      `📌 Квест: ${currentQuest.amount} ${currentQuest.resource} (${currentQuest.reward}₸)`;
    saveGame();
  } catch (error) {
    console.error('Ошибка при генерации квеста:', error);
    currentQuest = {
      resource: 'Кристалл',
      amount: CRYSTAL_GOAL,
      reward: CRYSTAL_REWARD
    };
  }
}

function checkCrystalQuest() {
  if (!currentQuest || questCompleted || crystalCooldown > 0 || currentQuest.resource !== 'Кристалл') return;
  
  if (inventory['Кристалл'] >= currentQuest.amount) {
    questCompleted = true;
    tng += currentQuest.reward;
    inventory['Кристалл'] = 0;
    crystalCooldown = CRYSTAL_COOLDOWN;
    
    log(`🎉 Квест выполнен! Получено ${currentQuest.reward}₸`);
    log(`⏳ Новые кристаллы будут доступны через 3 часа`);
    
    updateCurrencyDisplay();
    document.getElementById('questInfo').textContent = '✅ Квест выполнен!';
    saveGame();
  }
}

function addToInventory(resource, amount = 1) {
  if (!inventory.hasOwnProperty(resource)) {
    console.error('Попытка добавить неизвестный ресурс:', resource);
    return false;
  }
  
  inventory[resource] = Math.max(0, (inventory[resource] || 0) + amount);
  
  if (resource === 'Кристалл') {
    checkCrystalQuest();
  }
  
  saveGame();
  return true;
}

function saveGame() {
  if (Date.now() - lastSaveTime < 2000) return; // Не сохранять чаще чем раз в 2 секунды
  
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
    crystalCooldown,
    advertisements: (adsManager && typeof adsManager.getAdsData === 'function') ? adsManager.getAdsData() : [],
    lastUpdate: Date.now()
  };
  
  const currentState = JSON.stringify(saveData);
  if (currentState !== lastSavedState) {
    localStorage.setItem(STORAGE_KEY, currentState);
    lastSavedState = currentState;
    lastSaveTime = Date.now();
  }
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      
      // Проверка целостности данных
      if (data.inventory && typeof data.inventory !== 'object') {
        console.error('Неверный формат инвентаря');
        resetGame();
        return;
      }

      // Загрузка данных
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
      crystalCooldown = typeof data.crystalCooldown === 'number' ? data.crystalCooldown : 0;
      
      // Коррекция времени при загрузке
      if (data.lastUpdate) {
        const secondsPassed = Math.floor((Date.now() - data.lastUpdate) / 1000);
        
        // Коррекция времени суток
        const fullCycles = Math.floor(secondsPassed / 15);
        for (let i = 0; i < fullCycles; i++) {
          isDay = !isDay;
        }
        
        gameTime = data.gameTime - (secondsPassed % 15);
        if (gameTime <= 0) {
          gameTime += 15;
          isDay = !isDay;
        }
        
        // Коррекция кулдауна кристаллов
        if (crystalCooldown > 0) {
          crystalCooldown = Math.max(0, crystalCooldown - secondsPassed);
        }
      }
      
      // Очистка кристаллов если квест выполнен
      if (questCompleted && inventory['Кристалл'] > 0) {
        inventory['Кристалл'] = 0;
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
      
      // Обновление интерфейса
      if (currentQuest) {
        document.getElementById('questInfo').textContent = 
          questCompleted 
            ? '✅ Квест выполнен!' 
            : `📌 Квест: ${currentQuest.amount} ${currentQuest.resource} (${currentQuest.reward}₸)`;
      }
      
      updateTimeDisplay();
      
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
  crystalCooldown = 0;
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
  if (!sellMode) return;
  
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
  const currentState = `${inventory['Кристалл']}|${tng}|${isDay}|${Math.floor(gameTime)}|${sellMode}|${coalEnabled}|${crystalCooldown}|${questCompleted}`;
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

    const slot = document.createElement('div');
    slot.className = 'slot' + (name === 'Кристалл' ? ' crystal-slot' : '');
    slot.dataset.resource = name;
    slot.innerHTML = `${name} x${inventory[name]}`;

    if (name === 'Мусор' && sellMode && inventory[name] > 0) {
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
  const crystalChance = (crystalCooldown <= 0 && !questCompleted) ? 0.0167 : 0;

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
    log('✨ Найден кристалл!');
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
  const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 1.0);
  lastFrameTime = currentTime;

  // Обновление игрового времени
  gameTime -= deltaTime;
  if (gameTime <= 0) {
    gameTime = 15;
    isDay = !isDay;
    
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

  // Обновление кулдауна кристаллов
  if (crystalCooldown > 0) {
    crystalCooldown = Math.max(0, crystalCooldown - deltaTime);
    if (crystalCooldown <= 0 && questCompleted) {
      questCompleted = false;
      generateNewQuest();
      log('🔄 Теперь можно снова искать кристаллы!');
      saveGame();
    }
  }

  // Пассивное добывание ресурсов
  if (passiveCounter >= 7) {
    passiveCounter = 0;
    const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
    
    if (aiActive) {
      const coalChance = coalEnabled ? 0.01 : 0.005;
      const trashChance = coalEnabled ? 0.01 : 0.005;
      const crystalChance = (crystalCooldown <= 0 && !questCompleted) ? 0.001 : 0;
      
      if (Math.random() < coalChance) {
        addToInventory('Уголь', 1);
        log('Пассивно найден уголь 🪨');
      }
      
      if (Math.random() < trashChance) {
        addToInventory('Мусор', 1);
        log('Пассивно найден мусор ♻️');
      }

      if (Math.random() < crystalChance) {
        addToInventory('Кристалл', 1);
        log('✨ Пассивно найден кристалл!');
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

// Добавляем элементы интерфейса для кристаллов
document.body.insertAdjacentHTML('beforeend', `
  <div id="crystalInfo" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px; border-radius: 5px;"></div>
`);

loadGame();
gameLoop();