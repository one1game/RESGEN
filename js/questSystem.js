// ======== questSystem.js ========

const storyQuests = [
  {
      id: 'awakening',
      title: 'Пробуждение системы',
      type: 'mine_any',
      target: 5,
      reward: 50,
      description: 'Добудьте первые ресурсы для запуска системы',
      flavorText: 'CoreBox начинает проявлять признаки жизни...',
      specialEffect: 'Система добычи активирована',
      completed: false
  },
  {
      id: 'power_restoration', 
      title: 'Восстановление энергии',
      type: 'activate_coal',
      target: 1,
      reward: 100,
      description: 'Активируйте угольную ТЭЦ для работы ночью',
      flavorText: 'ТЭЦ гудит, подавая энергию в системы...',
      specialEffect: 'Ночная добыча теперь возможна',
      completed: false
  },
  {
      id: 'chips_discovery',
      title: 'Технологические чипы',
      type: 'mine_resource', 
      target: 3,
      resource: 'Чипы',
      reward: 150,
      description: 'Найдите технологические чипы для улучшений',
      flavorText: 'Обнаружены древние технологии...',
      specialEffect: 'Чипы разблокированы для улучшений',
      completed: false
  },
  {
      id: 'plasma_breakthrough',
      title: 'Плазменный прорыв',
      type: 'mine_resource',
      target: 5, 
      resource: 'Плазма',
      reward: 200,
      description: 'Соберите плазму для восстановления ядра',
      flavorText: 'Плазменные потоки пронизывают систему...',
      specialEffect: 'Плазма разблокирована для защиты',
      completed: false
  },
  {
      id: 'defense_activation',
      title: 'Активация защиты',
      type: 'activate_defense',
      target: 1,
      reward: 250,
      description: 'Активируйте систему защиты от повстанцев',
      flavorText: 'Турели защиты заряжаются...',
      specialEffect: 'Защита от атак повстанцев',
      completed: false
  },
  {
      id: 'ai_evolution', 
      title: 'Эволюция ИИ',
      type: 'upgrade_all',
      target: 1,
      reward: 400,
      description: 'Максимально улучшите все системы',
      flavorText: 'ИИ достигает нового уровня сознания...',
      specialEffect: 'Все системы работают на максимуме',
      completed: false
  },
  {
      id: 'great_awakening',
      title: 'Великое пробуждение',
      type: 'final_activation',
      target: 15,
      reward: 1000,
      description: 'Запустите плазменное ядро CoreBox',
      flavorText: 'CoreBox полностью восстановлен! Система готова...',
      specialEffect: 'Миссия завершена!',
      completed: false
  }
];

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
      }
      
      // Сбросить прогресс для следующего задания
      questProgress = {
          totalMined: 0,
          nightsWithCoal: 0, 
          successfulDefenses: 0,
          resourcesMined: {}
      };
      
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