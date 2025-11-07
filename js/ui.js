// ======== ui.js ========
const currencyDisplay = document.getElementById('currencyDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const defenseDisplay = document.getElementById('defenseDisplay');
const logBox = document.getElementById('logBox');
const inventoryDiv = document.getElementById('inventory');
const aiStatusText = document.getElementById('aiStatusText');
const coalStatus = document.getElementById('coalStatus');
const rebelStatus = document.getElementById('rebelStatus');
const miningBonusSpan = document.getElementById('miningBonus');
const miningLevel = document.getElementById('miningLevel');
const miningProgress = document.getElementById('miningProgress');
const upgradeMiningBtn = document.getElementById('upgradeMiningBtn');
const defenseStatus = document.getElementById('defenseStatus');
const upgradeDefenseBtn = document.getElementById('upgradeDefenseBtn');
const defenseLevel = document.getElementById('defenseLevel');
const upgradeDefenseLevelBtn = document.getElementById('upgradeDefenseLevelBtn');
const miningChipsReq = document.getElementById('miningChipsReq');
const defensePlasmaReq = document.getElementById('defensePlasmaReq');
const defenseChipsReq = document.getElementById('defenseChipsReq');
const defensePlasmaLevelReq = document.getElementById('defensePlasmaLevelReq');
const clearLogBtn = document.getElementById('clearLogBtn');
const autoScrollBtn = document.getElementById('autoScrollBtn');
const questsContainer = document.getElementById('questsContainer');
const buyItemsContainer = document.getElementById('buyItemsContainer');
const sellItemsContainer = document.getElementById('sellItemsContainer');
const buyModeBtn = document.getElementById('buyModeBtn');
const sellModeBtn = document.getElementById('sellModeBtn');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const collapseButtons = document.querySelectorAll('.panel-title');

// Голосовые контролы
const toggleVoiceBtn = document.getElementById('toggleVoiceBtn');
const voiceVolume = document.getElementById('voiceVolume');
const voiceRate = document.getElementById('voiceRate');
const volumeValue = document.getElementById('volumeValue');
const rateValue = document.getElementById('rateValue');

function log(message) {
    if (!logBox) return;
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `> ${message}`;
    logBox.appendChild(entry);
    
    if (autoScrollEnabled) {
        logBox.scrollTop = logBox.scrollHeight;
    }
}

function updateTimeDisplay() {
    if (!timeDisplay) return;
    const icon = isDay ? '☀️' : '🌙';
    timeDisplay.textContent = `${isDay ? 'День' : 'Ночь'} ${icon} (${Math.ceil(gameTime)}s)`;
}

function updateCurrencyDisplay() {
    if (!currencyDisplay) return;
    currencyDisplay.textContent = `${Math.round(tng)}₸`;
}

function updateDefenseDisplay() {
    if (!defenseDisplay) return;
    const defensePower = upgrades.defense ? GameConfig.DEFENSE.BASE_POWER + (upgrades.defenseLevel * GameConfig.DEFENSE.LEVEL_BONUS) : 0;
    defenseDisplay.textContent = `${defensePower}%`;
}

function render() {
    miningBonusSpan.textContent = `+${upgrades.mining}%`;
    miningLevel.textContent = upgrades.mining;
    miningProgress.style.width = `${upgrades.mining * 10}%`;

    coalStatus.textContent = coalEnabled ? 'Активно' : 'Выкл';
    coalStatus.style.color = coalEnabled ? '#00cc66' : '#ff3333';
    defenseStatus.textContent = upgrades.defense ? 'Активно' : 'Выкл';
    defenseLevel.textContent = `Ур. ${upgrades.defenseLevel}/${GameConfig.DEFENSE.MAX_LEVEL}`;

    let rebelText = 'Низкий';
    let rebelColor = '#00cc66';
    if (rebelActivity > 2) {
        rebelText = 'Высокий';
        rebelColor = '#ff3333';
    } else if (rebelActivity > 0) {
        rebelText = 'Средний';
        rebelColor = '#ffcc00';
    }
    rebelStatus.textContent = rebelText;
    rebelStatus.style.color = rebelColor;

    const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
    aiStatusText.textContent = aiActive ? 'Активен' : 'Неактивен';
    aiStatusText.style.color = aiActive ? '#00cc66' : '#ff3333';

    updateCurrencyDisplay();
    updateDefenseDisplay();
    updateTimeDisplay();

    const requiredChipsMining = GameConfig.UPGRADES.MINING.BASE_COST + upgrades.mining * GameConfig.UPGRADES.MINING.COST_MULTIPLIER;
    const requiredChipsDefense = (upgrades.defenseLevel + 1) * GameConfig.DEFENSE.CHIPS_MULTIPLIER;
    const requiredPlasmaDefense = GameConfig.DEFENSE.PLASMA_BASE + Math.floor(upgrades.defenseLevel / 2);

    const chipsCount = Number(inventory['Чипы']) || 0;
    const plasmaCount = Number(inventory['Плазма']) || 0;

    upgradeMiningBtn.disabled = upgrades.mining >= GameConfig.UPGRADES.MINING.MAX_LEVEL || chipsCount < requiredChipsMining;
    upgradeDefenseBtn.disabled = upgrades.defense || plasmaCount < GameConfig.DEFENSE.ACTIVATION_COST;
    upgradeDefenseLevelBtn.disabled = upgrades.defenseLevel >= GameConfig.DEFENSE.MAX_LEVEL || chipsCount < requiredChipsDefense || plasmaCount < requiredPlasmaDefense;

    miningChipsReq.textContent = `${chipsCount}/${requiredChipsMining}`;
    miningChipsReq.className = chipsCount >= requiredChipsMining ? 'requirement-value requirement-met' : 'requirement-value requirement-not-met';

    defensePlasmaReq.textContent = `${plasmaCount}/${GameConfig.DEFENSE.ACTIVATION_COST}`;
    defensePlasmaReq.className = plasmaCount >= GameConfig.DEFENSE.ACTIVATION_COST ? 'requirement-value requirement-met' : 'requirement-value requirement-not-met';

    defenseChipsReq.textContent = `${chipsCount}/${requiredChipsDefense}`;
    defenseChipsReq.className = chipsCount >= requiredChipsDefense ? 'requirement-value requirement-met' : 'requirement-value requirement-not-met';

    defensePlasmaLevelReq.textContent = `${plasmaCount}/${requiredPlasmaDefense}`;
    defensePlasmaLevelReq.className = plasmaCount >= requiredPlasmaDefense ? 'requirement-value requirement-met' : 'requirement-value requirement-not-met';

    autoScrollBtn.textContent = autoScrollEnabled ? 'Автоскролл ✓' : 'Автоскролл';

    // Отрисовка инвентаря
    inventoryDiv.innerHTML = '';

    const resourceOrder = GameConfig.RESOURCES.ORDER;
    let filledSlots = 0;

    resourceOrder.forEach(resourceName => {
        if (filledSlots >= GameConfig.MAX_SLOTS) return;

        let isUnlocked = false;
        let resourceCount = 0;

        switch (resourceName) {
            case 'Уголь':
                isUnlocked = coalUnlocked;
                resourceCount = Number(inventory['Уголь']) || 0;
                break;
            case 'Мусор':
                isUnlocked = trashUnlocked;
                resourceCount = Number(inventory['Мусор']) || 0;
                break;
            case 'Чипы':
                isUnlocked = chipsUnlocked;
                resourceCount = Number(inventory['Чипы']) || 0;
                break;
            case 'Плазма':
                isUnlocked = plasmaUnlocked;
                resourceCount = Number(inventory['Плазма']) || 0;
                break;
        }

        if (!isUnlocked || resourceCount <= 0) return;

        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.resource = resourceName;

        if (resourceName === 'Плазма') slot.classList.add('plasma');

        const nameDiv = document.createElement('div');
        nameDiv.className = 'item-name';
        nameDiv.textContent = resourceName;

        const countDiv = document.createElement('div');
        countDiv.className = 'item-count';
        countDiv.textContent = `x${resourceCount}`;

        slot.appendChild(nameDiv);
        slot.appendChild(countDiv);

        if (resourceName === 'Уголь' || resourceName === 'Мусор') {
            const bonusDiv = document.createElement('div');
            bonusDiv.className = 'mining-bonus';
            const baseChance = resourceName === 'Уголь' ? 3 : 1.5;
            const totalBonus = upgrades.mining + (coalEnabled ? (resourceName === 'Уголь' ? 2 : 1) : 0);
            bonusDiv.textContent = `+${Math.round(baseChance + totalBonus)}%`;
            slot.appendChild(bonusDiv);
        }

        if (resourceName === 'Уголь') {
            if (coalEnabled) {
                slot.style.borderColor = 'var(--primary)';
                slot.style.boxShadow = '0 0 8px var(--primary)';
            }
            slot.onclick = () => handleCoalInteraction();
        }

        if (criticalMining && (resourceName === 'Уголь' || resourceName === 'Плазма')) {
            slot.classList.add('critical');
        }

        inventoryDiv.appendChild(slot);
        filledSlots++;
    });

    while (filledSlots < GameConfig.MAX_SLOTS) {
        const slot = document.createElement('div');
        slot.className = 'slot empty';
        slot.innerHTML = `
            <div class="item-name">[Пусто]</div>
            <div class="item-count">+</div>
        `;
        inventoryDiv.appendChild(slot);
        filledSlots++;
    }

    renderQuests();
    renderTrade();
    applyCollapsedState();
    updateVoiceControls();
}

function updateVoiceControls() {
    if (toggleVoiceBtn) {
        toggleVoiceBtn.textContent = voiceAlerts.enabled ? 'Выключить голос' : 'Включить голос';
    }
    if (volumeValue) {
        volumeValue.textContent = `${Math.round(voiceAlerts.volume * 100)}%`;
    }
    if (rateValue) {
        rateValue.textContent = `${Math.round(voiceAlerts.rate * 100)}%`;
    }
}

function updateFloatingButton() {
    const miningBonusFloat = document.getElementById('miningBonusFloat');
    const miningBonus = document.getElementById('miningBonus');
    
    if (miningBonusFloat && miningBonus) {
        miningBonusFloat.textContent = miningBonus.textContent;
    }
}

function renderQuests() {
    if (!questsContainer) return;
    
    questsContainer.innerHTML = '';
    
    if (currentQuestIndex >= StoryQuests.length) {
        questsContainer.innerHTML = `
            <div class="quest-card">
                <div class="quest-header">
                    <div class="quest-title">Миссия выполнена!</div>
                </div>
                <div class="quest-description">
                    Вы полностью восстановили работу CoreBox! Система функционирует в штатном режиме.
                </div>
            </div>
        `;
        return;
    }
    
    const quest = StoryQuests[currentQuestIndex];
    if (!quest) return;
    
    let progressText = '';
    let progressPercent = 0;
    
    switch(quest.type) {
        case 'mine_any':
            progressText = `Добыто: ${questProgress.totalMined}/${quest.target}`;
            progressPercent = Math.min(100, (questProgress.totalMined / quest.target) * 100);
            break;
            
        case 'activate_coal':
            progressText = coalEnabled ? 'ТЭЦ активна' : 'ТЭЦ неактивна';
            progressPercent = coalEnabled ? 100 : 0;
            break;
            
        case 'survive_night':
            progressText = `Ночей: ${questProgress.nightsWithCoal}/${quest.target}`;
            progressPercent = Math.min(100, (questProgress.nightsWithCoal / quest.target) * 100);
            break;
            
        case 'upgrade_mining':
            progressText = `Уровень: ${upgrades.mining}/${quest.target}`;
            progressPercent = Math.min(100, (upgrades.mining / quest.target) * 100);
            break;
            
        case 'mine_resource':
            const resourceCount = Number(inventory[quest.resource]) || 0;
            progressText = `${quest.resource}: ${resourceCount}/${quest.target}`;
            progressPercent = Math.min(100, (resourceCount / quest.target) * 100);
            break;
            
        case 'activate_defense':
            progressText = upgrades.defense ? 'Защита активна' : 'Защита неактивна';
            progressPercent = upgrades.defense ? 100 : 0;
            break;
            
        case 'defend_attacks':
            progressText = `Защит: ${questProgress.successfulDefenses}/${quest.target}`;
            progressPercent = Math.min(100, (questProgress.successfulDefenses / quest.target) * 100);
            break;
    }
    
    const questCard = document.createElement('div');
    questCard.className = 'quest-card';
    
    let questHTML = `
        <div class="quest-header">
            <div class="quest-title">${quest.title}</div>
            <div class="quest-reward">${quest.reward}₸</div>
        </div>
        ${progressPercent > 0 ? `
            <div class="progress-container">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        ` : ''}
        <div class="quest-description">
            ${quest.description}<br>
            ${progressText}
        </div>
    `;
    
    if (quest.flavorText) {
        questHTML += `
            <div class="quest-flavor">
                ${quest.flavorText}
            </div>
        `;
    }
    
    if (quest.specialEffect) {
        questHTML += `
            <div class="quest-effect">
                ⚡ ${quest.specialEffect}
            </div>
        `;
    }
    
    questCard.innerHTML = questHTML;
    questsContainer.appendChild(questCard);
}

function renderTrade() {
  if (typeof console !== 'undefined') {
    console.log('Торговля - товары:', Object.keys(GameConfig.ECONOMY.TRADE));
    console.log('Торговля - разблокировки:', {coalUnlocked, chipsUnlocked, plasmaUnlocked});
}
    if (!buyItemsContainer || !sellItemsContainer) return;
    
    buyItemsContainer.innerHTML = '';
    sellItemsContainer.innerHTML = '';
    
    Object.entries(GameConfig.ECONOMY.TRADE).forEach(([itemName, item]) => {
      const isUnlocked = (
          (itemName === 'Уголь' && coalUnlocked) ||
          (itemName === 'Чипы' && chipsUnlocked) ||
          (itemName === 'Плазма' && plasmaUnlocked)
      );
      
      if (!isUnlocked) return;
      
      const buyItemElement = document.createElement('div');
      buyItemElement.className = 'trade-item';
      buyItemElement.innerHTML = `
          <div class="trade-item-name">${itemName}</div>
          <div class="trade-item-price">${item.buy}₸</div>
          <div class="trade-item-amount">В инвентаре: ${inventory[itemName] || 0}</div>
      `;
      
      buyItemElement.addEventListener('click', () => {
          const price = item.buy;
          if (tng >= price) {
              tng -= price;
              inventory[itemName] = (inventory[itemName] || 0) + 1;
              
              log(`Куплен 1 ${itemName} за ${price}₸`);
              voiceAlerts.alertSystem(`Куплен ${itemName}`);
              updateCurrencyDisplay();
              saveGame();
              render();
              checkQuestsProgress();
          } else {
              log(`Недостаточно средств для покупки ${itemName}`);
              voiceAlerts.alertSystem(`Недостаточно средств для покупки ${itemName}`, true);
          }
      });
      
      buyItemsContainer.appendChild(buyItemElement);
  });
    
    Object.entries(inventory).forEach(([itemName, count]) => {
        if (itemName === 'ИИ' || (count || 0) <= 0) return;
        
        const isUnlocked = (
            (itemName === 'Уголь' && coalUnlocked) ||
            (itemName === 'Мусор' && trashUnlocked) ||
            (itemName === 'Чипы' && chipsUnlocked) ||
            (itemName === 'Плазма' && plasmaUnlocked)
        );
        
        if (!isUnlocked) return;
        
        const sellItemElement = document.createElement('div');
        sellItemElement.className = 'trade-item';
        
        let price;
        if (itemName === 'Мусор') {
            price = calculateTrashPrice();
        } else {
            price = GameConfig.ECONOMY.TRADE[itemName]?.sell || 1;
        }
        
        sellItemElement.innerHTML = `
            <div class="trade-item-name">${itemName}</div>
            <div class="trade-item-price">${price}₸</div>
            <div class="trade-item-amount">${count} шт.</div>
        `;
        
        sellItemElement.addEventListener('click', () => {
            if ((inventory[itemName] || 0) > 0) {
                inventory[itemName]--;
                tng += price;
                if (itemName === 'Мусор') trashSold++;
                
                log(`Продан 1 ${itemName} за ${price}₸`);
                voiceAlerts.alertSystem(`Продан ${itemName}`);
                updateCurrencyDisplay();
                saveGame();
                render();
                checkQuestsProgress();
            }
        });
        
        sellItemsContainer.appendChild(sellItemElement);
    });
}

function applyCollapsedState() {
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        const titleElement = panel.querySelector('.panel-title span:first-child');
        if (!titleElement) return;
        
        const title = titleElement.textContent;
        
        if (title.includes('Состояние') && collapsedState.statusPanel) {
            panel.classList.add('collapsed');
        } else if (title.includes('журнал') && collapsedState.logPanel) {
            panel.classList.add('collapsed');
        } else if (title.includes('Инвентарь') && collapsedState.inventoryPanel) {
            panel.classList.add('collapsed');
        } else if (title.includes('апгрейды') && collapsedState.upgradesPanel) {
            panel.classList.add('collapsed');
        } else if (title.includes('Торговля') && collapsedState.tradePanel) {
            panel.classList.add('collapsed');
        } else if (title.includes('Задания') && collapsedState.questsPanel) {
            panel.classList.add('collapsed');
        }
    });
}

