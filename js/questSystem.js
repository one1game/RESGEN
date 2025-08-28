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
    }
    
    if (quest.id === 'plasma_breakthrough') {
      plasmaUnlocked = true;
      inventory['Плазма'] = 0;
      log('⚡ Плазма теперь доступна для добычи!');
      log('💫 После изучения плазмы шанс ее добычи увеличился!');
      
      // Увеличиваем базовый шанс добычи плазмы после квеста
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
      break;
      
    case 'activate_coal':
      isCompleted = coalEnabled;
      break;
      
    case 'survive_night':
      isCompleted = nightsWithCoal >= quest.target;
      break;
      
    case 'upgrade_mining':
      isCompleted = upgrades.mining >= quest.target;
      break;
      
    case 'mine_resource':
      // Безопасная проверка для ресурсов
      const resourceCount = Number(inventory[quest.resource]) || 0;
      isCompleted = resourceCount >= quest.target;
      break;
      
    case 'activate_defense':
      isCompleted = upgrades.defense;
      break;
      
    case 'defend_attacks':
      isCompleted = successfulDefenses >= quest.target;
      break;
      
    case 'upgrade_all':
      isCompleted = checkUpgradeAllQuest();
      break;
      
    case 'final_activation':
      // Безопасная проверка для плазмы
      const plasmaCount = Number(inventory['Плазма']) || 0;
      isCompleted = plasmaCount >= quest.target && upgrades.defenseLevel >= 5;
      break;
  }
  
  if (isCompleted) {
    completeCurrentQuest();
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
    currentQuestIndex++;
    saveGame();
    render();
  }
}