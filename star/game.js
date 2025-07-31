// game.js
document.addEventListener('DOMContentLoaded', () => {
  // Конфигурация игры
  const STORAGE_KEY = 'coreboxSave2';
  const maxSlots = 9;
  const leftPanelItems = ['ТЭЦ', '', '', '', ''];
  const rightPanelItems = ['Переработчик', '', '', '', ''];

  // Состояние игры
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
  
  let tng = 0;
  let coalEnabled = false;
  let gameTime = 15;
  let isDay = true;
  let passiveCounter = 0;
  let sellMode = false;
  let recycleMode = false;
  let trashSold = 0;
  let insuranceDays = 0;
  let criticalMining = false;

  // DOM элементы
  const currencyDisplay = document.getElementById('currencyDisplay');
  const timeDisplay = document.getElementById('timeDisplay');
  const logBox = document.getElementById('logBox');
  const inventoryDiv = document.getElementById('inventory');
  const leftSlotsDiv = document.getElementById('leftSlots');
  const rightSlotsDiv = document.getElementById('rightSlots');
  const aiSlot = document.getElementById('aiSlot');
  const mineBtn = document.getElementById('mineBtn');
  const miningBonusSpan = document.getElementById('miningBonus');
  const toggleTradeBtn = document.getElementById('toggleTrade');
  const toggleRecycleBtn = document.getElementById('toggleRecycle');

  // Вспомогательные функции
  function log(message) {
    logBox.innerHTML += `🟢 ${message}<br>`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  function updateTimeDisplay() {
    const icon = isDay ? '🌞' : '🌙';
    timeDisplay.innerText = `${icon} ${isDay ? 'День' : 'Ночь'} — ${gameTime}s`;
  }

  function updateCurrencyDisplay() {
    currencyDisplay.innerText = `TNG: ${tng}₸`;
  }

  // Система сохранения
  function saveGame() {
    const saveData = {
      inventory,
      tng,
      coalEnabled,
      gameTime,
      isDay,
      passiveCounter,
      sellMode,
      recycleMode,
      trashSold,
      insuranceDays,
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
        tng = data.tng ?? 0;
        coalEnabled = data.coalEnabled ?? false;
        gameTime = data.gameTime ?? 15;
        isDay = data.isDay ?? true;
        passiveCounter = data.passiveCounter ?? 0;
        sellMode = data.sellMode ?? false;
        recycleMode = data.recycleMode ?? false;
        trashSold = data.trashSold ?? 0;
        insuranceDays = data.insuranceDays ?? 0;
        upgrades.mining = data.upgrades?.mining ?? 0;
        upgrades.autoSell = data.upgrades?.autoSell ?? false;
      } catch (e) {
        console.error('Ошибка загрузки сохранения', e);
      }
    }
  }

  // Игровая логика
  function calculateTrashPrice() {
    const basePrice = 1;
    const priceDrop = Math.floor(trashSold / 5) * 0.05;
    return Math.max(basePrice - priceDrop, 0.3);
  }

  function render() {
    // Обновляем бонус добычи
    miningBonusSpan.textContent = upgrades.mining;

    // Очищаем контейнеры
    inventoryDiv.innerHTML = '';
    leftSlotsDiv.innerHTML = '';
    rightSlotsDiv.innerHTML = '';

    // Отрисовка инвентаря
    Object.entries(inventory).forEach(([name, count]) => {
      if (name === 'ИИ') return;
      
      const slot = createInventorySlot(name, count);
      inventoryDiv.appendChild(slot);
    });

    // Заполнение пустых слотов
    while (inventoryDiv.children.length < maxSlots) {
      const slot = createEmptySlot();
      inventoryDiv.appendChild(slot);
    }

    // Левая панель (ТЭЦ)
    renderLeftPanel();

    // Правая панель (Переработчик и апгрейды)
    renderRightPanel();

    // Статус ИИ
    const aiActive = isDay || (coalEnabled && inventory['Уголь'] > 0);
    aiSlot.textContent = aiActive ? '🤖 ИИ активен' : '🛑 ИИ неактивен';
    aiSlot.style.color = aiActive ? 'lime' : 'red';
    
    if (insuranceDays > 0) {
      aiSlot.textContent += ` (Страховка: ${insuranceDays}д)`;
    }

    updateTimeDisplay();
    updateCurrencyDisplay();
  }

  function createInventorySlot(name, count) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = `${name} x${count}`;

    // Анимация для критической добычи
    if (criticalMining && (name === 'Уголь' || name === 'Электроника')) {
      slot.classList.add('critical');
      criticalMining = false;
    }
    
    // Бонусы добычи
    if (name === 'Уголь' || name === 'Мусор') {
      const bonusDiv = document.createElement('div');
      bonusDiv.className = 'mining-bonus';
      const baseChance = name === 'Уголь' ? 3 : 1.5;
      const totalBonus = upgrades.mining + (coalEnabled ? (name === 'Уголь' ? 2 : 1) : 0);
      bonusDiv.textContent = `+${baseChance + totalBonus}%`;
      slot.appendChild(bonusDiv);
    }

    // Режим продажи
    if (sellMode && name === 'Мусор') {
      slot.classList.add('sell-mode');
      const sellLabel = document.createElement('div');
      sellLabel.className = 'sell-label';
      sellLabel.textContent = count > 0 ? `Продать (${calculateTrashPrice().toFixed(1)}₸)` : 'Нет мусора';
      slot.appendChild(sellLabel);
      
      slot.onclick = () => handleSellTrash();
    } 
    // Режим переработки
    else if (recycleMode && name === 'Мусор') {
      slot.classList.add('recycle-mode');
      const recycleLabel = document.createElement('div');
      recycleLabel.className = 'recycle-label';
      recycleLabel.textContent = count >= 5 ? '5→1 уголь' : 'Нужно 5';
      slot.appendChild(recycleLabel);
      
      slot.onclick = () => handleRecycleTrash();
    }
    // Уголь
    else if (name === 'Уголь') {
      if (coalEnabled) {
        slot.style.borderColor = 'gold';
        slot.style.boxShadow = '0 0 8px gold';
      }
      
      slot.onclick = () => handleCoalInteraction();
    }
    // Чипы для апгрейдов
    else if (name === 'Чипы' && count > 0) {
      slot.classList.add('upgrade');
      slot.onclick = () => handleChipsUpgrade();
    }

    return slot;
  }

  function createEmptySlot() {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = '[пусто]';
    return slot;
  }

  function renderLeftPanel() {
    leftPanelItems.forEach((name, index) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      
      if (index === 0) {
        slot.textContent = coalEnabled ? 'ТЭЦ 🔥' : 'ТЭЦ';
        if (coalEnabled) {
          slot.style.borderColor = 'gold';
          slot.style.boxShadow = '0 0 8px gold';
        }
      } else {
        slot.textContent = name || '[пусто]';
      }
      
      leftSlotsDiv.appendChild(slot);
    });
  }

  function renderRightPanel() {
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
      
      rightSlotsDiv.appendChild(slot);
    });
  }

  // Обработчики взаимодействий
  function handleSellTrash() {
    if (inventory['Мусор'] > 0) {
      const price = calculateTrashPrice();
      tng += Math.floor(inventory['Мусор'] * price);
      trashSold += inventory['Мусор'];
      log(`Продано ${inventory['Мусор']} мусора +${Math.floor(inventory['Мусор'] * price)}₸`);
      inventory['Мусор'] = 0;
      updateCurrencyDisplay();
      saveGame();
      render();
    }
  }

  function handleRecycleTrash() {
    if (inventory['Мусор'] >= 5) {
      inventory['Мусор'] -= 5;
      inventory['Уголь']++;
      log('Переработано 5 мусора → 1 уголь');
      saveGame();
      render();
    }
  }

  function handleCoalInteraction() {
    if (sellMode && isDay) {
      if (inventory['Уголь'] > 0) {
        inventory['Уголь']--;
        tng += 3;
        coalEnabled = false;
        log('Продано 1 уголь +3₸ (ТЭЦ отключена)');
        updateCurrencyDisplay();
        saveGame();
        render();
      }
    } 
    else if (!sellMode && !recycleMode) {
      if (!coalEnabled) {
        if (inventory['Уголь'] > 0) {
          coalEnabled = true;
          inventory['Уголь']--;
          log('Угольная ТЭЦ активирована (-1 уголь)');
        } else {
          log('Нет угля для активации!');
        }
      } else {
        coalEnabled = false;
        log('Угольная ТЭЦ отключена');
      }
      saveGame();
      render();
    }
  }

  function handleChipsUpgrade() {
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
  }

  function mineResources() {
    const aiActive = isDay || (coalEnabled && inventory['Уголь'] > 0);
    if (!aiActive) {
      log('❌ ИИ неактивен! Нужна энергия');
      return;
    }
    
    const coalChance = 0.03 + (coalEnabled ? 0.02 : 0) + (upgrades.mining * 0.01);
    const trashChance = 0.015 + (coalEnabled ? 0.01 : 0) + (upgrades.mining * 0.01);
    const chipChance = 0.01;
    const isCritical = Math.random() < 0.1;

    if (Math.random() < coalChance) {
      const amount = isCritical ? 2 : 1;
      inventory['Уголь'] += amount;
      criticalMining = isCritical;
      log(`Найден${amount > 1 ? 'о' : ''} ${amount} угля 🪨${isCritical ? ' ✨' : ''}`);
    }
    
    if (Math.random() < trashChance) {
      inventory['Мусор']++;
      log('Найден мусор ♻️');
    }
    
    if (Math.random() < chipChance) {
      inventory['Чипы']++;
      criticalMining = true;
      log('Найден чип 🎛️✨');
    }
    
    if (isCritical && Math.random() < 0.3) {
      inventory['Электроника']++;
      log('Критическая добыча: Электроника 💾✨');
    }
    
    if (upgrades.autoSell && inventory['Мусор'] > 0) {
      const price = calculateTrashPrice() * 0.5;
      tng += Math.floor(inventory['Мусор'] * price);
      trashSold += inventory['Мусор'];
      log(`Авто-продажа: ${inventory['Мусор']} мусора +${Math.floor(inventory['Мусор'] * price)}₸`);
      inventory['Мусор'] = 0;
      updateCurrencyDisplay();
    }
    
    saveGame();
    render();
  }

  // Инициализация игры
  function initEventListeners() {
    mineBtn.addEventListener('click', mineResources);
    toggleTradeBtn.addEventListener('click', toggleTradeMode);
    toggleRecycleBtn.addEventListener('click', toggleRecycleMode);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'i' && isDay && tng >= 10) {
        buyInsurance();
      }
    });
  }

  function toggleTradeMode() {
    sellMode = !sellMode;
    if (sellMode) recycleMode = false;
    log(sellMode ? 'Режим торговли включён' : 'Режим торговли выключен');
    saveGame();
    render();
  }

  function toggleRecycleMode() {
    recycleMode = !recycleMode;
    if (recycleMode) sellMode = false;
    log(recycleMode ? 'Режим переработки включён' : 'Режим переработки выключен');
    saveGame();
    render();
  }

  function buyInsurance() {
    tng -= 10;
    insuranceDays += 3;
    log('Куплена страховка на 3 ночи (-10₸)');
    updateCurrencyDisplay();
    saveGame();
    render();
  }

  function gameLoop() {
    gameTime--;
    if (gameTime <= 0) {
      gameTime = 15;
      isDay = !isDay;
      
      if (!isDay) {
        handleNightTransition();
      } else {
        handleDayTransition();
      }
      
      log(isDay ? '🌞 Наступил день' : '🌙 Наступила ночь');
      saveGame();
    }

    handlePassiveIncome();
    render();
  }

  function handleNightTransition() {
    if (coalEnabled) {
      if (inventory['Уголь'] > 0) {
        inventory['Уголь']--;
        log('🌙 Ночь - сгорел 1 уголь');
      } else {
        coalEnabled = false;
        log('🌙 Ночь - уголь закончился, ТЭЦ отключена');
      }
    }
    
    if (!coalEnabled && !isDay && insuranceDays === 0 && Math.random() < 0.2) {
      const items = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
      if (items.length > 0) {
        const stolenItem = items[Math.floor(Math.random() * items.length)];
        inventory[stolenItem]--;
        log(`🌙 Воры украли 1 ${stolenItem}! Купи страховку днём.`);
      }
    }
  }

  function handleDayTransition() {
    if (insuranceDays > 0) {
      insuranceDays--;
      if (insuranceDays === 0) {
        log('🌞 Страховка закончилась');
      }
    }
    
    if (insuranceDays === 0 && tng >= 10 && Math.random() < 0.3) {
      log('Страховщик: "Купи страховку за 10₸ (3 ночи)"');
    }
  }

  function handlePassiveIncome() {
    passiveCounter++;
    if (passiveCounter >= 10) {
      passiveCounter = 0;
      const aiActive = isDay || (coalEnabled && inventory['Уголь'] > 0);
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
          tng += Math.floor(inventory['Мусор'] * price);
          trashSold += inventory['Мусор'];
          log(`Авто-продажа: ${inventory['Мусор']} мусора +${Math.floor(inventory['Мусор'] * price)}₸`);
          inventory['Мусор'] = 0;
          updateCurrencyDisplay();
        }
        
        saveGame();
      }
    }
  }

  // Запуск игры
  function initGame() {
    loadGame();
    initEventListeners();
    render();
    setInterval(gameLoop, 1000);
    log('Добро пожаловать в CoreBox 2.1!');
    log('Нажми "I" днём чтобы купить страховку (10₸)');
  }

  initGame();
});