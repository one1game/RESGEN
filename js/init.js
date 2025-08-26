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
      const plasmaChance = 0.0005;
      
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

  render();
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
  sanitizeInventory(); // Добавьте этот вызов
  render();
  startGameLoop();
});