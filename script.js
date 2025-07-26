const STORAGE_KEY = 'coreboxSave';
let adsManager;
let lastSavedState = '';
let lastRenderState = '';
let lastSaveTime = 0;

const inventory = { 
  'ИИ': 1, 
  'Уголь': 0, 
  'Мусор': 0, 
  'Кристалл': 0 
};

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
const CRYSTAL_COOLDOWN = 3 * 60 * 60;
const CRYSTAL_GOAL = 10;
const CRYSTAL_REWARD = 10;
const questResources = ['Кристалл'];

const SOLAR_ENERGY_CHANCES = {
  COAL: 0.03,
  TRASH: 0.01,
  CRYSTAL: 0.015
};

const COAL_ENERGY_CHANCES = {
  COAL: 0.06,
  TRASH: 0.02,
  CRYSTAL: 0.02
};

function log(message) {
  const box = document.getElementById('logBox');
  const entries = box.innerHTML.split('<br>');
  if (entries.length > 100) entries.shift();
  box.innerHTML = entries.join('<br>') + `🟢 ${message}<br>`;
  box.scrollTop = box.scrollHeight;
}

function updateTimeDisplay() {
  const dayIcon = isDay ? '🌞' : '🌙';
  const timeLeft = Math.ceil(gameTime);
  document.getElementById('timeDisplay').innerText = 
    `${dayIcon} ${isDay ? 'День' : 'Ночь'} — ${timeLeft} сек`;
  
  if (crystalCooldown > 0) {
    const hours = Math.floor(crystalCooldown / 3600);
    const minutes = Math.floor((crystalCooldown % 3600) / 60);
    document.getElementById('crystalInfo').textContent = 
      `⏳ Кристаллы: ${hours}ч ${minutes}м`;
  } else {
    document.getElementById('crystalInfo').textContent = 
      `✨ Кристаллы: ${inventory['Кристалл']}/${CRYSTAL_GOAL}`;
  }
}

function updateCurrencyDisplay() {
  document.getElementById('currencyDisplay').innerText = `TNG: ${tng}₸`;
}

function generateNewQuest() {
  currentQuest = {
    resource: 'Кристалл',
    amount: CRYSTAL_GOAL,
    reward: CRYSTAL_REWARD
  };
  questCompleted = false;
  log(`📜 Новый квест: ${currentQuest.amount} ${currentQuest.resource}! Награда: ${currentQuest.reward}₸`);
  document.getElementById('questInfo').textContent = 
    `📌 Квест: ${currentQuest.amount} ${currentQuest.resource} (${currentQuest.reward}₸)`;
  saveGame();
}

function checkCrystalQuest() {
  if (!currentQuest || questCompleted || crystalCooldown > 0) return;
  
  if (inventory['Кристалл'] >= currentQuest.amount) {
    questCompleted = true;
    tng += currentQuest.reward;
    inventory['Кристалл'] = 0;
    crystalCooldown = CRYSTAL_COOLDOWN;
    log(`🎉 Квест выполнен! +${currentQuest.reward}₸`);
    updateCurrencyDisplay();
    document.getElementById('questInfo').textContent = '✅ Квест выполнен!';
    saveGame();
  }
}

function addToInventory(resource, amount = 1) {
  if (!inventory.hasOwnProperty(resource)) return false;
  inventory[resource] = Math.max(0, (inventory[resource] || 0) + amount);
  if (resource === 'Кристалл') checkCrystalQuest();
  saveGame();
  return true;
}

