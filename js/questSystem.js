// ======== quest-system.js ========
function showStoryMessage(questId) {
  const messages = {
      awakening: "Система оживает! Первые ресурсы добыты. CoreBox начинает восстановление.",
      power_restoration: "Энергосеть усилена! Пассивная добыча теперь эффективнее.",
      chips_discovery: "Технологические чипы обнаружены! Теперь можно улучшать системы добычи.",
      plasma_breakthrough: "Плазма обнаружена! Это ключ к восстановлению ядра CoreBox.",
      defense_activation: "Защитные турели активированы. Теперь у повстанцев будет меньше шансов.",
      ai_evolution: "ИИ достиг нового уровня! Все системы работают на максимуме.",
      final_preparations: "Ядро готово к запуску. Остались последние приготовления...",
      great_awakening: "CoreBox полностью восстановлен! Плазменное ядро запущено. Поздравляем!"
  };
  
  if (messages[questId]) {
      log(`💬 ${messages[questId]}`);
      voiceAlerts.alertSystem(messages[questId]);
  }
}

function completeCurrentQuest() {
  if (currentQuestIndex >= StoryQuests.length) return;
  
  const quest = StoryQuests[currentQuestIndex];
  if (quest && !quest.completed) {
      quest.completed = true;
      tng += quest.reward;
      log(`✅ Задание "${quest.title}" выполнено! +${quest.reward}₸`);
      showStoryMessage(quest.id);
      
      // РЕАЛЬНЫЙ БОНУС за восстановление энергосети (СОХРАНЯЕТСЯ)
      if (quest.id === 'power_restoration') {
          passiveMiningBonus.coal += 0.002;    // +0.2% к углю
          passiveMiningBonus.trash += 0.003;   // +0.3% к мусору
          log('⚡ Пассивная добыча улучшена! Уголь +0.2%, Мусор +0.3%');
          voiceAlerts.alertSystem('Пассивная добыча улучшена');
      }
      
      questProgress = {
          totalMined: 0,
          nightsWithCoal: 0,
          successfulDefenses: 0,
          resourcesMined: {}
      };
      
      currentQuestIndex++;
      updateResourceUnlocks();
      saveGame();
      render();
  }
}

function checkQuestsProgress() {
  if (currentQuestIndex >= StoryQuests.length) return;
  
  const quest = StoryQuests[currentQuestIndex];
  if (!quest || quest.completed) return;
  
  let isCompleted = false;
  
  switch(quest.type) {
      case 'mine_any':
          isCompleted = questProgress.totalMined >= quest.target;
          break;
          
      case 'activate_coal':
          isCompleted = coalEnabled;
          break;
          
      case 'survive_night':
          isCompleted = questProgress.nightsWithCoal >= quest.target;
          break;
          
      case 'upgrade_mining':
          isCompleted = upgrades.mining >= quest.target;
          break;
          
      case 'mine_resource':
          const resourceCount = Number(inventory[quest.resource]) || 0;
          isCompleted = resourceCount >= quest.target;
          break;
          
      case 'activate_defense':
          isCompleted = upgrades.defense;
          break;
          
      case 'defend_attacks':
          isCompleted = questProgress.successfulDefenses >= quest.target;
          break;
          
      case 'upgrade_all':
          isCompleted = checkUpgradeAllQuest();
          break;
          
      case 'final_activation':
          isCompleted = checkFinalActivationQuest();
          break;
  }
  
  if (isCompleted) {
      completeCurrentQuest();
  }
}

function checkUpgradeAllQuest() {
  return upgrades.mining >= 10 && upgrades.defenseLevel >= 5;
}

function checkFinalActivationQuest() {
  return (inventory['Плазма'] || 0) >= 15 && upgrades.defenseLevel >= 5;
}