// Игровые константы
const STORAGE_KEY = 'coreboxSave2';

// Инициализация состояния игры
const inventory = { 
  'ИИ': 1, 
  'Уголь': 0, 
  'Мусор': 0,
  'Чипы': 0,
  'Электроника': 0
};

const upgrades = {
  mining: 0,
  autoSell: false
};

let gameState = {
  tng: 0,
  coalEnabled: false,
  gameTime: 15,
  isDay: true,
  passiveCounter: 0,
  sellMode: false,
  recycleMode: false,
  trashSold: 0,
  insuranceDays: 0,
  criticalMining: false
};

const leftPanelItems = ['ТЭЦ', '', '', '', ''];
const rightPanelItems = ['Переработчик', '', '', '', ''];

// Основные функции игры
function log(message) {
  const box = document.getElementById('logBox');
  box.innerHTML += `🟢 ${message}<br>`;
  box.scrollTop = box.scrollHeight;
}

function updateTimeDisplay() {
  const icon = gameState.isDay ? '🌞' : '🌙';
  document.getElementById('timeDisplay').innerText = `${icon} ${gameState.isDay ? 'День' : 'Ночь'} — ${gameState.gameTime}s`;
}

function updateCurrencyDisplay() {
  document.getElementById('currencyDisplay').innerText = `TNG: ${gameState.tng}₸`;
}

function saveGame() {
  const saveData = {
    inventory,
    tng: gameState.tng,
    coalEnabled: gameState.coalEnabled,
    gameTime: gameState.gameTime,
    isDay: gameState.isDay,
    passiveCounter: gameState.passiveCounter,
    sellMode: gameState.sellMode,
    recycleMode: gameState.recycleMode,
    trashSold: gameState.trashSold,
    insuranceDays: gameState.insuranceDays,
    upgrades
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      Object.keys(inventory).forEach(key => {
        if (data.inventory[key] !== undefined) inventory[key] = data.inventory[key];
      });
      gameState.tng = data.tng ?? 0;
      gameState.coalEnabled = data.coalEnabled ?? false;
      gameState.gameTime = data.gameTime ?? 15;
      gameState.isDay = data.isDay ?? true;
      gameState.passiveCounter = data.passiveCounter ?? 0;
      gameState.sellMode = data.sellMode ?? false;
      gameState.recycleMode = data.recycleMode ?? false;
      gameState.trashSold = data.trashSold ?? 0;
      gameState.insuranceDays = data.insuranceDays ?? 0;
      upgrades.mining = data.upgrades?.mining ?? 0;
      upgrades.autoSell = data.upgrades?.autoSell ?? false;
    } catch (e) {
      console.error('Ошибка загрузки сохранения', e);
    }
  }
}

function calculateTrashPrice() {
  const basePrice = 1;
  const priceDrop = Math.floor(gameState.trashSold / 5) * 0.05;
  return Math.max(basePrice - priceDrop, 0.3);
}

