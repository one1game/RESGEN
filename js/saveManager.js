// Система сохранения
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
    coalUnlocked,
    trashUnlocked,
    chipsUnlocked,
    plasmaUnlocked,
    storyQuests,
    collapsedState
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      
      // Загружаем инвентарь
      if (data.inventory) {
        Object.keys(data.inventory).forEach(key => {
          inventory[key] = data.inventory[key];
        });
      }
      
      // Санитизируем инвентарь после загрузки
      sanitizeInventory();
      
      // Загружаем остальные переменные
      tng = data.tng ?? 0;
      coalEnabled = data.coalEnabled ?? false;
      gameTime = data.gameTime ?? CYCLE_DURATION / 2;
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
      
      coalUnlocked = data.coalUnlocked ?? false;
      trashUnlocked = data.trashUnlocked ?? false;
      chipsUnlocked = data.chipsUnlocked ?? false;
      plasmaUnlocked = data.plasmaUnlocked ?? false;
      
      if (data.storyQuests) {
        data.storyQuests.forEach((savedQuest, index) => {
          if (storyQuests[index]) {
            storyQuests[index].completed = savedQuest.completed ?? false;
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
  }
}

function resetGame() {
  if (confirm('Начать новую игру? Все прогресс будет потерян.')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}