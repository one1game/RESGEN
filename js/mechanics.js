// ======== mechanics.js ========
function calculateTrashPrice() {
  const basePrice = GameConfig.ECONOMY.TRASH.BASE_PRICE;
  const priceDrop = Math.floor(trashSold / 8) * GameConfig.ECONOMY.TRASH.PRICE_DROP;
  return Math.round(Math.max(basePrice - priceDrop, GameConfig.ECONOMY.TRASH.MIN_PRICE));
}

function handleRebelAttack() {
  const attackTypes = [];
  
  if (Object.keys(inventory).filter(k => k !== 'ИИ' && (inventory[k] || 0) > 0).length > 0) {
      attackTypes.push(0);
  }
  if (upgrades.mining > 0) {
      attackTypes.push(1);
  }
  if ((inventory['Мусор'] || 0) > 0 && trashUnlocked) {
      attackTypes.push(2);
  }
  if (upgrades.defense) {
      attackTypes.push(3);
  }
  attackTypes.push(4);
  
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
                  Math.floor(Math.random() * (GameConfig.REBELS.STEAL_AMOUNT.max - upgrades.defenseLevel * 0.5)) + GameConfig.REBELS.STEAL_AMOUNT.min);
              inventory[stolenResource] -= amount;
              message += ` Украдено ${amount} ${stolenResource}`;
          }
          break;
          
      case 1:
          if (upgrades.mining > 0 && Math.random() < GameConfig.REBELS.ATTACK_CHANCES.DAMAGE_MINING) {
              const levelsLost = Math.random() < 0.2 ? 2 : 1;
              upgrades.mining = Math.max(0, upgrades.mining - levelsLost);
              message += ` Повреждена система добычи! Уровень понижен на ${levelsLost}`;
              severeAttack = levelsLost > 1;
          }
          break;
          
      case 2:
          if ((inventory['Мусор'] || 0) > 0 && trashUnlocked) {
              const destroyPercentage = GameConfig.REBELS.DESTROY_PERCENT.min + Math.random() * (GameConfig.REBELS.DESTROY_PERCENT.max - GameConfig.REBELS.DESTROY_PERCENT.min);
              const destroyed = Math.floor((inventory['Мусор'] || 0) * destroyPercentage);
              inventory['Мусор'] -= destroyed;
              message += ` Уничтожено ${destroyed} мусора (${Math.round(destroyPercentage * 100)}%)`;
          }
          break;
          
      case 3:
          if (upgrades.defense && Math.random() < GameConfig.REBELS.ATTACK_CHANCES.DISABLE_DEFENSE) {
              upgrades.defense = false;
              message += " Туррели защиты выведены из строя!";
              severeAttack = true;
          }
          break;
          
      case 4:
          if (Math.random() < GameConfig.REBELS.ATTACK_CHANCES.HACK_AI) {
              const disableTime = GameConfig.REBELS.AI_DISABLE_TIME.base + (GameConfig.REBELS.AI_DISABLE_TIME.bonus * (1 - upgrades.defenseLevel * 0.2));
              aiDisabledUntil = Date.now() + disableTime;
              const minutes = Math.ceil(disableTime / 60000);
              message += ` Взлом ИИ! Система неактивна ${minutes} минут`;
              severeAttack = true;
          }
          break;
  }
  
  rebelActivity += severeAttack ? GameConfig.REBELS.SEVERE_ATTACK_BONUS : GameConfig.REBELS.ACTIVITY_INCREASE;
  
  if (severeAttack && upgrades.defenseLevel > 0 && Math.random() < GameConfig.DEFENSE.REFLECT_CHANCE) {
      upgrades.defenseLevel--;
      log("⚠️ Уровень защиты понижен из-за атаки повстанцев");
  }
  
  log(message);
  saveGame();
}