function render() {
  const invDiv = document.getElementById('inventory');
  const leftDiv = document.getElementById('leftSlots');
  const rightDiv = document.getElementById('rightSlots');
  const aiSlot = document.getElementById('aiSlot');
  const mineBtn = document.getElementById('mineBtn');

  document.getElementById('miningBonus').textContent = upgrades.mining;

  invDiv.innerHTML = '';
  leftDiv.innerHTML = '';
  rightDiv.innerHTML = '';

  // Отрисовка инвентаря
  Object.entries(inventory).forEach(([name, count]) => {
    if (name === 'ИИ') return;
    
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (gameState.criticalMining && (name === 'Уголь' || name === 'Электроника')) {
      slot.classList.add('critical');
      gameState.criticalMining = false;
    }
    
    slot.textContent = `${name} x${count}`;

    if (name === 'Уголь' || name === 'Мусор') {
      const bonusDiv = document.createElement('div');
      bonusDiv.className = 'mining-bonus';
      const baseChance = name === 'Уголь' ? 3 : 1.5;
      const totalBonus = upgrades.mining + (gameState.coalEnabled ? (name === 'Уголь' ? 2 : 1) : 0);
      bonusDiv.textContent = `+${baseChance + totalBonus}%`;
      slot.appendChild(bonusDiv);
    }

    if (gameState.sellMode && name === 'Мусор') {
      slot.classList.add('sell-mode');
      const sellLabel = document.createElement('div');
      sellLabel.className = 'sell-label';
      sellLabel.textContent = count > 0 ? `Продать (${calculateTrashPrice().toFixed(1)}₸)` : 'Нет мусора';
      slot.appendChild(sellLabel);
      
      slot.onclick = () => {
        if (inventory['Мусор'] > 0) {
          const price = calculateTrashPrice();
          gameState.tng += Math.floor(inventory['Мусор'] * price);
          gameState.trashSold += inventory['Мусор'];
          log(`Продано ${inventory['Мусор']} мусора +${Math.floor(inventory['Мусор'] * price)}₸`);
          inventory['Мусор'] = 0;
          updateCurrencyDisplay();
          saveGame();
          render();
        }
      };
    } 
    else if (gameState.recycleMode && name === 'Мусор') {
      slot.classList.add('recycle-mode');
      const recycleLabel = document.createElement('div');
      recycleLabel.className = 'recycle-label';
      recycleLabel.textContent = count >= 5 ? '5→1 уголь' : 'Нужно 5';
      slot.appendChild(recycleLabel);
      
      slot.onclick = () => {
        if (inventory['Мусор'] >= 5) {
          inventory['Мусор'] -= 5;
          inventory['Уголь']++;
          log('Переработано 5 мусора → 1 уголь');
          saveGame();
          render();
        }
      };
    }
    else if (name === 'Уголь') {
      if (gameState.coalEnabled) {
        slot.style.borderColor = 'gold';
        slot.style.boxShadow = '0 0 8px gold';
      }
      
      slot.onclick = () => {
        if (gameState.sellMode && gameState.isDay) {
          if (inventory['Уголь'] > 0) {
            inventory['Уголь']--;
            gameState.tng += 3;
            gameState.coalEnabled = false;
            log('Продано 1 уголь +3₸ (ТЭЦ отключена)');
            updateCurrencyDisplay();
            saveGame();
            render();
          }
        } 
        else if (!gameState.sellMode && !gameState.recycleMode) {
          if (!gameState.coalEnabled) {
            if (inventory['Уголь'] > 0) {
              gameState.coalEnabled = true;
              inventory['Уголь']--;
              log('Угольная ТЭЦ активирована (-1 уголь)');
            } else {
              log('Нет угля для активации!');
            }
          } else {
            gameState.coalEnabled = false;
            log('Угольная ТЭЦ отключена');
          }
          saveGame();
          render();
        }
      };
    }
    else if (name === 'Чипы' && count > 0) {
      slot.classList.add('upgrade');
      slot.onclick = () => {
        if (upgrades.mining < 10 && inventory['Чипы'] >= 5) {
          inventory['Чипы'] -= 5;
          upgrades.mining++;
          log(`Апгрейд добычи! Теперь +${upgrades.mining}% к шансам`);
          saveGame();
          render();
        } else if (!upgrades.autoSell && inventory['Чипы'] >= 20) {
          inventory['Чипы'] -= 20;
          upgrades.autoSell = true;
          log('Апгрейд: авто-продажа мусора!');
          saveGame();
          render();
        }
      };
    }

    invDiv.appendChild(slot);
  });

  // Заполнение пустых слотов
  while (invDiv.children.length < 9) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = '[пусто]';
    invDiv.appendChild(slot);
  }

  // Левая панель (ТЭЦ)
  leftPanelItems.forEach((name, index) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (index === 0) {
      slot.textContent = gameState.coalEnabled ? 'ТЭЦ 🔥' : 'ТЭЦ';
      if (gameState.coalEnabled) {
        slot.style.borderColor = 'gold';
        slot.style.boxShadow = '0 0 8px gold';
      }
    } else {
      slot.textContent = name || '[пусто]';
    }
    leftDiv.appendChild(slot);
  });

  // Правая панель (Переработчик и апгрейды)
  rightPanelItems.forEach((name, index) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (index === 0) {
      slot.textContent = 'Переработчик';
    } else if (index === 4) {
      slot.textContent = 'Апгрейды';
      const progress = document.createElement('div');
      progress.className = 'progress-bar';
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.style.width = `${upgrades.mining * 10}%`;
      progress.appendChild(fill);
      slot.appendChild(document.createTextNode(`Добыча +${upgrades.mining}%`));
      slot.appendChild(progress);
      if (upgrades.autoSell) {
        slot.appendChild(document.createTextNode('Авто-продажа ✅'));
      }
      
      // Визуализация апгрейдов
      const upgradeContainer = document.createElement('div');
      upgradeContainer.className = 'upgrade-container';
      
      for (let i = 0; i < 10; i++) {
        const icon = document.createElement('div');
        icon.className = 'upgrade-icon';
        icon.textContent = i < upgrades.mining ? '✓' : '';
        upgradeContainer.appendChild(icon);
      }
      
      slot.appendChild(upgradeContainer);
    } else {
      slot.textContent = name || '[пусто]';
    }
    rightDiv.appendChild(slot);
  });

  // Статус ИИ
  const aiActive = gameState.isDay || (gameState.coalEnabled && inventory['Уголь'] > 0);
  aiSlot.textContent = aiActive ? '🤖 ИИ активен' : '🛑 ИИ неактивен';
  aiSlot.style.color = aiActive ? 'lime' : 'red';
  
  if (gameState.insuranceDays > 0) {
    aiSlot.textContent += ` (Страховка: ${gameState.insuranceDays}д)`;
  }

  updateTimeDisplay();
  updateCurrencyDisplay();
}

