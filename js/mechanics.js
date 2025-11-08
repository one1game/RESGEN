// ======== mechanics.js ========
function calculateTrashPrice() {
    const basePrice = GameConfig.ECONOMY.TRASH.BASE_PRICE;
    const priceDrop = Math.floor(trashSold / GameConfig.ECONOMY.TRASH.PRICE_DROP_PER) * GameConfig.ECONOMY.TRASH.PRICE_DROP_AMOUNT;
    return Math.round(Math.max(basePrice - priceDrop, GameConfig.ECONOMY.TRASH.MIN_PRICE));
  }
  
  function handleRebelAttack() {
    const attackTypes = [];
    
    if (Object.keys(inventory).some(k => k !== 'ИИ' && inventory[k] > 0)) attackTypes.push(0);
    if (upgrades.mining > 0) attackTypes.push(1);
    if (inventory['Мусор'] > 0 && trashUnlocked) attackTypes.push(2);
    if (upgrades.defense) attackTypes.push(3);
    attackTypes.push(4);
    
    if (attackTypes.length === 0) return;
    
    const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
    let message = "🌙 Повстанцы атаковали!";
    let severeAttack = false;
    
    switch(attackType) {
      case 0:
        const resources = Object.keys(inventory).filter(k => k !== 'ИИ' && inventory[k] > 0);
        if (resources.length > 0) {
          const stolenResource = resources[Math.floor(Math.random() * resources.length)];
          const amount = Math.min(inventory[stolenResource], 
            Math.floor(Math.random() * (GameConfig.REBELS.STEAL_AMOUNT.max - GameConfig.REBELS.STEAL_AMOUNT.min + 1)) + GameConfig.REBELS.STEAL_AMOUNT.min);
          inventory[stolenResource] -= amount;
          message += ` Украдено ${amount} ${stolenResource}`;
          voiceAlerts.alertRebelAttack('steal', { resource: stolenResource, amount });
        }
        break;
        
      case 1:
        if (Math.random() < GameConfig.REBELS.ATTACK_CHANCES.DAMAGE_MINING) {
          const levelsLost = Math.random() < 0.2 ? 2 : 1;
          upgrades.mining = Math.max(0, upgrades.mining - levelsLost);
          message += ` Повреждена система добычи! Уровень понижен на ${levelsLost}`;
          voiceAlerts.alertRebelAttack('damage');
          severeAttack = levelsLost > 1;
        }
        break;
        
      case 2:
        const destroyPercentage = GameConfig.REBELS.DESTROY_PERCENT.min + 
          Math.random() * (GameConfig.REBELS.DESTROY_PERCENT.max - GameConfig.REBELS.DESTROY_PERCENT.min);
        const destroyed = Math.floor(inventory['Мусор'] * destroyPercentage);
        inventory['Мусор'] -= destroyed;
        message += ` Уничтожено ${destroyed} мусора (${Math.round(destroyPercentage * 100)}%)`;
        voiceAlerts.alertRebelAttack('destroy', { amount: destroyed });
        break;
        
      case 3:
        if (Math.random() < GameConfig.REBELS.ATTACK_CHANCES.DISABLE_DEFENSE) {
          upgrades.defense = false;
          message += " Туррели защиты выведены из строя!";
          voiceAlerts.alertRebelAttack('disable');
          severeAttack = true;
        }
        break;
        
      case 4:
        if (Math.random() < GameConfig.REBELS.ATTACK_CHANCES.HACK_AI) {
          const disableTime = GameConfig.REBELS.AI_DISABLE_TIME.min + 
            Math.random() * (GameConfig.REBELS.AI_DISABLE_TIME.max - GameConfig.REBELS.AI_DISABLE_TIME.min);
          aiDisabledUntil = Date.now() + disableTime;
          const minutes = Math.ceil(disableTime / 60000);
          message += ` Взлом ИИ! Система неактивна ${minutes} минут`;
          voiceAlerts.alertRebelAttack('hack', { minutes });
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
      voiceAlerts.alertSystem('Угольная ТЭЦ отключена');
    } else {
      if (inventory['Уголь'] > 0) {
        inventory['Уголь']--;
        coalEnabled = true;
        log('⚡ Угольная ТЭЦ активирована (-1 уголь)');
        voiceAlerts.alertSystem('Угольная ТЭЦ активирована');
        
        if (currentQuestIndex < StoryQuests.length && 
            StoryQuests[currentQuestIndex].type === 'activate_coal') {
          checkQuestsProgress();
        }
      } else {
        log('❌ Нет угля для активации ТЭЦ!');
        voiceAlerts.alertSystem('Нет угля для активации ТЭЦ', true);
      }
    }
    saveGame();
    render();
  }
  
  function mineResources() {
    const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
    if (!aiActive) {
      log('❌ ИИ неактивен! Нужна энергия для добычи');
      voiceAlerts.alertSystem('ИИ неактивен! Нужна энергия', true);
      return;
    }
    
    let coalChance = GameConfig.MINING.BASE_CHANCES.COAL + 
      (coalEnabled ? GameConfig.MINING.BONUSES.COAL_ENABLED : 0) + 
      (upgrades.mining * GameConfig.MINING.BONUSES.COAL_LEVEL_MULTIPLIER);
      
    let trashChance = GameConfig.MINING.BASE_CHANCES.TRASH + 
      (coalEnabled ? GameConfig.MINING.BONUSES.TRASH_ENABLED : 0) + 
      (upgrades.mining * GameConfig.MINING.BONUSES.TRASH_LEVEL_MULTIPLIER);
      
    let chipChance = chipsUnlocked ? 
      (GameConfig.MINING.BASE_CHANCES.CHIPS + (upgrades.mining * GameConfig.MINING.BONUSES.CHIPS_LEVEL_MULTIPLIER)) : 0;
      
    let plasmaChance = plasmaUnlocked ? 
      (GameConfig.MINING.BASE_CHANCES.PLASMA + (upgrades.mining * GameConfig.MINING.BONUSES.PLASMA_LEVEL_MULTIPLIER)) : 0;
    
    const isCritical = Math.random() < (GameConfig.MINING.CRITICAL.CHANCE + upgrades.mining * GameConfig.MINING.CRITICAL.PER_LEVEL);
    let foundSomething = false;
    let criticalBonus = isCritical ? GameConfig.MINING.CRITICAL.MULTIPLIER - 1 : 0;
  
    const tryMineResource = (resource, chance, unlocked) => {
      if (!unlocked || Math.random() >= chance) return false;
      
      const amount = 1 + criticalBonus;
      inventory[resource] = (inventory[resource] || 0) + amount;
      
      const resourceNames = {
        'Уголь': { single: 'угля', multiple: 'угля' },
        'Мусор': { single: 'мусора', multiple: 'мусора' },
        'Чипы': { single: 'чип', multiple: 'чипов' },
        'Плазма': { single: 'плазма', multiple: 'плазмы' }
      };
      
      const name = amount > 1 ? resourceNames[resource].multiple : resourceNames[resource].single;
      log(`🪨 Найден${amount > 1 ? 'о' : ''} ${amount} ${name}${isCritical ? ' ✨КРИТ!' : ''}`);
      voiceAlerts.alertResourceFound(resource, amount, isCritical);
      
      totalMined += amount;
      questProgress.totalMined += amount;
      return true;
    };
  
    foundSomething = tryMineResource('Уголь', coalChance, coalUnlocked) || foundSomething;
    foundSomething = tryMineResource('Мусор', trashChance, trashUnlocked) || foundSomething;
    foundSomething = tryMineResource('Чипы', chipChance, chipsUnlocked) || foundSomething;
    foundSomething = tryMineResource('Плазма', plasmaChance, plasmaUnlocked) || foundSomething;
    
    if (foundSomething && currentQuestIndex < StoryQuests.length) {
      checkQuestsProgress();
    }
    
    saveGame();
    render();
  }
  
  function upgradeMining() {
    const requiredChips = GameConfig.UPGRADES.MINING.BASE_COST + upgrades.mining * GameConfig.UPGRADES.MINING.COST_MULTIPLIER;
    if (upgrades.mining < GameConfig.UPGRADES.MINING.MAX_LEVEL && inventory['Чипы'] >= requiredChips) {
      inventory['Чипы'] -= requiredChips;
      upgrades.mining++;
      
      log(`🚀 Улучшена добыча до уровня ${upgrades.mining}! (-${requiredChips} чипов)`);
      log(`💫 Теперь +${upgrades.mining}% к шансам добычи`);
      voiceAlerts.alertSystem(`Улучшена добыча до уровня ${upgrades.mining}`);
      
      if (currentQuestIndex < StoryQuests.length && 
          StoryQuests[currentQuestIndex].type === 'upgrade_mining') {
        checkQuestsProgress();
      }
      
      saveGame();
      render();
    } else if (upgrades.mining >= GameConfig.UPGRADES.MINING.MAX_LEVEL) {
      log('✅ Добыча уже максимально улучшена!');
      voiceAlerts.alertSystem('Добыча уже максимально улучшена');
    } else {
      log(`❌ Недостаточно чипов (нужно ${requiredChips})`);
      voiceAlerts.alertSystem(`Недостаточно чипов: нужно ${requiredChips}`, true);
    }
  }
  
  function activateDefense() {
    if (!upgrades.defense && inventory['Плазма'] >= GameConfig.DEFENSE.ACTIVATION_COST) {
      inventory['Плазма'] -= GameConfig.DEFENSE.ACTIVATION_COST;
      upgrades.defense = true;
      
      log('🛡️ Система защиты активирована! (-3 плазмы)');
      log('✅ Теперь туррели будут отражать атаки повстанцев');
      voiceAlerts.alertSystem('Система защиты активирована');
      
      if (currentQuestIndex < StoryQuests.length && 
          StoryQuests[currentQuestIndex].type === 'activate_defense') {
        checkQuestsProgress();
      }
      
      saveGame();
      render();
    } else if (upgrades.defense) {
      log('✅ Защита уже активирована');
      voiceAlerts.alertSystem('Защита уже активирована');
    } else {
      log('❌ Недостаточно плазмы (нужно 3)');
      voiceAlerts.alertSystem('Недостаточно плазмы для активации защиты', true);
    }
  }
  
  function upgradeDefense() {
    const requiredChips = (upgrades.defenseLevel + 1) * GameConfig.DEFENSE.CHIPS_MULTIPLIER;
    const requiredPlasma = GameConfig.DEFENSE.PLASMA_BASE + Math.floor(upgrades.defenseLevel / 2);
    
    if (upgrades.defenseLevel < GameConfig.DEFENSE.MAX_LEVEL && 
        inventory['Чипы'] >= requiredChips && 
        inventory['Плазма'] >= requiredPlasma) {
      
      inventory['Чипы'] -= requiredChips;
      inventory['Плазма'] -= requiredPlasma;
      upgrades.defenseLevel++;
      
      const defensePower = GameConfig.DEFENSE.BASE_POWER + (upgrades.defenseLevel * GameConfig.DEFENSE.PER_LEVEL);
      log(`🛡️ Улучшена защита до уровня ${upgrades.defenseLevel}!`);
      log(`📊 Мощность защиты: ${defensePower}%`);
      log(`💸 Стоимость: -${requiredChips} чипов, -${requiredPlasma} плазмы`);
      voiceAlerts.alertSystem(`Улучшена защита до уровня ${upgrades.defenseLevel}`);
      
      saveGame();
      render();
    } else if (upgrades.defenseLevel >= GameConfig.DEFENSE.MAX_LEVEL) {
      log('✅ Защита уже максимального уровня!');
      voiceAlerts.alertSystem('Защита уже максимального уровня');
    } else {
      log(`❌ Недостаточно ресурсов (чипы: ${requiredChips}, плазма: ${requiredPlasma})`);
      voiceAlerts.alertSystem(`Недостаточно ресурсов для улучшения защиты`, true);
    }
  }