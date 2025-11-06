// ======== mechanics.js ========

// Вспомогательные функции
function calculateTrashPrice() {
  const basePrice = GAME_CONSTANTS.TRASH.BASE_PRICE;
  const priceDrop = Math.floor(trashSold / GAME_CONSTANTS.TRASH.PRICE_DROP_PER) * GAME_CONSTANTS.TRASH.PRICE_DROP_AMOUNT;
  return Math.round(Math.max(basePrice - priceDrop, GAME_CONSTANTS.TRASH.MIN_PRICE));
}

function handleRebelAttack() {
  const attackTypes = [];
  
  // Определяем возможные типы атак на основе того, что у игрока есть
  if (Object.keys(inventory).filter(k => k !== 'ИИ' && (inventory[k] || 0) > 0).length > 0) {
      attackTypes.push(0); // Кража ресурсов
  }
  if (upgrades.mining > 0) {
      attackTypes.push(1); // Повреждение добычи
  }
  if ((inventory['Мусор'] || 0) > 0 && trashUnlocked) {
      attackTypes.push(2); // Уничтожение мусора
  }
  if (upgrades.defense) {
      attackTypes.push(3); // Отключение защиты
  }
  attackTypes.push(4); // Взлом ИИ (всегда возможен)
  
  if (attackTypes.length === 0) return;
  
  const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
  let message = "🌙 Повстанцы атаковали!";
  let severeAttack = false;
  
  switch(attackType) {
      case 0:
          const resources = Object.keys(inventory).filter(k => k !== 'ИИ' && (inventory[k] || 0) > 0);
          if (resources.length > 0) {
              const stolenResource = resources[Math.floor(Math.random() * resources.length)];
              const amount = Math.min(inventory[stolenResource], 
                  Math.floor(Math.random() * (GAME_CONSTANTS.REBEL_ATTACKS.RESOURCE_STEAL.MAX - upgrades.defenseLevel * GAME_CONSTANTS.REBEL_ATTACKS.RESOURCE_STEAL.DEFENSE_REDUCTION)) + GAME_CONSTANTS.REBEL_ATTACKS.RESOURCE_STEAL.MIN);
              inventory[stolenResource] -= amount;
              message += ` Украдено ${amount} ${stolenResource}`;
          }
          break;
          
      case 1:
          if (upgrades.mining > 0 && Math.random() < GAME_CONSTANTS.REBEL_ATTACKS.MINING_DAMAGE.CHANCE) {
              const levelsLost = Math.random() < GAME_CONSTANTS.REBEL_ATTACKS.MINING_DAMAGE.DOUBLE_DAMAGE_CHANCE ? 2 : 1;
              upgrades.mining = Math.max(0, upgrades.mining - levelsLost);
              message += ` Повреждена система добычи! Уровень понижен на ${levelsLost}`;
              severeAttack = levelsLost > 1;
          }
          break;
          
      case 2:
          if ((inventory['Мусор'] || 0) > 0 && trashUnlocked) {
              const destroyPercentage = GAME_CONSTANTS.REBEL_ATTACKS.TRASH_DESTROY.MIN_PERCENT + Math.random() * (GAME_CONSTANTS.REBEL_ATTACKS.TRASH_DESTROY.MAX_PERCENT - GAME_CONSTANTS.REBEL_ATTACKS.TRASH_DESTROY.MIN_PERCENT);
              const destroyed = Math.floor((inventory['Мусор'] || 0) * destroyPercentage);
              inventory['Мусор'] -= destroyed;
              message += ` Уничтожено ${destroyed} мусора (${Math.round(destroyPercentage * 100)}%)`;
          }
          break;
          
      case 3:
          if (upgrades.defense && Math.random() < GAME_CONSTANTS.DEFENSE.DISABLE_CHANCE) {
              upgrades.defense = false;
              message += " Туррели защиты выведены из строя!";
              severeAttack = true;
          }
          break;
          
      case 4:
          if (Math.random() < GAME_CONSTANTS.DEFENSE.AI_HACK_CHANCE) {
              const disableTime = GAME_CONSTANTS.REBEL_ATTACKS.AI_DISABLE.MIN_TIME + (GAME_CONSTANTS.REBEL_ATTACKS.AI_DISABLE.MAX_TIME - GAME_CONSTANTS.REBEL_ATTACKS.AI_DISABLE.MIN_TIME) * (1 - upgrades.defenseLevel * GAME_CONSTANTS.REBEL_ATTACKS.AI_DISABLE.DEFENSE_REDUCTION));
              aiDisabledUntil = Date.now() + disableTime;
              const minutes = Math.ceil(disableTime / 60000);
              message += ` Взлом ИИ! Система неактивна ${minutes} минут`;
              severeAttack = true;
          }
          break;
  }
  
  // Увеличиваем активность после атаки
  rebelActivity += severeAttack ? 2 : 1;
  
  if (severeAttack && upgrades.defenseLevel > 0 && Math.random() < 0.6) {
      upgrades.defenseLevel--;
      log("⚠️ Уровень защиты понижен из-за атаки повстанцев");
  }
  
  log(message);
  saveGame();
}