function mineResources() {
  const aiActive = gameState.isDay || (gameState.coalEnabled && inventory['Уголь'] > 0);
  if (!aiActive) {
    log('❌ ИИ неактивен! Нужна энергия');
    return;
  }
  
  const coalChance = 0.03 + (gameState.coalEnabled ? 0.02 : 0) + (upgrades.mining * 0.01);
  const trashChance = 0.015 + (gameState.coalEnabled ? 0.01 : 0) + (upgrades.mining * 0.01);
  const chipChance = 0.01;
  const isCritical = Math.random() < 0.1;

  if (Math.random() < coalChance) {
    const amount = isCritical ? 2 : 1;
    inventory['Уголь'] += amount;
    gameState.criticalMining = isCritical;
    log(`Найден${amount > 1 ? 'о' : ''} ${amount} угля 🪨${isCritical ? ' ✨' : ''}`);
  }
  if (Math.random() < trashChance) {
    inventory['Мусор']++;
    log('Найден мусор ♻️');
  }
  if (Math.random() < chipChance) {
    inventory['Чипы']++;
    gameState.criticalMining = true;
    log('Найден чип 🎛️✨');
  }
  if (isCritical && Math.random() < 0.3) {
    inventory['Электроника']++;
    log('Критическая добыча: Электроника 💾✨');
  }
  
  if (upgrades.autoSell && inventory['Мусор'] > 0) {
    const price = calculateTrashPrice() * 0.5;
    gameState.tng += Math.floor(inventory['Мусор'] * price);
    gameState.trashSold += inventory['Мусор'];
    log(`Авто-продажа: ${inventory['Мусор']} мусора +${Math.floor(inventory['Мусор'] * price)}₸`);
    inventory['Мусор'] = 0;
    updateCurrencyDisplay();
  }
  
  saveGame();
  render();
}

function toggleTradeMode() {
  gameState.sellMode = !gameState.sellMode;
  if (gameState.sellMode) gameState.recycleMode = false;
  log(gameState.sellMode ? 'Режим торговли включён' : 'Режим торговли выключен');
  saveGame();
  render();
}

