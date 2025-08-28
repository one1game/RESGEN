// ======== init.js ========

// Игровой цикл
function gameLoop() {
  const now = Date.now();
  const secondsPassed = Math.floor((now - lastUpdateTime) / 1000);
  lastUpdateTime = now;
  
  gameTime -= secondsPassed;
  
  while (gameTime <= 0) {
    gameTime += CYCLE_DURATION;
    const wasNight = !isDay;
    isDay = !isDay;
    
    if (wasNight) {
      nightsSurvived++;
      
      if (coalEnabled) {
        nightsWithCoal++;
        
        if (inventory['Уголь'] > 0) {
          inventory['Уголь']--;
          log('🌙 Ночь - сгорел 1 уголь');
        } else {
          coalEnabled = false;
          log('🌙 Ночь - уголь закончился, ТЭЦ отключена');
        }
      }
      
      // Атака повстанцев
      const defensePower = upgrades.defense ? 30 + (upgrades.defenseLevel * 15) : 0;
      if (Math.random() * 100 > defensePower) {
        handleRebelAttack();
      } else if (upgrades.defense) {
        log('🌙 Система защиты отразила атаку повстанцев');
        successfulDefenses++;
      }
      
      // Увеличиваем активность повстанцев ночью
      if (Math.random() < 0.3) {
        rebelActivity++;
      }
      
      // Проверка заданий, связанных с ночью
      checkQuestsProgress();
    } else {
      // День - снижаем активность повстанцев
      rebelActivity = Math.max(0, rebelActivity - 1);
    }
    
    log(isDay ? '☀️ Наступил день' : '🌙 Наступила ночь');
    saveGame();
  }

  // Пассивный доход
  passiveCounter += secondsPassed;
  while (passiveCounter >= 10) {
    passiveCounter -= 10;
    const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
    if (aiActive) {
      const coalChance = 0.003 + (upgrades.mining * 0.001);
      const trashChance = 0.007 + (upgrades.mining * 0.001);
      const chipChance = 0.001;
      
      // ИСПРАВЛЕННАЯ ПАССИВНАЯ ДОБЫЧА ПЛАЗМЫ
      let plasmaChance = 0;
      if (plasmaUnlocked) {
        plasmaChance = 0.0005 + (upgrades.mining * 0.0001);
        // Бонус после квеста
        const plasmaQuest = storyQuests.find(q => q.id === 'plasma_breakthrough');
        if (plasmaQuest && plasmaQuest.completed) {
          plasmaChance += 0.0003;
        }
      }
      
      if (Math.random() < coalChance) {
        inventory['Уголь']++;
        totalMined++;
      }
      if (Math.random() < trashChance) {
        inventory['Мусор']++;
        totalMined++;
      }
      if (Math.random() < chipChance) {
        inventory['Чипы']++;
        totalMined++;
      }
      if (Math.random() < plasmaChance) {
        inventory['Плазма']++;
        totalMined++;
      }
      
      saveGame();
      checkQuestsProgress();
    }
  }

  // Мини-ивенты повстанцев
  handleRebelEvents();
  
  render();
}

// Функция для мини-ивентов повстанцев
function handleRebelEvents() {
  // Случайные мини-ивенты от повстанцев
  if (rebelActivity > 3 && Math.random() < 0.1) {
    const events = [
      () => {
        log("🚨 Повстанцы блокируют добычу! Следующие 2 клика не принесут ресурсов.");
        // Можно добавить временный флаг блокировки
      },
      () => {
        if (tng > 0) {
          const stolenMoney = Math.min(tng, Math.floor(tng * 0.2));
          tng -= stolenMoney;
          log(`🚨 Повстанцы украли ${stolenMoney}₸ из ваших средств!`);
        }
      },
      () => {
        if (upgrades.defense) {
          log("🚨 Повстанцы проводят диверсию! Защита временно ослаблена.");
          // Можно добавить временный штраф к защите
        }
      },
      () => {
        // Кража случайного ресурса
        const resources = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
        if (resources.length > 0) {
          const stolenResource = resources[Math.floor(Math.random() * resources.length)];
          const amount = Math.min(inventory[stolenResource], 2);
          if (amount > 0) {
            inventory[stolenResource] -= amount;
            log(`🚨 Повстанцы украли ${amount} ${stolenResource}!`);
          }
        }
      }
    ];
    
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    randomEvent();
    saveGame();
  }
}

// Инициализация игры
function initEventListeners() {
  mineBtn.addEventListener('click', mineResources);
  upgradeMiningBtn.addEventListener('click', upgradeMining);
  upgradeDefenseBtn.addEventListener('click', activateDefense);
  upgradeDefenseLevelBtn.addEventListener('click', upgradeDefense);
  clearLogBtn.addEventListener('click', clearLog);
  autoScrollBtn.addEventListener('click', toggleAutoScroll);
  buyModeBtn.addEventListener('click', () => toggleBuySellMode(true));
  sellModeBtn.addEventListener('click', () => toggleBuySellMode(false));
  
  document.querySelectorAll('.panel-title').forEach(title => {
    title.addEventListener('click', (e) => {
      if (e.target.classList.contains('collapse-icon')) return;
      toggleCollapse(title.closest('.panel'));
    });
  });
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
}

function initGame() {
  loadGame();
  initEventListeners();
  setupRadioPlayer();
  
  render();
  toggleBuySellMode(true);
  
  setInterval(gameLoop, 1000);
  
  log('Система CoreBox 2.9 инициализирована');
  log('Добро пожаловать в систему добычи ресурсов!');
  log('Ваша задача - восстановить работу комплекса и защитить его от повстанцев');
}

// Запуск игры при загрузке DOM
document.addEventListener('DOMContentLoaded', initGame);

document.addEventListener('DOMContentLoaded', function() {
  loadGame();
  sanitizeInventory();
  autoUnlockResources();
  render();
  startGameLoop();
});

// Функция для запуска игрового цикла
function startGameLoop() {
  setInterval(gameLoop, 1000);
}