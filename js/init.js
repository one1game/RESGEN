// ======== init.js ========
let gameInitialized = false;
let eventListenersInitialized = false;

async function initGame() {
    console.log('🔄 Инициализация игры...');
    
    // Ждем загрузки всех компонентов
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем инициализацию cloudSaveManager
    if (!window.cloudSaveManager) {
        console.error('❌ CloudSaveManager не загружен');
        showAuthInterface();
        return;
    }
    
    // Ждем инициализации cloudSaveManager
    await new Promise(resolve => {
        const checkInit = setInterval(() => {
            if (cloudSaveManager.supabase !== null) {
                clearInterval(checkInit);
                resolve();
            }
        }, 100);
    });
    
    console.log('🔐 Проверка авторизации...', cloudSaveManager.getAuthStatus());
    
    // Проверяем авторизацию
    if (cloudSaveManager.isAuthenticated) {
        console.log('✅ Пользователь авторизован, загружаем игру...');
        await loadGame();
        initEventListeners(); // Инициализируем обработчики после загрузки игры
        setupRadioPlayer();
        showGameInterface();
        startGameLoop();
    } else {
        console.log('❌ Пользователь не авторизован, показываем экран входа');
        showAuthInterface();
    }
    
    log(`Система CoreBox ${GameConfig.VERSION} инициализирована`);
}

function startGameLoop() {
    setInterval(gameLoop, 1000);
    console.log('🎮 Игровой цикл запущен');
}

function gameLoop() {
    if (!gameInitialized) return;
    
    const now = Date.now();
    const secondsPassed = Math.floor((now - lastUpdateTime) / 1000);
    lastUpdateTime = now;
    
    gameTime -= secondsPassed;
    
    while (gameTime <= 0) {
        gameTime += GameConfig.CYCLE_DURATION;
        const wasNight = !isDay;
        isDay = !isDay;
        
        if (wasNight) {
            nightsSurvived++;
            
            if (coalEnabled) {
                nightsWithCoal++;
                questProgress.nightsWithCoal++;
                
                if ((inventory['Уголь'] || 0) > 0) {
                    inventory['Уголь']--;
                    log('🌙 Ночь - сгорел 1 уголь');
                } else {
                    coalEnabled = false;
                    log('🌙 Ночь - уголь закончился, ТЭЦ отключена');
                    voiceAlerts.alertSystem('Уголь закончился, ТЭЦ отключена', true);
                }
            }
            
            const defensePower = upgrades.defense ? GameConfig.DEFENSE.BASE_POWER + (upgrades.defenseLevel * GameConfig.DEFENSE.LEVEL_BONUS) : 0;
            if (Math.random() * 100 > defensePower) {
                handleRebelAttack();
            } else if (upgrades.defense) {
                log('🌙 Система защиты отразила атаку повстанцев');
                voiceAlerts.alertSystem('Защита отразила атаку повстанцев');
                successfulDefenses++;
                questProgress.successfulDefenses++;
            }
            
            if (Math.random() < GameConfig.REBELS.BASE_ATTACK_CHANCE) {
                rebelActivity++;
            }
            
            checkQuestsProgress();
        } else {
            rebelActivity = Math.max(0, rebelActivity - GameConfig.REBELS.ACTIVITY_DECREASE);
        }
        
        log(isDay ? '☀️ Наступил день' : '🌙 Наступила ночь');
        if (isDay) {
            voiceAlerts.alertSystem('Наступил день');
        } else {
            voiceAlerts.alertSystem('Наступила ночь');
        }
        saveGame();
    }

    passiveCounter += secondsPassed;
    while (passiveCounter >= 10) {
        passiveCounter -= 10;
        const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
        if (aiActive) {
            const coalChance = GameConfig.MINING.PASSIVE_CHANCES.COAL + passiveMiningBonus.coal + (upgrades.mining * 0.001);
            const trashChance = GameConfig.MINING.PASSIVE_CHANCES.TRASH + passiveMiningBonus.trash + (upgrades.mining * 0.001);
            const chipChance = GameConfig.MINING.PASSIVE_CHANCES.CHIPS + passiveMiningBonus.chips;
            const plasmaChance = GameConfig.MINING.PASSIVE_CHANCES.PLASMA + passiveMiningBonus.plasma;
            
            if (Math.random() < coalChance) {
                inventory['Уголь'] = (inventory['Уголь'] || 0) + 1;
                totalMined++;
                questProgress.totalMined++;
            }
            if (Math.random() < trashChance) {
                inventory['Мусор'] = (inventory['Мусор'] || 0) + 1;
                totalMined++;
                questProgress.totalMined++;
            }
            if (chipsUnlocked && Math.random() < chipChance) {
                inventory['Чипы'] = (inventory['Чипы'] || 0) + 1;
                totalMined++;
                questProgress.totalMined++;
            }
            if (plasmaUnlocked && Math.random() < plasmaChance) {
                inventory['Плазма'] = (inventory['Плазма'] || 0) + 1;
                totalMined++;
                questProgress.totalMined++;
            }
            
            saveGame();
            checkQuestsProgress();
        }
    }

    if (gameInitialized) {
        render();
    }
}

