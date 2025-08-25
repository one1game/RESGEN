function showStoryMessage(questId) {
  const messages = {
    intro: "Система оживает! Первые ресурсы добыты. CoreBox начинает восстановление.",
    power_up: "ТЭЦ активирована! Теперь ИИ будет работать и ночью. Но помните - каждую ночь требуется уголь.",
    first_night: "Первая ночь пережита. Датчики фиксируют активность повстанцев в периметре.",
    mining_upgrade: "Система добычи улучшена. Анализ показывает аномалии в плазменных месторождениях.",
    plasma_discovery: "Плазма обнаружена! Это ключ к восстановлению ядра CoreBox.",
    defense_activate: "Защитные турели активированы. Теперь у повстанцев будет меньше шансов.",
    rebel_defense: "Атаки отражены! Повстанцы отступают. Осталось восстановить ядро системы.",
    core_restore: "CoreBox полностью восстановлен! Плазменное ядро запущено. Поздравляем!"
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
    
    // Переходим к следующему заданию
    currentQuestIndex++;
    saveGame();
    render();
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
      isCompleted = inventory[quest.resource] >= quest.target;
      break;
      
    case 'activate_defense':
      isCompleted = upgrades.defense;
      break;
      
    case 'defend_attacks':
      isCompleted = successfulDefenses >= quest.target;
      break;
  }
  
  if (isCompleted) {
    completeCurrentQuest();
  }
}