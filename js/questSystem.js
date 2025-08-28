// ======== questSystem.js ========

function showStoryMessage(questId) {
  const messages = {
    awakening: "Система оживает! Первые ресурсы добыты. CoreBox начинает восстановление.",
    power_restoration: "ТЭЦ активирована! Теперь ИИ будет работать и ночью. Но помните - каждую ночь требуется уголь.",
    chips_discovery: "Технологические чипы обнаружены! Теперь можно улучшать системы добычи.",
    plasma_breakthrough: "Плазма обнаружена! Это ключ к восстановлению ядра CoreBox.",
    defense_activation: "Защитные турели активированы. Теперь у повстанцев будет меньше шансов.",
    ai_evolution: "ИИ достиг нового уровня! Все системы работают на максимуме.",
    final_preparations: "Ядро готово к запуску. Остались последние приготовления...",
    great_awakening: "CoreBox полностью восстановлен! Плазменное ядро запущено. Поздравляем!"
  };
  
  if (messages[questId]) {
    log(`💬 ${messages[questId]}`);
  }
}

function completeCurrentQuest() {
  if (currentQuestIndex >= storyQuests.length) return;
  
  const quest = storyQuests[currentQuestIndex];
  if (quest && !quest.completed) {
    quest.completed = true;
    tng += quest.reward;
    log(`✅ Задание "${quest.title}" выполнено! +${quest.reward}₸`);
    showStoryMessage(quest.id);
    
    // Разблокируем ресурсы после соответствующих заданий
    if (quest.id === 'chips_discovery') {
      chipsUnlocked = true;
      inventory['Чипы'] = 0;
      log('🎛️ Технологические чипы теперь доступны для добычи!');
      log('💫 Теперь есть шанс находить чипы при добыче ресурсов');
    }
    
    if (quest.id === 'plasma_breakthrough') {
      plasmaUnlocked = true;
      inventory['Плазма'] = 0;
      log('⚡ Плазма теперь доступна для добычи!');
      log('💫 После изучения плазмы шанс ее добычи увеличился!');
      log('🔬 Исследование плазмы завершено - эффективность добычи повышена!');
    }
    
    // Применяем специальные эффекты квестов
    applyQuestSpecialEffects(quest.id);
    
    currentQuestIndex++;
    saveGame();
    render();
  }
}

// Применение специальных эффектов квестов
function applyQuestSpecialEffects(questId) {
  switch(questId) {
    case 'power_restoration':
      log('⚡ +10% к шансу добычи угля активировано!');
      break;
      
    case 'defense_activation':
      log('🛡️ Повстанцы теперь атакуют реже, но с большей силой!');
      break;
      
    case 'ai_evolution':
      log('🚀 Все системы теперь работают на 20% эффективнее!');
      break;
      
    case 'final_preparations':
      log('⭐ Постоянный бонус ко всем ресурсам активирован!');
      break;
  }
}