// Обработчики взаимодействий
function handleCoalInteraction() {
  if (coalEnabled) {
      coalEnabled = false;
      log('⚡ Угольная ТЭЦ отключена');
  } else {
      if ((inventory['Уголь'] || 0) > 0) {
          inventory['Уголь']--;
          coalEnabled = true;
          log('⚡ Угольная ТЭЦ активирована (-1 уголь)');
          
          if (currentQuestIndex < storyQuests.length && 
              storyQuests[currentQuestIndex].type === 'activate_coal') {
              checkQuestsProgress();
          }
      } else {
          log('❌ Нет угля для активации ТЭЦ!');
      }
  }
  saveGame();
  render();
}

function mineResources() {
  const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
  if (!aiActive) {
      log('❌ ИИ неактивен! Нужна энергия для добычи');
      return;
  }
  
  const { BASE_CHANCES, BONUSES, CRITICAL } = GAME_CONSTANTS.MINING;
  
  let coalChance = BASE_CHANCES.COAL + 
      (coalEnabled ? BONUSES.COAL_ENABLED : 0) + 
      (upgrades.mining * BONUSES.COAL_LEVEL_MULTIPLIER);
      
  let trashChance = BASE_CHANCES.TRASH + 
      (coalEnabled ? BONUSES.TRASH_ENABLED : 0) + 
      (upgrades.mining * BONUSES.TRASH_LEVEL_MULTIPLIER);
      
  let chipChance = chipsUnlocked ? 
      (BASE_CHANCES.CHIPS + (upgrades.mining * BONUSES.CHIPS_LEVEL_MULTIPLIER)) : 0;
      
  let plasmaChance = plasmaUnlocked ? 
      (BASE_CHANCES.PLASMA + (upgrades.mining * BONUSES.PLASMA_LEVEL_MULTIPLIER)) : 0;
  
  const isCritical = Math.random() < (CRITICAL.BASE_CHANCE + upgrades.mining * CRITICAL.PER_LEVEL);
  let foundSomething = false;
  let criticalBonus = isCritical ? 1 : 0;

  if (Math.random() < coalChance) {
      const amount = 1 + criticalBonus;
      if (!coalUnlocked) {
          coalUnlocked = true;
          inventory['Уголь'] = 0;
          log('🪨 Обнаружены угольные месторождения!');
      }
      inventory['Уголь'] += amount;
      criticalMining = isCritical;
      
      log(`🪨 Найден${amount > 1 ? 'о' : ''} ${amount} угля${isCritical ? ' ✨КРИТ!' : ''}`);
      foundSomething = true;
      totalMined += amount;
      questProgress.totalMined += amount;
  }
  
  if (Math.random() < trashChance) {
      const amount = 1 + criticalBonus;
      if (!trashUnlocked) {
          trashUnlocked = true;
          inventory['Мусор'] = 0;
          log('♻️ Обнаружены залежи перерабатываемых материалов!');
      }
      inventory['Мусор'] += amount;
      log(`♻️ Найден${amount > 1 ? 'о' : ''} ${amount} мусора${isCritical ? ' ✨' : ''}`);
      foundSomething = true;
      totalMined += amount;
      questProgress.totalMined += amount;
  }
  
  if (chipsUnlocked && Math.random() < chipChance) {
      const amount = 1 + criticalBonus;
      inventory['Чипы'] += amount;
      criticalMining = true;
      log(`🎛️ Найден${amount > 1 ? 'о' : ''} ${amount} чип${amount > 1 ? 'ов' : ''}${isCritical ? ' ✨' : ''}`);
      foundSomething = true;
      totalMined += amount;
      questProgress.totalMined += amount;
  }
  
  if (plasmaUnlocked && Math.random() < plasmaChance) {
      const amount = 1 + criticalBonus;
      inventory['Плазма'] += amount;
      criticalMining = true;
      log(`⚡ Найден${amount > 1 ? 'о' : ''} ${amount} плазм${amount > 1 ? 'ы' : 'а'}${isCritical ? ' ✨' : ''}`);
      foundSomething = true;
      totalMined += amount;
      questProgress.totalMined += amount;
  }
  
  // Всегда сбрасываем criticalMining после добычи
  if (criticalMining) {
      criticalMining = false;
  }
  
  if (foundSomething && currentQuestIndex < storyQuests.length) {
      checkQuestsProgress();
  }
  
  saveGame();
  render();
}

