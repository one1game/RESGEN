// ======== mechanics.js ========

// ======== mechanics.js ========

// Вспомогательные функции
function calculateTrashPrice() {
  const basePrice = 2;
  const priceDrop = Math.floor(trashSold / 8) * 0.03;
  return Math.round(Math.max(basePrice - priceDrop, 1));
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
          Math.floor(Math.random() * (4 - upgrades.defenseLevel * 0.5)) + 1);
        inventory[stolenResource] -= amount;
        message += ` Украдено ${amount} ${stolenResource}`;
      }
      break;
      
    case 1:
      if (upgrades.mining > 0 && Math.random() < 0.4) {
        const levelsLost = Math.random() < 0.2 ? 2 : 1;
        upgrades.mining = Math.max(0, upgrades.mining - levelsLost);
        message += ` Повреждена система добычи! Уровень понижен на ${levelsLost}`;
        severeAttack = levelsLost > 1;
      }
      break;
      
    case 2:
      if ((inventory['Мусор'] || 0) > 0 && trashUnlocked) {
        const destroyPercentage = 0.3 + Math.random() * 0.3;
        const destroyed = Math.floor((inventory['Мусор'] || 0) * destroyPercentage);
        inventory['Мусор'] -= destroyed;
        message += ` Уничтожено ${destroyed} мусора (${Math.round(destroyPercentage * 100)}%)`;
      }
      break;
      
    case 3:
      if (upgrades.defense && Math.random() < 0.25) {
        upgrades.defense = false;
        message += " Туррели защиты выведены из строя!";
        severeAttack = true;
      }
      break;
      
    case 4:
      if (Math.random() < 0.08) {
        const disableTime = 180000 + (120000 * (1 - upgrades.defenseLevel * 0.2));
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
  
  let coalChance = 0.015 + (coalEnabled ? 0.015 : 0) + (upgrades.mining * 0.008);
  let trashChance = 0.01 + (coalEnabled ? 0.008 : 0) + (upgrades.mining * 0.005);
  let chipChance = chipsUnlocked ? (0.004 + (upgrades.mining * 0.001)) : 0;
  let plasmaChance = plasmaUnlocked ? (0.002 + (upgrades.mining * 0.0005)) : 0;
  
  const isCritical = Math.random() < (0.03 + upgrades.mining * 0.005);
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
  const requiredChips = 5 + upgrades.mining * 2;
  if (upgrades.mining < 10 && (inventory['Чипы'] || 0) >= requiredChips) {
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
  } else if (upgrades.mining >= 10) {
    log('✅ Добыча уже максимально улучшена!');
  } else {
    log(`❌ Недостаточно чипов (нужно ${requiredChips})`);
  }
}

function activateDefense() {
  if (!upgrades.defense && (inventory['Плазма'] || 0) >= 3) {
    inventory['Плазма'] -= 3;
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
  const requiredChips = (upgrades.defenseLevel + 1) * 12;
  const requiredPlasma = 1 + Math.floor(upgrades.defenseLevel / 2);
  
  if (upgrades.defenseLevel < 5 && 
      (inventory['Чипы'] || 0) >= requiredChips && 
      (inventory['Плазма'] || 0) >= requiredPlasma) {
    
    inventory['Чипы'] -= requiredChips;
    inventory['Плазма'] -= requiredPlasma;
    upgrades.defenseLevel++;
    
    const defensePower = 30 + (upgrades.defenseLevel * 15);
    log(`🛡️ Улучшена защита до уровня ${upgrades.defenseLevel}!`);
    log(`📊 Мощность защиты: ${defensePower}%`);
    log(`💸 Стоимость: -${requiredChips} чипов, -${requiredPlasma} плазмы`);
    
    saveGame();
    render();
  } else if (upgrades.defenseLevel >= 5) {
    log('✅ Защита уже максимального уровня!');
  } else {
    log(`❌ Недостаточно ресурсов (чипы: ${requiredChips}, плазма: ${requiredPlasma})`);
  }
}

// Новые функции для улучшенной механики
function checkUpgradeAllQuest() {
  return upgrades.mining >= 10 && upgrades.defenseLevel >= 5;
}

function checkFinalActivationQuest() {
  return (inventory['Плазма'] || 0) >= 15 && upgrades.defenseLevel >= 5;
}