// Вспомогательные функции
function calculateTrashPrice() {
  const basePrice = 2; // ↑ Увеличил базовую цену
  const priceDrop = Math.floor(trashSold / 8) * 0.03; // ↓ Медленнее падение
  return Math.round(Math.max(basePrice - priceDrop, 1)); // ↑ Минимум 1
}

function handleRebelAttack() {
  const defensePower = upgrades.defense ? 30 + (upgrades.defenseLevel * 15) : 0;
  const threatLevel = Math.min(1, rebelActivity * 0.15); // ↓ Немного уменьшил базовый шанс
  
  // Шанс атаки учитывает защиту
  const attackChance = threatLevel * (1 - defensePower / 100);
  
  if (Math.random() < attackChance) {
    const attackTypes = [];
    
    // Добавляем возможные типы атак в зависимости от ситуации
    if (Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0).length > 0) {
      attackTypes.push(0); // Кража ресурсов
    }
    if (upgrades.mining > 0) {
      attackTypes.push(1); // Повреждение оборудования
    }
    if (inventory['Мусор'] > 0) {
      attackTypes.push(2); // Вандализм
    }
    if (upgrades.defense) {
      attackTypes.push(3); // Поломка турелей
    }
    attackTypes.push(4); // Взлом ИИ
    
    if (attackTypes.length === 0) return;
    
    const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
    let message = "🌙 Повстанцы атаковали!";
    let severeAttack = false;
    
    switch(attackType) {
      case 0: // Кража ресурсов
        const resources = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
        if (resources.length > 0) {
          const stolenResource = resources[Math.floor(Math.random() * resources.length)];
          // Количество кражи зависит от уровня защиты
          const amount = Math.min(inventory[stolenResource], 
            Math.floor(Math.random() * (4 - upgrades.defenseLevel * 0.5)) + 1);
          inventory[stolenResource] -= amount;
          message += ` Украдено ${amount} ${stolenResource}`;
        }
        break;
        
      case 1: // Повреждение оборудования
        if (upgrades.mining > 0 && Math.random() < 0.4) { // ↑ Увеличил шанс
          const levelsLost = Math.random() < 0.2 ? 2 : 1; // 20% шанс потерять 2 уровня
          upgrades.mining = Math.max(0, upgrades.mining - levelsLost);
          message += ` Повреждена система добычи! Уровень понижен на ${levelsLost}`;
          severeAttack = levelsLost > 1;
        }
        break;
        
      case 2: // Вандализм
        if (inventory['Мусор'] > 0) {
          // Уничтожаем процент мусора, а не фиксированное количество
          const destroyPercentage = 0.3 + Math.random() * 0.3; // 30-60% мусора
          const destroyed = Math.floor(inventory['Мусор'] * destroyPercentage);
          inventory['Мусор'] -= destroyed;
          message += ` Уничтожено ${destroyed} мусора (${Math.round(destroyPercentage * 100)}%)`;
        }
        break;
        
      case 3: // Поломка турелей
        if (upgrades.defense && Math.random() < 0.25) { // ↑ Увеличил шанс
          upgrades.defense = false;
          message += " Туррели защиты выведены из строя!";
          severeAttack = true;
        }
        break;
        
      case 4: // Взлом ИИ
        if (Math.random() < 0.08) { // ↓ Немного уменьшил шанс
          // Время отключения зависит от уровня защиты
          const disableTime = 180000 + (120000 * (1 - upgrades.defenseLevel * 0.2)); // 3-5 минут
          aiDisabledUntil = Date.now() + disableTime;
          const minutes = Math.ceil(disableTime / 60000);
          message += ` Взлом ИИ! Система неактивна ${minutes} минут`;
          severeAttack = true;
        }
        break;
    }
    
    log(message);
    
    // Увеличиваем активность повстанцев
    rebelActivity += severeAttack ? 2 : 1;
    
    // Снижаем уровень защиты после серьезных атак
    if (severeAttack && upgrades.defenseLevel > 0 && Math.random() < 0.6) { // ↑ Увеличил шанс
      upgrades.defenseLevel--;
      log("⚠️ Уровень защиты понижен из-за атаки повстанцев");
    }
    
    saveGame();
  }
}