function handleCoalInteraction() {
  if (coalEnabled) {
      coalEnabled = false;
      log('⚡ Угольная ТЭЦ отключена');
  } else {
      if ((inventory['Уголь'] || 0) > 0) {
          inventory['Уголь']--;
          coalEnabled = true;
          log('⚡ Угольная ТЭЦ активирована (-1 уголь)');
          
          if (currentQuestIndex < StoryQuests.length && 
              StoryQuests[currentQuestIndex].type === 'activate_coal') {
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
  
  let coalChance = GameConfig.MINING.BASE_CHANCES.COAL + (coalEnabled ? GameConfig.MINING.COAL_BONUS : 0) + (upgrades.mining * GameConfig.MINING.UPGRADE_BONUS);
  let trashChance = GameConfig.MINING.BASE_CHANCES.TRASH + (coalEnabled ? 0.008 : 0) + (upgrades.mining * 0.005);
  let chipChance = chipsUnlocked ? (GameConfig.MINING.BASE_CHANCES.CHIPS + (upgrades.mining * 0.001)) : 0;
  let plasmaChance = plasmaUnlocked ? (GameConfig.MINING.BASE_CHANCES.PLASMA + (upgrades.mining * 0.002)) : 0;
  
  const isCritical = Math.random() < (GameConfig.MINING.CRITICAL_CHANCE + upgrades.mining * GameConfig.MINING.CRITICAL_UPGRADE_BONUS);
  let foundSomething = false;
  let criticalBonus = isCritical ? GameConfig.MINING.CRITICAL_MULTIPLIER - 1 : 0;

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
  
  if (criticalMining) {
      criticalMining = false;
  }
  
  if (foundSomething && currentQuestIndex < StoryQuests.length) {
      checkQuestsProgress();
  }
  
  saveGame();
  render();
}

function upgradeMining() {
  const requiredChips = GameConfig.UPGRADES.MINING.BASE_COST + upgrades.mining * GameConfig.UPGRADES.MINING.COST_MULTIPLIER;
  if (upgrades.mining < GameConfig.UPGRADES.MINING.MAX_LEVEL && (inventory['Чипы'] || 0) >= requiredChips) {
      inventory['Чипы'] -= requiredChips;
      upgrades.mining++;
      
      log(`🚀 Улучшена добыча до уровня ${upgrades.mining}! (-${requiredChips} чипов)`);
      log(`💫 Теперь +${upgrades.mining}% к шансам добычи`);
      
      if (currentQuestIndex < StoryQuests.length && 
          StoryQuests[currentQuestIndex].type === 'upgrade_mining') {
          checkQuestsProgress();
      }
      
      saveGame();
      render();
  } else if (upgrades.mining >= GameConfig.UPGRADES.MINING.MAX_LEVEL) {
      log('✅ Добыча уже максимально улучшена!');
  } else {
      log(`❌ Недостаточно чипов (нужно ${requiredChips})`);
  }
}

function activateDefense() {
  if (!upgrades.defense && (inventory['Плазма'] || 0) >= GameConfig.DEFENSE.ACTIVATION_COST) {
      inventory['Плазма'] -= GameConfig.DEFENSE.ACTIVATION_COST;
      upgrades.defense = true;
      
      log('🛡️ Система защиты активирована! (-3 плазмы)');
      log('✅ Теперь туррели будут отражать атаки повстанцев');
      
      if (currentQuestIndex < StoryQuests.length && 
          StoryQuests[currentQuestIndex].type === 'activate_defense') {
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
  const requiredChips = (upgrades.defenseLevel + 1) * GameConfig.DEFENSE.CHIPS_MULTIPLIER;
  const requiredPlasma = GameConfig.DEFENSE.PLASMA_BASE + Math.floor(upgrades.defenseLevel / 2);
  
  if (upgrades.defenseLevel < GameConfig.DEFENSE.MAX_LEVEL && 
      (inventory['Чипы'] || 0) >= requiredChips && 
      (inventory['Плазма'] || 0) >= requiredPlasma) {
      
      inventory['Чипы'] -= requiredChips;
      inventory['Плазма'] -= requiredPlasma;
      upgrades.defenseLevel++;
      
      const defensePower = GameConfig.DEFENSE.BASE_POWER + (upgrades.defenseLevel * GameConfig.DEFENSE.LEVEL_BONUS);
      log(`🛡️ Улучшена защита до уровня ${upgrades.defenseLevel}!`);
      log(`📊 Мощность защиты: ${defensePower}%`);
      log(`💸 Стоимость: -${requiredChips} чипов, -${requiredPlasma} плазмы`);
      
      saveGame();
      render();
  } else if (upgrades.defenseLevel >= GameConfig.DEFENSE.MAX_LEVEL) {
      log('✅ Защита уже максимального уровня!');
  } else {
      log(`❌ Недостаточно ресурсов (чипы: ${requiredChips}, плазма: ${requiredPlasma})`);
  }
}