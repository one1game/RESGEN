// ======== save-manager.js ========
function saveGame() {
  const saveData = {
      inventory,
      tng,
      coalEnabled,
      gameTime,
      isDay,
      passiveCounter,
      trashSold,
      upgrades,
      autoScrollEnabled,
      rebelActivity,
      lastUpdateTime: Date.now(),
      nightsSurvived,
      successfulDefenses,
      coalProduced,
      totalMined,
      aiDisabledUntil,
      nightsWithCoal,
      currentQuestIndex,
      questProgress,
      coalUnlocked,
      trashUnlocked,
      chipsUnlocked,
      plasmaUnlocked,
      passiveMiningBonus,  // ← СОХРАНЯЕМ БОНУСЫ
      storyQuests: StoryQuests.map(quest => ({
          id: quest.id,
          completed: quest.completed
      })),
      collapsedState
  };
  
  try {
      localStorage.setItem(GameConfig.STORAGE_KEY, JSON.stringify(saveData));
  } catch (e) {
      console.error('Ошибка сохранения игры', e);
  }
}

function loadGame() {
  const saved = localStorage.getItem(GameConfig.STORAGE_KEY);
  if (saved) {
      try {
          const data = JSON.parse(saved);
          
          if (data.inventory) {
              Object.keys(data.inventory).forEach(key => {
                  inventory[key] = data.inventory[key];
              });
          }
          
          sanitizeInventory();
          
          tng = data.tng ?? 0;
          coalEnabled = data.coalEnabled ?? false;
          gameTime = data.gameTime ?? GameConfig.CYCLE_DURATION / 2;
          isDay = data.isDay ?? true;
          passiveCounter = data.passiveCounter ?? 0;
          trashSold = data.trashSold ?? 0;
          upgrades.mining = data.upgrades?.mining ?? 0;
          upgrades.defense = data.upgrades?.defense ?? false;
          upgrades.defenseLevel = data.upgrades?.defenseLevel ?? 0;
          autoScrollEnabled = data.autoScrollEnabled ?? true;
          rebelActivity = data.rebelActivity ?? 0;
          lastUpdateTime = data.lastUpdateTime ?? Date.now();
          nightsSurvived = data.nightsSurvived ?? 0;
          successfulDefenses = data.successfulDefenses ?? 0;
          coalProduced = data.coalProduced ?? 0;
          totalMined = data.totalMined ?? 0;
          aiDisabledUntil = data.aiDisabledUntil ?? 0;
          nightsWithCoal = data.nightsWithCoal ?? 0;
          currentQuestIndex = data.currentQuestIndex ?? 0;
          questProgress = data.questProgress ?? {
              totalMined: 0,
              nightsWithCoal: 0,
              successfulDefenses: 0,
              resourcesMined: {}
          };
          
          // ЗАГРУЖАЕМ БОНУСЫ
          passiveMiningBonus = data.passiveMiningBonus ?? {
              coal: 0,
              trash: 0,
              chips: 0,
              plasma: 0
          };
          
          // ИСПРАВЛЕНО: ВЫЗЫВАЕМ авторазблокировку ПОСЛЕ загрузки currentQuestIndex
          updateResourceUnlocks();
          
          if (data.storyQuests) {
              data.storyQuests.forEach((savedQuest, index) => {
                  if (StoryQuests[index]) {
                      StoryQuests[index].completed = savedQuest.completed ?? false;
                  }
              });
          }
          
          if (data.collapsedState) {
              Object.assign(collapsedState, data.collapsedState);
          }
          
          log('Игра загружена');
      } catch (e) {
          console.error('Ошибка загрузки сохранения', e);
          log('Ошибка загрузки сохранения');
      }
  } else {
      sanitizeInventory();
  }
}

function resetGame() {
  if (confirm('Начать новую игру? Весь прогресс будет потерян.')) {
      localStorage.removeItem(GameConfig.STORAGE_KEY);
      location.reload();
  }
}