// Обработчики взаимодействий
function handleCoalInteraction() {
  if (coalEnabled) {
    coalEnabled = false;
    log('⚡ Угольная ТЭЦ отключена');
  } else {
    if (inventory['Уголь'] > 0) {
      inventory['Уголь']--;
      coalEnabled = true;
      log('⚡ Угольная ТЭЦ активирована (-1 уголь)');
      
      // Проверка задания на активацию ТЭЦ
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
  
  // Базовые шансы с учетом баланса
  let coalChance = 0.015 + (coalEnabled ? 0.015 : 0) + (upgrades.mining * 0.008);
  let trashChance = 0.01 + (coalEnabled ? 0.008 : 0) + (upgrades.mining * 0.005);
  let chipChance = 0.004 + (upgrades.mining * 0.001);
  let plasmaChance = 0.002 + (upgrades.mining * 0.0005);
  
  // Критический удар (шанс зависит от уровня добычи)
  const isCritical = Math.random() < (0.03 + upgrades.mining * 0.005);
  let foundSomething = false;
  let criticalBonus = isCritical ? 1 : 0;

  if (Math.random() < coalChance) {
    const amount = 1 + criticalBonus;
    inventory['Уголь'] += amount;
    criticalMining = isCritical;
    
    log(`🪨 Найден${amount > 1 ? 'о' : ''} ${amount} угля${isCritical ? ' ✨КРИТ!' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  if (Math.random() < trashChance) {
    const amount = 1 + criticalBonus;
    inventory['Мусор'] += amount;
    log(`♻️ Найден${amount > 1 ? 'о' : ''} ${amount} мусора${isCritical ? ' ✨' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  if (Math.random() < chipChance) {
    const amount = 1 + criticalBonus;
    inventory['Чипы'] += amount;
    criticalMining = true;
    log(`🎛️ Найден${amount > 1 ? 'о' : ''} ${amount} чип${amount > 1 ? 'ов' : ''}${isCritical ? ' ✨' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  if (Math.random() < plasmaChance) {
    const amount = 1 + criticalBonus;
    inventory['Плазма'] += amount;
    criticalMining = true;
    log(`⚡ Найден${amount > 1 ? 'о' : ''} ${amount} плазм${amount > 1 ? 'ы' : 'а'}${isCritical ? ' ✨' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  // Если ничего не найдено, но ИИ активен
  if (!foundSomething && aiActive) {
    log('⏳ Добыча... Ресурсы не найдены');
  }
  
  // Проверка заданий на добычу
  if (foundSomething && currentQuestIndex < storyQuests.length) {
    checkQuestsProgress();
  }
  
  saveGame();
  render();
}

function upgradeMining() {
  const requiredChips = 5 + upgrades.mining * 2; // Увеличивающаяся стоимость
  if (upgrades.mining < 10 && inventory['Чипы'] >= requiredChips) {
    inventory['Чипы'] -= requiredChips;
    upgrades.mining++;
    
    log(`🚀 Улучшена добыча до уровня ${upgrades.mining}! (-${requiredChips} чипов)`);
    log(`💫 Теперь +${upgrades.mining}% к шансам добычи`);
    
    // Проверка задания на апгрейд
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
  if (!upgrades.defense && inventory['Плазма'] >= 3) {
    inventory['Плазма'] -= 3;
    upgrades.defense = true;
    
    log('🛡️ Система защиты активирована! (-3 плазмы)');
    log('✅ Теперь туррели будут отражать атаки повстанцев');
    
    // Проверка задания на активацию защиты
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
  const requiredChips = (upgrades.defenseLevel + 1) * 12; // Увеличил стоимость
  const requiredPlasma = 1 + Math.floor(upgrades.defenseLevel / 2); // Увеличивающаяся стоимость плазмы
  
  if (upgrades.defenseLevel < 5 && 
      inventory['Чипы'] >= requiredChips && 
      inventory['Плазма'] >= requiredPlasma) {
    
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
  return inventory['Плазма'] >= 15 && upgrades.defenseLevel >= 5;
}