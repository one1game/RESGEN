// ======== mechanics.js ========

// Вспомогательные функции
function calculateTrashPrice() {
  const basePrice = 2;
  const priceDrop = Math.floor(trashSold / 8) * 0.03;
  return Math.round(Math.max(basePrice - priceDrop, 1));
}

function handleRebelAttack() {
  const defensePower = upgrades.defense ? 30 + (upgrades.defenseLevel * 15) : 0;
  const threatLevel = Math.min(1, rebelActivity * 0.15);
  
  const attackChance = threatLevel * (1 - defensePower / 100);
  
  if (Math.random() < attackChance) {
    const attackTypes = [];
    
    // Более серьезные атаки
    if (Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0).length > 0) {
      attackTypes.push(0, 0); // Удваиваем шанс кражи ресурсов
    }
    if (upgrades.mining > 0) {
      attackTypes.push(1, 1); // Удваиваем шанс повреждения добычи
    }
    if (inventory['Мусор'] > 0 && trashUnlocked) {
      attackTypes.push(2);
    }
    if (upgrades.defense) {
      attackTypes.push(3, 3); // Удваиваем шанс повреждения защиты
    }
    attackTypes.push(4, 4); // Удваиваем шанс взлома ИИ
    
    if (attackTypes.length === 0) return;
    
    const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
    let message = "🌙 Повстанцы атаковали!";
    let severeAttack = false;
    let resourceLoss = 0;
    
    switch(attackType) {
      case 0:
        const resources = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
        if (resources.length > 0) {
          const stolenResource = resources[Math.floor(Math.random() * resources.length)];
          // Увеличиваем кражу ресурсов
          const amount = Math.min(inventory[stolenResource], 
            Math.floor(Math.random() * (6 - upgrades.defenseLevel)) + 2);
          inventory[stolenResource] -= amount;
          resourceLoss = amount;
          message += ` Украдено ${amount} ${stolenResource}`;
          severeAttack = amount > 3;
        }
        break;
        
      case 1:
        if (upgrades.mining > 0) {
          // Увеличиваем шанс повреждения
          const levelsLost = Math.random() < 0.3 ? 2 : 1;
          upgrades.mining = Math.max(0, upgrades.mining - levelsLost);
          message += ` Повреждена система добычи! Уровень понижен на ${levelsLost}`;
          severeAttack = levelsLost > 1;
          
          // Временное снижение эффективности
          if (Math.random() < 0.5) {
            const penaltyTime = 120000; // 2 минуты
            log("⚠️ Временное снижение эффективности добычи на 2 минуты");
            // Можно добавить флаг временного штрафа
          }
        }
        break;
        
      case 2:
        if (inventory['Мусор'] > 0 && trashUnlocked) {
          // Увеличиваем уничтожение мусора
          const destroyPercentage = 0.4 + Math.random() * 0.4;
          const destroyed = Math.floor(inventory['Мусор'] * destroyPercentage);
          inventory['Мусор'] -= destroyed;
          resourceLoss = destroyed;
          message += ` Уничтожено ${destroyed} мусора (${Math.round(destroyPercentage * 100)}%)`;
          severeAttack = destroyPercentage > 0.6;
        }
        break;
        
      case 3:
        if (upgrades.defense) {
          // Увеличиваем шанс повреждения защиты
          if (Math.random() < 0.4) {
            upgrades.defense = false;
            message += " Туррели защиты выведены из строя!";
            severeAttack = true;
            
            // Временное отключение на 1 ночь
            log("⚠️ Система защиты будет восстановлена только утром");
          }
        }
        break;
        
      case 4:
        // Увеличиваем шанс и длительность взлома
        if (Math.random() < 0.15) {
          const disableTime = 240000 + (180000 * (1 - upgrades.defenseLevel * 0.15));
          aiDisabledUntil = Date.now() + disableTime;
          const minutes = Math.ceil(disableTime / 60000);
          message += ` Взлом ИИ! Система неактивна ${minutes} минут`;
          severeAttack = true;
          
          // Дополнительный штраф - потеря случайного ресурса
          if (Math.random() < 0.5) {
            const resources = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
            if (resources.length > 0) {
              const stolenResource = resources[Math.floor(Math.random() * resources.length)];
              const amount = Math.min(inventory[stolenResource], 3);
              inventory[stolenResource] -= amount;
              log(`💥 Взлом привел к потере ${amount} ${stolenResource}`);
            }
          }
        }
        break;
    }
    
    log(message);
    
    // Увеличиваем активность повстанцев после успешной атаки
    rebelActivity += severeAttack ? 3 : 2;
    
    if (severeAttack && upgrades.defenseLevel > 0 && Math.random() < 0.7) {
      upgrades.defenseLevel--;
      log("⚠️ Уровень защиты понижен из-за серьезной атаки повстанцев");
    }
    
    // Мини-ивент: усиление повстанцев после нескольких атак
    if (rebelActivity >= 5 && Math.random() < 0.3) {
      log("🚨 Повстанцы усиливают активность! Будьте осторожны!");
      rebelActivity += 2;
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
  
  // Чипы доступны только после квеста chips_discovery
  let chipChance = 0;
  const chipsQuest = storyQuests.find(q => q.id === 'chips_discovery');
  if (chipsQuest && chipsQuest.completed) {
    chipChance = 0.004 + (upgrades.mining * 0.001);
  }
  
  // Плазма доступна только после квеста plasma_breakthrough
  let plasmaChance = 0;
  const plasmaQuest = storyQuests.find(q => q.id === 'plasma_breakthrough');
  if (plasmaQuest && plasmaQuest.completed) {
    plasmaChance = 0.002 + (upgrades.mining * 0.0005);
    
    // Бонус после завершения квеста
    if (plasmaQuest.completed) {
      plasmaChance += 0.001;
    }
  }
  
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
    
    const wasEmpty = (inventory['Уголь'] || 0) === 0;
    inventory['Уголь'] += amount;
    
    if (wasEmpty) {
      log('✨ Уголь добавлен в инвентарь!');
    }
    
    log(`🪨 Найден${amount > 1 ? 'о' : ''} ${amount} угля${isCritical ? ' ✨КРИТ!' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  if (Math.random() < trashChance) {
    const amount = 1 + criticalBonus;
    if (!trashUnlocked) {
      trashUnlocked = true;
      inventory['Мусор'] = 0;
      log('♻️ Обнаружены залежи перерабатываемых материалов!');
    }
    
    const wasEmpty = (inventory['Мусор'] || 0) === 0;
    inventory['Мусор'] += amount;
    
    if (wasEmpty) {
      log('✨ Мусор добавлен в инвентарь!');
    }
    
    log(`♻️ Найден${amount > 1 ? 'о' : ''} ${amount} мусора${isCritical ? ' ✨' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  // Добыча чипов только после квеста
  if (chipsQuest && chipsQuest.completed && Math.random() < chipChance) {
    const amount = 1 + criticalBonus;
    if (!chipsUnlocked) {
      chipsUnlocked = true;
      inventory['Чипы'] = 0;
      log('🎛️ Обнаружены технологические чипы!');
    }
    
    const wasEmpty = (inventory['Чипы'] || 0) === 0;
    inventory['Чипы'] += amount;
    
    if (wasEmpty) {
      log('✨ Чипы добавлены в инвентарь!');
    }
    
    log(`🎛️ Найден${amount > 1 ? 'о' : ''} ${amount} чип${amount > 1 ? 'ов' : ''}${isCritical ? ' ✨' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  // Добыча плазмы только после квеста
  if (plasmaQuest && plasmaQuest.completed && Math.random() < plasmaChance) {
    const amount = 1 + criticalBonus;
    if (!plasmaUnlocked) {
      plasmaUnlocked = true;
      inventory['Плазма'] = 0;
      log('⚡ Обнаружена плазма!');
    }
    
    const wasEmpty = (inventory['Плазма'] || 0) === 0;
    inventory['Плазма'] += amount;
    
    if (wasEmpty) {
      log('✨ Плазма добавлена в инвентарь!');
    }
    
    log(`⚡ Найден${amount > 1 ? 'о' : ''} ${amount} плазм${amount > 1 ? 'ы' : 'а'}${isCritical ? ' ✨' : ''}`);
    foundSomething = true;
    totalMined += amount;
  }
  
  if (!foundSomething && aiActive) {
    log('⏳ Добыча... Ресурсы не найдены');
  }
  
  if (foundSomething && currentQuestIndex < storyQuests.length) {
    checkQuestsProgress();
  }
  
  saveGame();
  render();
}

function upgradeMining() {
  const requiredChips = 5 + upgrades.mining * 2;
  if (upgrades.mining < 10 && inventory['Чипы'] >= requiredChips) {
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
  if (!upgrades.defense && inventory['Плазма'] >= 3) {
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

// Функция для мини-ивентов повстанцев (добавить в gameLoop)
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
      }
    ];
    
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    randomEvent();
    saveGame();
  }
}