function clearLog() {
    if (!logBox) return;
    logBox.innerHTML = '';
    log('Журнал очищен');
}

function toggleAutoScroll() {
    autoScrollEnabled = !autoScrollEnabled;
    if (autoScrollEnabled && logBox) {
        logBox.scrollTop = logBox.scrollHeight;
    }
    saveGame();
    render();
}

function toggleCollapse(panel) {
    const titleElement = panel.querySelector('.panel-title span:first-child');
    if (!titleElement) return;
    
    const title = titleElement.textContent;
    
    if (title.includes('Состояние')) {
        collapsedState.statusPanel = !collapsedState.statusPanel;
    } else if (title.includes('журнал')) {
        collapsedState.logPanel = !collapsedState.logPanel;
    } else if (title.includes('Инвентарь')) {
        collapsedState.inventoryPanel = !collapsedState.inventoryPanel;
    } else if (title.includes('апгрейды')) {
        collapsedState.upgradesPanel = !collapsedState.upgradesPanel;
    } else if (title.includes('Торговля')) {
        collapsedState.tradePanel = !collapsedState.tradePanel;
    } else if (title.includes('Задания')) {
        collapsedState.questsPanel = !collapsedState.questsPanel;
    }
    
    panel.classList.toggle('collapsed');
    saveGame();
}

