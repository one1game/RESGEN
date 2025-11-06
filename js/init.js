// ======== init.js ========

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
        questProgress.nightsWithCoal++;
        
        if ((inventory['Уголь'] || 0) > 0) {
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
        questProgress.successfulDefenses++;
      }
      
      // Увеличиваем активность повстанцев ночью
      if (Math.random() < 0.6) {
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
      const plasmaChance = 0.002;
      
      if (Math.random() < coalChance) {
        inventory['Уголь'] = (inventory['Уголь'] || 0) + 1;
        totalMined++;
        questProgress.totalMined++;
      }
      if (Math.random() < trashChance) {
        inventory['Мусор'] = (inventory['Мусор'] || 0) + 1;
        totalMined++;
        questProgress.totalMined++;
      }
      if (Math.random() < chipChance) {
        inventory['Чипы'] = (inventory['Чипы'] || 0) + 1;
        totalMined++;
        questProgress.totalMined++;
      }
      if (Math.random() < plasmaChance) {
        inventory['Плазма'] = (inventory['Плазма'] || 0) + 1;
        totalMined++;
        questProgress.totalMined++;
      }
      
      saveGame();
      checkQuestsProgress();
    }
  }

  render();
}

// Инициализация обработчиков событий
function initEventListeners() {
  // УБРАНА основная кнопка добычи
  if (upgradeMiningBtn) upgradeMiningBtn.addEventListener('click', upgradeMining);
  if (upgradeDefenseBtn) upgradeDefenseBtn.addEventListener('click', activateDefense);
  if (upgradeDefenseLevelBtn) upgradeDefenseLevelBtn.addEventListener('click', upgradeDefense);
  if (clearLogBtn) clearLogBtn.addEventListener('click', clearLog);
  if (autoScrollBtn) autoScrollBtn.addEventListener('click', toggleAutoScroll);
  if (buyModeBtn) buyModeBtn.addEventListener('click', () => toggleBuySellMode(true));
  if (sellModeBtn) sellModeBtn.addEventListener('click', () => toggleBuySellMode(false));
  
  document.querySelectorAll('.panel-title').forEach(title => {
    title.addEventListener('click', (e) => {
      if (e.target.classList.contains('collapse-icon')) return;
      const panel = title.closest('.panel');
      if (panel) toggleCollapse(panel);
    });
  });
  
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });
  }
  
  initFloatingButton();
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