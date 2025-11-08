// ======== saveManager.js ========
let lastCloudSave = 0;

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
        // Локальное сохранение
        localStorage.setItem(GameConfig.STORAGE_KEY, JSON.stringify(saveData));
        
        // Облачное сохранение (не чаще чем раз в 10 секунд)
        const now = Date.now();
        if (window.cloudSaveManagerCore && cloudSaveManagerCore.isOnline && 
            now - lastCloudSave > 10000) {
            
            lastCloudSave = now;
            cloudSaveManagerCore.saveGame(saveData).then(success => {
                if (success) {
                    console.log('💾 Игра сохранена в облако');
                }
            });
        }
    } catch (e) {
        console.error('Ошибка сохранения игры', e);
    }
}

async function loadGame() {
    // Сначала пробуем загрузить из облака (если нет локального сохранения)
    let cloudData = null;
    const localSave = localStorage.getItem(GameConfig.STORAGE_KEY);
    
    if (!localSave && window.cloudSaveManagerCore && cloudSaveManagerCore.isOnline) {
        cloudData = await cloudSaveManagerCore.loadGame();
        if (cloudData) {
            console.log('🔄 Загружаем из облака...');
        }
    }
    
    const saved = localSave || cloudData;
    const data = saved ? (cloudData || JSON.parse(localSave)) : null;
    
    if (data) {
        try {
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
            
            if (cloudData) {
                log('🔄 Игра загружена из облака');
                voiceAlerts.alertSystem('Игра загружена из облака');
            } else {
                log('Игра загружена');
            }
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
        
        // Также удаляем из облака
        if (window.cloudSaveManagerCore && cloudSaveManagerCore.isOnline) {
            // Можно добавить функцию удаления из облака если нужно
            console.log('Cloud save reset');
        }
        
        location.reload();
    }
}

// Новая функция для принудительной синхронизации с облаком
async function syncWithCloud() {
    if (window.cloudSaveManagerCore && cloudSaveManagerCore.isOnline) {
        const success = await cloudSaveManagerCore.saveGame(getSaveData());
        if (success) {
            log('✅ Синхронизация с облаком завершена');
            return true;
        }
    }
    return false;
}

// Вспомогательная функция для получения данных сохранения
function getSaveData() {
    return {
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
        passiveMiningBonus,
        storyQuests: StoryQuests.map(quest => ({
            id: quest.id,
            completed: quest.completed
        })),
        collapsedState
    };
}