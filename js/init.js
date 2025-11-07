// ======== init.js ========
function gameLoop() {
  const now = Date.now();
  const secondsPassed = Math.floor((now - lastUpdateTime) / 1000);
  lastUpdateTime = now;
  
  gameTime -= secondsPassed;
  
  while (gameTime <= 0) {
      gameTime += GameConfig.CYCLE_DURATION;
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
                  voiceAlerts.alertSystem('Уголь закончился, ТЭЦ отключена', true);
              }
          }
          
          const defensePower = upgrades.defense ? GameConfig.DEFENSE.BASE_POWER + (upgrades.defenseLevel * GameConfig.DEFENSE.LEVEL_BONUS) : 0;
          if (Math.random() * 100 > defensePower) {
              handleRebelAttack();
          } else if (upgrades.defense) {
              log('🌙 Система защиты отразила атаку повстанцев');
              voiceAlerts.alertSystem('Защита отразила атаку повстанцев');
              successfulDefenses++;
              questProgress.successfulDefenses++;
          }
          
          if (Math.random() < GameConfig.REBELS.BASE_ATTACK_CHANCE) {
              rebelActivity++;
          }
          
          checkQuestsProgress();
      } else {
          rebelActivity = Math.max(0, rebelActivity - GameConfig.REBELS.ACTIVITY_DECREASE);
      }
      
      log(isDay ? '☀️ Наступил день' : '🌙 Наступила ночь');
      if (isDay) {
          voiceAlerts.alertSystem('Наступил день');
      } else {
          voiceAlerts.alertSystem('Наступила ночь');
      }
      saveGame();
  }

  passiveCounter += secondsPassed;
  while (passiveCounter >= 10) {
      passiveCounter -= 10;
      const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
      if (aiActive) {
          // ИСПРАВЛЕНО: пассивная добыча учитывает разблокировку
          const coalChance = coalUnlocked ? (GameConfig.MINING.PASSIVE_CHANCES.COAL + (upgrades.mining * 0.001)) : 0;
          const trashChance = trashUnlocked ? (GameConfig.MINING.PASSIVE_CHANCES.TRASH + (upgrades.mining * 0.001)) : 0;
          const chipChance = chipsUnlocked ? GameConfig.MINING.PASSIVE_CHANCES.CHIPS : 0;
          const plasmaChance = plasmaUnlocked ? GameConfig.MINING.PASSIVE_CHANCES.PLASMA : 0;
          
          if (coalUnlocked && Math.random() < coalChance) {
              inventory['Уголь'] = (inventory['Уголь'] || 0) + 1;
              totalMined++;
              questProgress.totalMined++;
          }
          if (trashUnlocked && Math.random() < trashChance) {
              inventory['Мусор'] = (inventory['Мусор'] || 0) + 1;
              totalMined++;
              questProgress.totalMined++;
          }
          if (chipsUnlocked && Math.random() < chipChance) {
              inventory['Чипы'] = (inventory['Чипы'] || 0) + 1;
              totalMined++;
              questProgress.totalMined++;
          }
          if (plasmaUnlocked && Math.random() < plasmaChance) {
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

function initEventListeners() {
  const mineBtn = document.getElementById('mineBtn');
  if (mineBtn) mineBtn.addEventListener('click', mineResources);
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
  initVoiceControls();
}

function initGame() {
  loadGame();
  
  // ДОБАВЛЕНО: восстановление голосовых настроек
  voiceAlerts.enabled = voiceSettings.enabled;
  voiceAlerts.setVolume(voiceSettings.volume);
  voiceAlerts.setRate(voiceSettings.rate);
  
  initEventListeners();
  setupRadioPlayer();
  
  render();
  toggleBuySellMode(true);
  
  setInterval(gameLoop, 1000);
  
  log(`Система CoreBox ${GameConfig.VERSION} инициализирована`);
  log('Добро пожаловать в систему добычи ресурсов!');
  log('Ваша задача - восстановить работу комплекса и защитить его от повстанцев');
  
  voiceAlerts.alertSystem(`Система CoreBox ${GameConfig.VERSION} инициализирована`);
}

document.addEventListener('DOMContentLoaded', initGame);