function upgradeMining() {
  const requiredChips = GAME_CONSTANTS.UPGRADES.MINING.BASE_CHIPS + upgrades.mining * GAME_CONSTANTS.UPGRADES.MINING.CHIPS_PER_LEVEL;
  if (upgrades.mining < GAME_CONSTANTS.UPGRADES.MINING.MAX_LEVEL && (inventory['Чипы'] || 0) >= requiredChips) {
      inventory['Чипы'] -= requiredChips;
      upgrades.mining++;
      
      log(`🚀 Улучшена добыча до уровня ${upgrades.mining}! (-${requiredChips} чипов)`);
      log(`💫 Теперь +${upgrades.mining}% к шансам добычи`);
      
      if (currentQuestIndex < storyQuests.length && 
          storyQuests[currentQuestIndex].type === 'upgrade_mining') {
          checkQuestsProgress();
      }
      
      saveGame();
      render();
  } else if (upgrades.mining >= GAME_CONSTANTS.UPGRADES.MINING.MAX_LEVEL) {
      log('✅ Добыча уже максимально улучшена!');
  } else {
      log(`❌ Недостаточно чипов (нужно ${requiredChips})`);
  }
}

function activateDefense() {
  if (!upgrades.defense && (inventory['Плазма'] || 0) >= GAME_CONSTANTS.UPGRADES.DEFENSE.PLASMA_COST) {
      inventory['Плазма'] -= GAME_CONSTANTS.UPGRADES.DEFENSE.PLASMA_COST;
      upgrades.defense = true;
      
      log('🛡️ Система защиты активирована! (-3 плазмы)');
      log('✅ Теперь туррели будут отражать атаки повстанцев');
      
      if (currentQuestIndex < storyQuests.length && 
          storyQuests[currentQuestIndex].type === 'activate_defense') {
          checkQuestsProgress();
      }
      
      saveGame();
      render();
  } else if (upgrades.defense) {
      log('✅ Защита уже активирована');
  } else {
      log('❌ Недостаточно плазмы (нужно 3)');
  }
}

function upgradeDefense() {
  const requiredChips = (upgrades.defenseLevel + 1) * GAME_CONSTANTS.UPGRADES.DEFENSE.LEVELS.CHIPS_MULTIPLIER;
  const requiredPlasma = GAME_CONSTANTS.UPGRADES.DEFENSE.LEVELS.PLASMA_BASE + Math.floor(upgrades.defenseLevel / 2);
  
  if (upgrades.defenseLevel < GAME_CONSTANTS.UPGRADES.DEFENSE.LEVELS.MAX && 
      (inventory['Чипы'] || 0) >= requiredChips && 
      (inventory['Плазма'] || 0) >= requiredPlasma) {
      
      inventory['Чипы'] -= requiredChips;
      inventory['Плазма'] -= requiredPlasma;
      upgrades.defenseLevel++;
      
      const defensePower = GAME_CONSTANTS.DEFENSE.BASE_POWER + (upgrades.defenseLevel * GAME_CONSTANTS.DEFENSE.PER_LEVEL);
      log(`🛡️ Улучшена защита до уровня ${upgrades.defenseLevel}!`);
      log(`📊 Мощность защиты: ${defensePower}%`);
      log(`💸 Стоимость: -${requiredChips} чипов, -${requiredPlasma} плазмы`);
      
      saveGame();
      render();
  } else if (upgrades.defenseLevel >= GAME_CONSTANTS.UPGRADES.DEFENSE.LEVELS.MAX) {
      log('✅ Защита уже максимального уровня!');
  } else {
      log(`❌ Недостаточно ресурсов (чипы: ${requiredChips}, плазма: ${requiredPlasma})`);
  }
}

// Новые функции для улучшенной механики
function checkUpgradeAllQuest() {
  return upgrades.mining >= GAME_CONSTANTS.UPGRADES.MINING.MAX_LEVEL && 
         upgrades.defenseLevel >= GAME_CONSTANTS.UPGRADES.DEFENSE.LEVELS.MAX;
}

function checkFinalActivationQuest() {
  return (inventory['Плазма'] || 0) >= 15 && upgrades.defenseLevel >= GAME_CONSTANTS.UPGRADES.DEFENSE.LEVELS.MAX;
}