function toggleRecycleMode() {
  gameState.recycleMode = !gameState.recycleMode;
  if (gameState.recycleMode) gameState.sellMode = false;
  log(gameState.recycleMode ? 'Режим переработки включён' : 'Режим переработки выключен');
  saveGame();
  render();
}

function handleKeyPress(e) {
  if (e.key === 'i' && gameState.isDay && gameState.tng >= 10) {
    gameState.tng -= 10;
    gameState.insuranceDays += 3;
    log('Куплена страховка на 3 ночи (-10₸)');
    updateCurrencyDisplay();
    saveGame();
    render();
  }
}

function gameLoop() {
  gameState.gameTime--;
  if (gameState.gameTime <= 0) {
    gameState.gameTime = 15;
    gameState.isDay = !gameState.isDay;
    
    if (!gameState.isDay) {
      if (gameState.coalEnabled) {
        if (inventory['Уголь'] > 0) {
          inventory['Уголь']--;
          log('🌙 Ночь - сгорел 1 уголь');
        } else {
          gameState.coalEnabled = false;
          log('🌙 Ночь - уголь закончился, ТЭЦ отключена');
        }
      }
      
      if (!gameState.coalEnabled && !gameState.isDay && gameState.insuranceDays === 0 && Math.random() < 0.2) {
        const items = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
        if (items.length > 0) {
          const stolenItem = items[Math.floor(Math.random() * items.length)];
          inventory[stolenItem]--;
          log(`🌙 Воры украли 1 ${stolenItem}! Купи страховку днём.`);
        }
      }
    } else {
      if (gameState.insuranceDays > 0) {
        gameState.insuranceDays--;
        if (gameState.insuranceDays === 0) {
          log('🌞 Страховка закончилась');
        }
      }
      
      if (gameState.insuranceDays === 0 && gameState.tng >= 10 && Math.random() < 0.3) {
        log('Страховщик: "Купи страховку за 10₸ (3 ночи)"');
      }
    }
    
    log(gameState.isDay ? '🌞 Наступил день' : '🌙 Наступила ночь');
    saveGame();
  }

  // Пассивный доход
  gameState.passiveCounter++;
  if (gameState.passiveCounter >= 10) {
    gameState.passiveCounter = 0;
    const aiActive = gameState.isDay || (gameState.coalEnabled && inventory['Уголь'] > 0);
    if (aiActive) {
      const coalChance = 0.003 + (upgrades.mining * 0.001);
      const trashChance = 0.007 + (upgrades.mining * 0.001);
      
      if (Math.random() < coalChance) {
        inventory['Уголь']++;
        log('Пассивно: уголь 🪨');
      }
      if (Math.random() < trashChance) {
        inventory['Мусор']++;
        log('Пассивно: мусор ♻️');
      }
      
      if (upgrades.autoSell && inventory['Мусор'] > 0) {
        const price = calculateTrashPrice() * 0.5;
        gameState.tng += Math.floor(inventory['Мусор'] * price);
        gameState.trashSold += inventory['Мусор'];
        log(`Авто-продажа: ${inventory['Мусор']} мусора +${Math.floor(inventory['Мусор'] * price)}₸`);
        inventory['Мусор'] = 0;
        updateCurrencyDisplay();
      }
      
      saveGame();
    }
  }

  render();
}

// Инициализация игры
window.addEventListener('DOMContentLoaded', () => {
  loadGame();
  render();
  log('Добро пожаловать в CoreBox 2.1!');
  log('Нажми "I" днём чтобы купить страховку (10₸)');
  
  document.getElementById('mineBtn').addEventListener('click', mineResources);
  document.getElementById('toggleTrade').addEventListener('click', toggleTradeMode);
  document.getElementById('toggleRecycle').addEventListener('click', toggleRecycleMode);
  document.addEventListener('keydown', handleKeyPress);
  
  setInterval(gameLoop, 1000);
});