function switchTab(tabName) {
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tabContent = document.getElementById(`${tabName}-tab`);
    const tabElement = document.querySelector(`.tab[data-tab="${tabName}"]`);
    
    if (tabContent) tabContent.classList.add('active');
    if (tabElement) tabElement.classList.add('active');
}

function toggleBuySellMode(isBuyMode) {
    if (buyModeBtn) buyModeBtn.classList.toggle('active', isBuyMode);
    if (sellModeBtn) sellModeBtn.classList.toggle('active', !isBuyMode);
    if (buyItemsContainer) buyItemsContainer.style.display = isBuyMode ? 'grid' : 'none';
    if (sellItemsContainer) sellItemsContainer.style.display = isBuyMode ? 'none' : 'grid';
}

function initFloatingButton() {
    const floatingBtn = document.getElementById('floatingMineBtn');
    
    if (!floatingBtn) return;
    
    floatingBtn.addEventListener('click', function() {
        this.classList.add('active');
        mineResources();
        
        setTimeout(() => {
            this.classList.remove('active');
        }, 500);
    });
    
    updateFloatingButton();
}

function initVoiceControls() {
    if (toggleVoiceBtn) {
        toggleVoiceBtn.addEventListener('click', () => {
            voiceAlerts.toggleEnabled();
            updateVoiceControls();
            log(voiceAlerts.enabled ? 'Голосовые оповещения включены' : 'Голосовые оповещения выключены');
        });
    }
    
    if (voiceVolume) {
        voiceVolume.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            voiceAlerts.setVolume(volume);
            updateVoiceControls();
        });
    }
    
    if (voiceRate) {
        voiceRate.addEventListener('input', (e) => {
            const rate = e.target.value / 100;
            voiceAlerts.setRate(rate);
            updateVoiceControls();
        });
    }
}