function initEventListeners() {
    if (eventListenersInitialized) {
        console.log('⚠️ Обработчики событий уже инициализированы');
        return;
    }
    
    console.log('🎯 Инициализация обработчиков событий...');
    
    // Основные кнопки
    const mineBtn = document.getElementById('mineBtn');
    if (mineBtn) {
        mineBtn.addEventListener('click', mineResources);
        console.log('✅ Кнопка добычи инициализирована');
    }
    
    // Кнопки улучшений
    if (upgradeMiningBtn) {
        upgradeMiningBtn.addEventListener('click', upgradeMining);
        console.log('✅ Кнопка улучшения добычи инициализирована');
    }
    if (upgradeDefenseBtn) {
        upgradeDefenseBtn.addEventListener('click', activateDefense);
        console.log('✅ Кнопка активации защиты инициализирована');
    }
    if (upgradeDefenseLevelBtn) {
        upgradeDefenseLevelBtn.addEventListener('click', upgradeDefense);
        console.log('✅ Кнопка улучшения защиты инициализирована');
    }
    
    // Кнопки журнала
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', clearLog);
        console.log('✅ Кнопка очистки журнала инициализирована');
    }
    if (autoScrollBtn) {
        autoScrollBtn.addEventListener('click', toggleAutoScroll);
        console.log('✅ Кнопка автоскролла инициализирована');
    }
    
    // Кнопки торговли
    if (buyModeBtn) {
        buyModeBtn.addEventListener('click', () => toggleBuySellMode(true));
        console.log('✅ Кнопка режима покупки инициализирована');
    }
    if (sellModeBtn) {
        sellModeBtn.addEventListener('click', () => toggleBuySellMode(false));
        console.log('✅ Кнопка режима продажи инициализирована');
    }
    
    // Панели
    document.querySelectorAll('.panel-title').forEach(title => {
        title.addEventListener('click', (e) => {
            if (e.target.classList.contains('collapse-icon')) return;
            const panel = title.closest('.panel');
            if (panel) toggleCollapse(panel);
        });
    });
    console.log('✅ Обработчики панелей инициализированы');
    
    // Вкладки - ОСНОВНАЯ ПРОБЛЕМА БЫЛА ЗДЕСЬ
    const tabs = document.querySelectorAll('.tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                console.log('🎯 Клик по вкладке:', this.dataset.tab);
                switchTab(this.dataset.tab);
            });
        });
        console.log('✅ Обработчики вкладок инициализированы:', tabs.length);
    } else {
        console.error('❌ Вкладки не найдены в DOM');
    }
    
    // Плавающая кнопка
    initFloatingButton();
    
    // Голосовые контролы
    initVoiceControls();
    
    eventListenersInitialized = true;
    console.log('✅ Все обработчики событий инициализированы');
}

// Переинициализация обработчиков при показе игрового интерфейса
function showGameInterface() {
    console.log('🎮 Показываем игровой интерфейс');
    
    // Показываем игровые элементы
    const header = document.querySelector('.header');
    const main = document.querySelector('.main');
    const floatingBtn = document.getElementById('floatingMineBtn');
    
    if (header) header.style.display = 'block';
    if (main) main.style.display = 'flex';
    if (floatingBtn) floatingBtn.style.display = 'flex';
    
    // Скрываем контейнер авторизации
    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
        authContainer.style.display = 'none';
    }
    
    // Переинициализируем обработчики после показа интерфейса
    setTimeout(() => {
        initEventListeners();
        // Рендерим игру
        if (typeof render === 'function') {
            render();
        }
    }, 100);
}

// Помечаем игру как инициализированную когда все готово
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен, начинаем инициализацию игры...');
    gameInitialized = true;
    initGame();
});