function saveGame() {
  const saveData = {
    inventory: inventory,
    tng: tng,
    coalEnabled: coalEnabled,
    gameTime: gameTime,
    isDay: isDay,
    passiveCounter: passiveCounter,
    sellMode: sellMode,
    currentQuest: currentQuest,
    questCompleted: questCompleted,
    crystalCooldown: crystalCooldown
  };
  const currentState = JSON.stringify(saveData);
  localStorage.setItem(STORAGE_KEY, currentState);
  lastSavedState = currentState;
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    generateNewQuest();
    return;
  }
  try {
    const data = JSON.parse(saved);
    Object.keys(inventory).forEach(key => {
      if (data.inventory?.[key] !== undefined) {
        inventory[key] = data.inventory[key];
      }
    });
    
    tng = data.tng || 0;
    coalEnabled = Boolean(data.coalEnabled);
    gameTime = data.gameTime || 15;
    isDay = Boolean(data.isDay);
    passiveCounter = data.passiveCounter || 0;
    sellMode = Boolean(data.sellMode);
    currentQuest = data.currentQuest || null;
    questCompleted = Boolean(data.questCompleted);
    crystalCooldown = data.crystalCooldown || 0;
    
    if (data.lastUpdate) {
      const secondsPassed = Math.floor((Date.now() - data.lastUpdate) / 1000);
      const fullCycles = Math.floor(secondsPassed / 15);
      for (let i = 0; i < fullCycles; i++) isDay = !isDay;
      gameTime = (data.gameTime || 15) - (secondsPassed % 15);
      if (gameTime <= 0) {
        gameTime += 15;
        isDay = !isDay;
      }
      if (crystalCooldown > 0) {
        crystalCooldown = Math.max(0, crystalCooldown - secondsPassed);
      }
    }
    
    if (!currentQuest) generateNewQuest();
    updateTimeDisplay();
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    resetGame();
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

// ГАРАНТИРОВАННО РАБОТАЮЩИЕ ФУНКЦИИ:

function handleCoalClick() {
  if (sellMode) return;
  
  if (coalEnabled) {
    coalEnabled = false;
    log('Режим угля выключен');
  } else if (inventory['Уголь'] > 0) {
    coalEnabled = true;
    inventory['Уголь']--;
    log('Уголь включён (-1)');
  } else {
    log('Недостаточно угля!');
    return;
  }
  saveGame();
  render();
}

function handleTrashClick() {
  if (!sellMode || inventory['Мусор'] <= 0) return;
  
  const count = inventory['Мусор'];
  inventory['Мусор'] = 0;
  tng += count;
  log(`Продано ${count} мусора +${count}₸`);
  updateCurrencyDisplay();
  saveGame();
  render();
}

function render() {
  const invDiv = document.getElementById('inventory');
  invDiv.innerHTML = '';

  // Отрисовка инвентаря
  Object.entries(inventory).forEach(([name, count]) => {
    if (name === 'ИИ') return;

    const slot = document.createElement('div');
    slot.className = `slot ${name === 'Кристалл' ? 'crystal-slot' : ''}`;
    slot.innerHTML = `${name} x${count}`;

    if (name === 'Мусор' && sellMode && count > 0) {
      slot.classList.add('sell-mode');
      slot.onclick = handleTrashClick;
    } else if (name === 'Уголь') {
      slot.style.borderColor = coalEnabled ? 'lime' : '#888';
      slot.onclick = handleCoalClick;
    }

    invDiv.appendChild(slot);
  });

  // Заполнение пустых слотов
  while (invDiv.children.length < maxSlots) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = '[пусто]';
    invDiv.appendChild(slot);
  }

  // Статус ИИ
  const aiActive = (coalEnabled && inventory['Уголь'] > 0) || (!coalEnabled && isDay);
  document.getElementById('aiSlot').innerText = aiActive ? '🤖 ИИ активен' : '🛑 ИИ неактивен';

  updateTimeDisplay();
  updateCurrencyDisplay();
}

// Основные обработчики событий
document.getElementById('mineBtn').addEventListener('click', () => {
  const aiActive = (coalEnabled && inventory['Уголь'] > 0) || (!coalEnabled && isDay);
  if (!aiActive) {
    log('❌ ИИ неактивен! Нужна энергия');
    return;
  }
  
  const chances = coalEnabled ? COAL_ENERGY_CHANCES : SOLAR_ENERGY_CHANCES;
  const crystalChance = (crystalCooldown <= 0 && !questCompleted) ? chances.CRYSTAL : 0;

  if (Math.random() < chances.COAL) {
    addToInventory('Уголь', 1);
    log(`Найден уголь 🪨`);
  }
  
  if (Math.random() < chances.TRASH) {
    addToInventory('Мусор', 1);
    log(`Найден мусор ♻️`);
  }
  
  if (Math.random() < crystalChance) {
    addToInventory('Кристалл', 1);
    log(`✨ Найден кристалл!`);
  }
  
  render();
});

document.getElementById('toggleTrade').addEventListener('click', () => {
  sellMode = !sellMode;
  log(sellMode ? 'Режим торговли включён' : 'Режим торговли выключен');
  saveGame();
  render();
});

// Игровой цикл
let lastFrameTime = Date.now();

function gameLoop() {
  const currentTime = Date.now();
  const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 1.0);
  lastFrameTime = currentTime;

  gameTime -= deltaTime;
  if (gameTime <= 0) {
    gameTime = 15;
    isDay = !isDay;
    
    if (!isDay && coalEnabled && inventory['Уголь'] > 0) {
      inventory['Уголь']--;
      log('🌙 Ночь — сгорел 1 уголь');
    } else if (!isDay && coalEnabled) {
      coalEnabled = false;
      log('🌙 Ночь — уголь закончился, режим отключён');
    } else {
      log(isDay ? '🌞 День' : '🌙 Ночь');
    }
    saveGame();
  }

  if (crystalCooldown > 0) {
    crystalCooldown = Math.max(0, crystalCooldown - deltaTime);
    if (crystalCooldown <= 0 && questCompleted) {
      questCompleted = false;
      generateNewQuest();
      log('🔄 Кристаллы доступны');
      saveGame();
    }
  }

  render();
  requestAnimationFrame(gameLoop);
}

// Инициализация игры
loadGame();
gameLoop();