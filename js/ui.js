// DOM элементы
const currencyDisplay = document.getElementById('currencyDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const defenseDisplay = document.getElementById('defenseDisplay');
const logBox = document.getElementById('logBox');
const inventoryDiv = document.getElementById('inventory');
const aiStatusText = document.getElementById('aiStatusText');
const coalStatus = document.getElementById('coalStatus');
const rebelStatus = document.getElementById('rebelStatus');
const mineBtn = document.getElementById('mineBtn');
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

function log(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `> ${message}`;
  logBox.appendChild(entry);
  
  if (autoScrollEnabled) {
    logBox.scrollTop = logBox.scrollHeight;
  }
}

function updateTimeDisplay() {
  const icon = isDay ? '☀️' : '🌙';
  timeDisplay.textContent = `${isDay ? 'День' : 'Ночь'} ${icon} (${Math.ceil(gameTime)}s)`;
}

function updateCurrencyDisplay() {
  currencyDisplay.textContent = `${Math.round(tng)}₸`;
}

function updateDefenseDisplay() {
  const defensePower = upgrades.defense ? 30 + (upgrades.defenseLevel * 15) : 0;
  defenseDisplay.textContent = `${defensePower}%`;
}

function render() {
  // Обновляем бонус добычи
  miningBonusSpan.textContent = `+${upgrades.mining}%`;
  miningLevel.textContent = upgrades.mining;
  miningProgress.style.width = `${upgrades.mining * 10}%`;
  
  // Обновляем статусы
  coalStatus.textContent = coalEnabled ? 'Активно' : 'Выкл';
  coalStatus.style.color = coalEnabled ? '#00cc66' : '#ff3333';
  defenseStatus.textContent = upgrades.defense ? 'Активно' : 'Выкл';
  defenseLevel.textContent = `Ур. ${upgrades.defenseLevel}/5`;
  
  // Обновляем статус повстанцев
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
  
  // Обновляем статус ИИ
  const aiActive = (isDay || coalEnabled) && Date.now() > aiDisabledUntil;
  aiStatusText.textContent = aiActive ? 'Активен' : 'Неактивен';
  aiStatusText.style.color = aiActive ? '#00cc66' : '#ff3333';
  
  // Обновляем валюту и защиту
  updateCurrencyDisplay();
  updateDefenseDisplay();
  updateTimeDisplay();
  
  // Обновляем кнопки апгрейдов
  upgradeMiningBtn.disabled = upgrades.mining >= 10 || inventory['Чипы'] < 5;
  upgradeDefenseBtn.disabled = upgrades.defense || inventory['Плазма'] < 3;
  upgradeDefenseLevelBtn.disabled = upgrades.defenseLevel >= 5 || 
    inventory['Чипы'] < (upgrades.defenseLevel + 1) * 10 || 
    inventory['Плазма'] < 1;
  
  // Обновляем требования
  miningChipsReq.textContent = `${inventory['Чипы']}/5`;
  miningChipsReq.className = inventory['Чипы'] >= 5 ? 
    'requirement-value requirement-met' : 'requirement-value requirement-not-met';
  
  defensePlasmaReq.textContent = `${inventory['Плазма']}/3`;
  defensePlasmaReq.className = inventory['Плазма'] >= 3 ? 
    'requirement-value requirement-met' : 'requirement-value requirement-not-met';
  
  defenseChipsReq.textContent = `${inventory['Чипы']}/${(upgrades.defenseLevel + 1) * 10}`;
  defenseChipsReq.className = inventory['Чипы'] >= (upgrades.defenseLevel + 1) * 10 ? 
    'requirement-value requirement-met' : 'requirement-value requirement-not-met';
  
  defensePlasmaLevelReq.textContent = `${inventory['Плазма']}/1`;
  defensePlasmaLevelReq.className = inventory['Плазма'] >= 1 ? 
    'requirement-value requirement-met' : 'requirement-value requirement-not-met';
  
  // Обновляем кнопку автоскролла
  autoScrollBtn.textContent = autoScrollEnabled ? 'Автоскролл ✓' : 'Автоскролл';
  
  // Очищаем инвентарь
  inventoryDiv.innerHTML = '';

  // Отрисовка инвентарь
  Object.entries(inventory).forEach(([name, count]) => {
    if (name === 'ИИ') return;
    
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (name === 'Плазма') slot.classList.add('plasma');
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'item-name';
    nameDiv.textContent = name;
    
    const countDiv = document.createElement('div');
    countDiv.className = 'item-count';
    countDiv.textContent = `x${count}`;
    
    slot.appendChild(nameDiv);
    slot.appendChild(countDiv);

    // Анимация для критической добычи
    if (criticalMining && (name === 'Уголь' || name === 'Плазма')) {
      slot.classList.add('critical');
      criticalMining = false;
    }
    
    // Бонусы добычи
    if (name === 'Уголь' || name === 'Мусор') {
      const bonusDiv = document.createElement('div');
      bonusDiv.className = 'mining-bonus';
      const baseChance = name === 'Уголь' ? 3 : 1.5;
      const totalBonus = upgrades.mining + (coalEnabled ? (name === 'Уголь' ? 2 : 1) : 0);
      bonusDiv.textContent = `+${baseChance + totalBonus}%`;
      slot.appendChild(bonusDiv);
    }

    // Уголь
    if (name === 'Уголь') {
      if (coalEnabled) {
        slot.style.borderColor = 'var(--primary)';
        slot.style.boxShadow = '0 0 8px var(--primary)';
      }
      
      slot.onclick = () => handleCoalInteraction();
    }
    // Плазма для защиты
    else if (name === 'Плазма' && count > 0) {
      slot.classList.add('defense');
    }

    inventoryDiv.appendChild(slot);
  });

  // Заполнение пустых слотов
  while (inventoryDiv.children.length < maxSlots) {
    const slot = document.createElement('div');
    slot.className = 'slot empty';
    slot.innerHTML = '<div class="item-name">[Пусто]</div><div class="item-count">+</div>';
    inventoryDiv.appendChild(slot);
  }
  
  // Отрисовка заданий
  renderQuests();
  
  // Отрисовка торговли
  renderTrade();
  
  // Применяем состояние свернутости
  applyCollapsedState();
}

function renderQuests() {
  questsContainer.innerHTML = '';
  
  if (currentQuestIndex >= storyQuests.length) {
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
  
  const quest = storyQuests[currentQuestIndex];
  if (!quest) return;
  
  let progressText = '';
  let progressPercent = 0;
  
  switch(quest.type) {
    case 'mine_any':
      progressText = `Добыто: ${totalMined}/${quest.target}`;
      progressPercent = Math.min(100, (totalMined / quest.target) * 100);
      break;
      
    case 'activate_coal':
      progressText = coalEnabled ? 'ТЭЦ активна' : 'ТЭЦ неактивна';
      progressPercent = coalEnabled ? 100 : 0;
      break;
      
    case 'survive_night':
      progressText = `Ночей: ${nightsWithCoal}/${quest.target}`;
      progressPercent = Math.min(100, (nightsWithCoal / quest.target) * 100);
      break;
      
    case 'upgrade_mining':
      progressText = `Уровень: ${upgrades.mining}/${quest.target}`;
      progressPercent = Math.min(100, (upgrades.mining / quest.target) * 100);
      break;
      
    case 'mine_resource':
      progressText = `${quest.resource}: ${inventory[quest.resource] || 0}/${quest.target}`;
      progressPercent = Math.min(100, ((inventory[quest.resource] || 0) / quest.target) * 100);
      break;
      
    case 'activate_defense':
      progressText = upgrades.defense ? 'Защита активна' : 'Защита неактивна';
      progressPercent = upgrades.defense ? 100 : 0;
      break;
      
    case 'defend_attacks':
      progressText = `Защит: ${successfulDefenses}/${quest.target}`;
      progressPercent = Math.min(100, (successfulDefenses / quest.target) * 100);
      break;
  }
  
  const questCard = document.createElement('div');
  questCard.className = 'quest-card';
  questCard.innerHTML = `
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
  
  questsContainer.appendChild(questCard);
}

function renderTrade() {
  buyItemsContainer.innerHTML = '';
  sellItemsContainer.innerHTML = '';
  
  // Отрисовка товаров для покупки
  Object.entries(tradeItems).forEach(([itemName, item]) => {
    const buyItemElement = document.createElement('div');
    buyItemElement.className = 'trade-item';
    buyItemElement.innerHTML = `
      <div class="trade-item-name">${itemName}</div>
      <div class="trade-item-price">${item.buyPrice}₸</div>
      <div class="trade-item-amount">В инвентаре: ${inventory[itemName] || 0}</div>
    `;
    
    buyItemElement.addEventListener('click', () => {
      const price = item.buyPrice;
      if (tng >= price) {
        tng -= price;
        inventory[itemName] = (inventory[itemName] || 0) + 1;
        
        log(`Куплен 1 ${itemName} за ${price}₸`);
        updateCurrencyDisplay();
        saveGame();
        render();
        checkQuestsProgress();
      } else {
        log(`Недостаточно средств для покупки ${itemName}`);
      }
    });
    
    buyItemsContainer.appendChild(buyItemElement);
  });
  
  // Отрисовка товаров для продажи
  Object.entries(inventory).forEach(([itemName, count]) => {
    if (itemName === 'ИИ' || count <= 0) return;
    
    const sellItemElement = document.createElement('div');
    sellItemElement.className = 'trade-item';
    
    let price;
    if (itemName === 'Мусор') {
      price = calculateTrashPrice();
    } else {
      price = tradeItems[itemName]?.sellPrice || 1;
    }
    
    sellItemElement.innerHTML = `
      <div class="trade-item-name">${itemName}</div>
      <div class="trade-item-price">${price}₸</div>
      <div class="trade-item-amount">${count} шт.</div>
    `;
    
    sellItemElement.addEventListener('click', () => {
      if (inventory[itemName] > 0) {
        inventory[itemName]--;
        tng += price;
        if (itemName === 'Мусор') trashSold++;
        
        log(`Продан 1 ${itemName} за ${price}₸`);
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
    const title = panel.querySelector('.panel-title span').textContent;
    
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
  logBox.innerHTML = '';
  log('Журнал очищен');
}

function toggleAutoScroll() {
  autoScrollEnabled = !autoScrollEnabled;
  if (autoScrollEnabled) {
    logBox.scrollTop = logBox.scrollHeight;
  }
  saveGame();
  render();
}

function toggleCollapse(panel) {
  const title = panel.querySelector('.panel-title span').textContent;
  
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
  
  document.getElementById(`${tabName}-tab`).classList.add('active');
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
}

function toggleBuySellMode(isBuyMode) {
  buyModeBtn.classList.toggle('active', isBuyMode);
  sellModeBtn.classList.toggle('active', !isBuyMode);
  buyItemsContainer.style.display = isBuyMode ? 'grid' : 'none';
  sellItemsContainer.style.display = isBuyMode ? 'none' : 'grid';
}