// Вспомогательные функции
function calculateTrashPrice() {
  const basePrice = 1;
  const priceDrop = Math.floor(trashSold / 5) * 0.05;
  return Math.max(basePrice - priceDrop, 0.3);
}

function handleRebelAttack() {
  const threatLevel = Math.min(1, rebelActivity * 0.2);
  
  if (Math.random() < threatLevel) {
    const attackType = Math.floor(Math.random() * 5);
    let message = "🌙 Повстанцы атаковали!";
    let severeAttack = false;
    
    switch(attackType) {
      case 0: // Кража ресурсов
        const resources = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
        if (resources.length > 0) {
          const stolenResource = resources[Math.floor(Math.random() * resources.length)];
          const amount = Math.min(inventory[stolenResource], Math.floor(Math.random() * 3) + 1);
          inventory[stolenResource] -= amount;
          message += ` Украдено ${amount} ${stolenResource}`;
        }
        break;
        
      case 1: // Повреждение оборудования
        if (upgrades.mining > 0 && Math.random() < 0.3) {
          upgrades.mining--;
          message += " Повреждена система добычи! Уровень понижен";
          severeAttack = true;
        }
        break;
        
      case 2: // Вандализм
        if (inventory['Мусор'] > 0) {
          const destroyed = Math.min(inventory['Мусор'], Math.floor(Math.random() * 5) + 3);
          inventory['Мусор'] -= destroyed;
          message += ` Уничтожено ${destroyed} мусора`;
        }
        break;
        
      case 3: // Поломка турелей
        if (upgrades.defense && Math.random() < 0.2) {
          upgrades.defense = false;
          message += " Туррели защиты сломаны!";
          severeAttack = true;
        }
        break;
        
      case 4: // Взлом ИИ (редкий)
        if (Math.random() < 0.1) {
          aiDisabledUntil = Date.now() + 300000; // 5 минут
          message += " Взлом ИИ! Система неактивна 5 минут";
          severeAttack = true;
        }
        break;
    }
    
    log(message);
    
    // Увеличиваем активность повстанцев
    rebelActivity += severeAttack ? 2 : 1;
    
    // Снижаем уровень защиты после серьезных атак
    if (severeAttack && upgrades.defenseLevel > 0 && Math.random() < 0.5) {
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
    log('Угольная ТЭЦ отключена');
  } else {
    if (inventory['Уголь'] > 0) {
      inventory['Уголь']--;
      coalEnabled = true;
      log('Угольная ТЭЦ активирована (-1 уголь)');
      
      // Проверка задания на активацию ТЭЦ
      if (currentQuestIndex < storyQuests.length && 
          storyQuests[currentQuestIndex].type === 'activate_coal') {
        checkQuestsProgress();
      }
    } else {
      log('Нет угля для активации!');
    }
  }
  saveGame();
  render();
}

function mineResources() {
  const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
  if (!aiActive) {
    log('❌ ИИ неактивен! Нужна энергия');
    return;
  }
  
  let coalChance = 0.02 + (coalEnabled ? 0.02 : 0) + (upgrades.mining * 0.01);
  let trashChance = 0.01 + (coalEnabled ? 0.01 : 0) + (upgrades.mining * 0.01);
  let chipChance = 0.005;
  let plasmaChance = 0.003;
  const isCritical = Math.random() < 0.05;

  let foundSomething = false;

  if (Math.random() < coalChance) {
    const amount = isCritical ? 2 : 1;
    inventory['Уголь'] += amount;
    criticalMining = isCritical;
    
    log(`Найден${amount > 1 ? 'о' : ''} ${amount} угля 🪨${isCritical ? ' ✨' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  if (Math.random() < trashChance) {
    inventory['Мусор']++;
    log('Найден мусор ♻️');
    foundSomething = true;
    totalMined++;
  }
  
  if (Math.random() < chipChance) {
    inventory['Чипы']++;
    criticalMining = true;
    log('Найден чип 🎛️✨');
    foundSomething = true;
    totalMined++;
  }
  
  if (Math.random() < plasmaChance) {
    inventory['Плазма']++;
    criticalMining = true;
    log('Найдена плазма ⚡✨');
    foundSomething = true;
    totalMined++;
  }
  
  // Проверка заданий на добычу
  if (foundSomething && currentQuestIndex < storyQuests.length) {
    checkQuestsProgress();
  }
  
  saveGame();
  render();
}

function upgradeMining() {
  if (upgrades.mining < 10 && inventory['Чипы'] >= 5) {
    inventory['Чипы'] -= 5;
    upgrades.mining++;
    
    log(`Улучшена добыча! Теперь +${upgrades.mining}% к шансам`);
    
    // Проверка задания на апгрейд
    if (currentQuestIndex < storyQuests.length && 
        storyQuests[currentQuestIndex].type === 'upgrade_mining') {
      checkQuestsProgress();
    }
    
    saveGame();
    render();
  }
}

function activateDefense() {
  if (!upgrades.defense && inventory['Плазма'] >= 3) {
    inventory['Плазма'] -= 3;
    upgrades.defense = true;
    
    log('Активированы туррели защиты! (-3 плазмы)');
    
    // Проверка задания на активацию защиты
    if (currentQuestIndex < storyQuests.length && 
        storyQuests[currentQuestIndex].type === 'activate_defense') {
      checkQuestsProgress();
    }
    
    saveGame();
    render();
  }
}

function upgradeDefense() {
  if (upgrades.defenseLevel < 5 && 
      inventory['Чипы'] >= (upgrades.defenseLevel + 1) * 10 && 
      inventory['Плазма'] >= 1) {
    const chipsCost = (upgrades.defenseLevel + 1) * 10;
    inventory['Чипы'] -= chipsCost;
    inventory['Плазма'] -= 1;
    upgrades.defenseLevel++;
    
    log(`Улучшена защита до уровня ${upgrades.defenseLevel}! (-${chipsCost} чипов и -1 плазмы)`);
    saveGame();
    render();
  }
}