function checkQuestsProgress() {
  if (currentQuestIndex >= storyQuests.length) return;
  
  const quest = storyQuests[currentQuestIndex];
  if (!quest || quest.completed) return;
  
  let isCompleted = false;
  
  switch(quest.type) {
    case 'mine_any':
      isCompleted = totalMined >= quest.target;
      if (isCompleted) {
        log(`📊 Прогресс: добыто ${totalMined}/${quest.target} ресурсов`);
      }
      break;
      
    case 'activate_coal':
      isCompleted = coalEnabled;
      if (isCompleted) {
        log('⚡ ТЭЦ успешно активирована!');
      }
      break;
      
    case 'survive_night':
      isCompleted = nightsWithCoal >= quest.target;
      if (isCompleted) {
        log(`🌙 Пережито ${nightsWithCoal}/${quest.target} ночей с энергией`);
      } else {
        log(`🌙 Прогресс: ${nightsWithCoal}/${quest.target} ночей`);
      }
      break;
      
    case 'upgrade_mining':
      isCompleted = upgrades.mining >= quest.target;
      if (isCompleted) {
        log(`⚙️ Добыча улучшена до уровня ${upgrades.mining}/${quest.target}`);
      } else {
        log(`⚙️ Прогресс: уровень ${upgrades.mining}/${quest.target}`);
      }
      break;
      
    case 'mine_resource':
      // Безопасная проверка для ресурсов
      const resourceCount = Number(inventory[quest.resource]) || 0;
      isCompleted = resourceCount >= quest.target;
      if (isCompleted) {
        log(`✅ Набрано достаточно ${quest.resource}: ${resourceCount}/${quest.target}`);
      } else {
        log(`📦 Прогресс ${quest.resource}: ${resourceCount}/${quest.target}`);
      }
      break;
      
    case 'activate_defense':
      isCompleted = upgrades.defense;
      if (isCompleted) {
        log('🛡️ Система защиты активирована!');
      }
      break;
      
    case 'defend_attacks':
      isCompleted = successfulDefenses >= quest.target;
      if (isCompleted) {
        log(`✅ Отражено ${successfulDefenses}/${quest.target} атак`);
      } else {
        log(`🛡️ Прогресс защиты: ${successfulDefenses}/${quest.target}`);
      }
      break;
      
    case 'upgrade_all':
      isCompleted = checkUpgradeAllQuest();
      if (isCompleted) {
        log('🚀 Все системы максимально улучшены!');
      } else {
        const miningProgress = upgrades.mining >= 10 ? '✅' : `⏳ ${upgrades.mining}/10`;
        const defenseProgress = upgrades.defenseLevel >= 5 ? '✅' : `⏳ ${upgrades.defenseLevel}/5`;
        log(`📊 Прогресс улучшений: Добыча ${miningProgress}, Защита ${defenseProgress}`);
      }
      break;
      
    case 'final_activation':
      const plasmaCount = Number(inventory['Плазма']) || 0;
      const defenseReady = upgrades.defenseLevel >= 5;
      isCompleted = plasmaCount >= quest.target && defenseReady;
      
      if (isCompleted) {
        log('✅ Готово к финальной активации!');
      } else {
        let progressMessage = `📊 Прогресс: Плазма ${plasmaCount}/${quest.target}`;
        if (!defenseReady) {
          progressMessage += `, Защита ${upgrades.defenseLevel}/5`;
        }
        log(progressMessage);
      }
      break;
  }
  
  if (isCompleted) {
    completeCurrentQuest();
  }
}

// Проверка улучшения всех систем
function checkUpgradeAllQuest() {
  return upgrades.mining >= 10 && upgrades.defenseLevel >= 5;
}

// Проверка финальной активации
function checkFinalActivationQuest() {
  const plasmaCount = Number(inventory['Плазма']) || 0;
  return plasmaCount >= 10 && upgrades.defenseLevel >= 5;
}

// Автоматическая разблокировка ресурсов при их наличии (на случай загрузки сохранения)
function autoUnlockResources() {
  if ((inventory['Уголь'] || 0) > 0) coalUnlocked = true;
  if ((inventory['Мусор'] || 0) > 0) trashUnlocked = true;
  
  // Чипы и плазма разблокируются только через квесты
  const chipsQuest = storyQuests.find(q => q.id === 'chips_discovery');
  const plasmaQuest = storyQuests.find(q => q.id === 'plasma_breakthrough');
  
  if (chipsQuest && chipsQuest.completed && (inventory['Чипы'] || 0) > 0) {
    chipsUnlocked = true;
  }
  
  if (plasmaQuest && plasmaQuest.completed && (inventory['Плазма'] || 0) > 0) {
    plasmaUnlocked = true;
  }
}

// Функция для проверки статуса всех квестов (для отладки)
function checkAllQuestsStatus() {
  storyQuests.forEach((quest, index) => {
    let status = quest.completed ? '✅' : '❌';
    if (index === currentQuestIndex) status = '🚀';
    console.log(`${status} ${quest.title} - ${quest.completed ? 'Завершен' : 'Активен'}`);
  });
}

// Функция для принудительного завершения текущего квеста (для тестирования)
function completeCurrentQuestDebug() {
  if (currentQuestIndex < storyQuests.length) {
    const quest = storyQuests[currentQuestIndex];
    quest.completed = true;
    tng += quest.reward;
    log(`[DEBUG] Задание "${quest.title}" принудительно завершено!`);
    
    // Принудительно разблокируем ресурсы если это соответствующий квест
    if (quest.id === 'chips_discovery') {
      chipsUnlocked = true;
      inventory['Чипы'] = 0;
    }
    if (quest.id === 'plasma_breakthrough') {
      plasmaUnlocked = true;
      inventory['Плазма'] = 0;
    }
    
    currentQuestIndex++;
    saveGame();
    render();
  }
}