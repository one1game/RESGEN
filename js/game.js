class Game {
  constructor() {
    this.STORAGE_KEY = 'coreboxSave2.8';
    this.maxSlots = 12;
    
    this.inventory = { 
      'ИИ': 1, 
      'Уголь': 0, 
      'Мусор': 0,
      'Чипы': 0,
      'Электроника': 0,
      'Кристалл': 0
    };
    
    this.upgrades = {
      mining: 0,
      defense: false,
      defenseLevel: 0,
      crystalBoost: false
    };
    
    this.tng = 0;
    this.coalEnabled = false;
    this.gameTime = 30;
    this.isDay = true;
    this.passiveCounter = 0;
    this.sellMode = false;
    this.recycleMode = false;
    this.trashSold = 0;
    this.criticalMining = false;
    this.autoScrollEnabled = true;
    this.quests = [];
    this.rebelActivity = 0;
    this.lastUpdateTime = Date.now();
    this.nightsDefended = 0;
    this.coalProduced = 0;
    this.totalMined = 0;
    this.totalRecycled = 0;
    
    this.collapsedState = {
      statusPanel: false,
      logPanel: false,
      inventoryPanel: false,
      upgradesPanel: false,
      questsPanel: false,
      achievementsPanel: false
    };
    
    this.achievements = {
      FIRST_MINER: { 
        id: 'FIRST_MINER', 
        title: 'Первая добыча', 
        description: 'Добыть первый ресурс', 
        reward: 5, 
        unlocked: false 
      },
      COAL_KING: { 
        id: 'COAL_KING', 
        title: 'Король угля', 
        description: 'Накопить 50 угля', 
        reward: 20, 
        unlocked: false 
      },
      DEFENSE_EXPERT: { 
        id: 'DEFENSE_EXPERT', 
        title: 'Эксперт защиты', 
        description: 'Улучшить защиту до 3 уровня', 
        reward: 15, 
        unlocked: false 
      },
      RECYCLER: { 
        id: 'RECYCLER', 
        title: 'Переработчик', 
        description: 'Переработать 30 мусора', 
        reward: 10, 
        unlocked: false 
      },
      CRYSTAL_HUNTER: { 
        id: 'CRYSTAL_HUNTER', 
        title: 'Охотник за кристаллами', 
        description: 'Найти 5 кристаллов', 
        reward: 25, 
        unlocked: false 
      }
    };

    this.inventoryManager = new Inventory(this);
    this.upgradesManager = new Upgrades(this);
    this.questsManager = new Quests(this);
    this.achievementsManager = new Achievements(this);
    this.uiManager = new UI(this);
  }

  init() {
    this.loadGame();
    this.uiManager.initEventListeners();
    
    if (this.quests.length === 0) {
      this.questsManager.generateNewQuest();
      this.questsManager.generateNewQuest();
    }
    
    this.render();
    
    setInterval(() => this.gameLoop(), 1000);
    
    this.log('Система CoreBox 2.8 инициализирована');
    this.log('Добро пожаловать в систему добычи ресурсов!');
    this.log('Остерегайтесь повстанцев-анархистов по ночам!');
  }

  gameLoop() {
    const now = Date.now();
    const secondsPassed = Math.floor((now - this.lastUpdateTime) / 1000);
    this.lastUpdateTime = now;
    
    this.gameTime -= secondsPassed;
    
    while (this.gameTime <= 0) {
      this.gameTime += 30;
      this.isDay = !this.isDay;
      
      if (!this.isDay) {
        if (this.coalEnabled) {
          if (this.inventory['Уголь'] > 0) {
            this.inventory['Уголь']--;
            this.log('🌙 Ночь - сгорел 1 уголь');
          } else {
            this.coalEnabled = false;
            this.log('🌙 Ночь - уголь закончился, ТЭЦ отключена');
          }
        }
        
        const defensePower = this.upgrades.defense ? 30 + (this.upgrades.defenseLevel * 15) : 0;
        if (Math.random() * 100 > defensePower) {
          this.handleRebelAttack();
        } else if (this.upgrades.defense) {
          this.log('🌙 Система защиты отразила атаку повстанцев');
          this.nightsDefended++;
          
          this.quests.forEach(quest => {
            if (quest.type === 'defense') {
              quest.progress = this.nightsDefended;
            }
          });
        }
        
        if (Math.random() < 0.3) {
          this.rebelActivity++;
        }
      } else {
        this.rebelActivity = Math.max(0, this.rebelActivity - 1);
      }
      
      this.log(this.isDay ? '☀️ Наступил день' : '🌙 Наступила ночь');
      
      if (this.isDay && this.quests.length < 3 && Math.random() < 0.5) {
        this.questsManager.generateNewQuest();
      }
      
      this.saveGame();
    }

    this.passiveCounter += secondsPassed;
    while (this.passiveCounter >= 10) {
      this.passiveCounter -= 10;
      const aiActive = this.isDay || this.coalEnabled;
      if (aiActive) {
        const coalChance = 0.003 + (this.upgrades.mining * 0.001) + (this.upgrades.crystalBoost ? 0.002 : 0);
        const trashChance = 0.007 + (this.upgrades.mining * 0.001) + (this.upgrades.crystalBoost ? 0.003 : 0);
        const chipChance = 0.001;
        const electronicsChance = 0.0005;
        const crystalChance = 0.0001;
        
        if (Math.random() < coalChance) {
          this.inventory['Уголь']++;
          this.totalMined++;
        }
        if (Math.random() < trashChance) {
          this.inventory['Мусор']++;
          this.totalMined++;
        }
        if (Math.random() < chipChance) {
          this.inventory['Чипы']++;
          this.totalMined++;
        }
        if (Math.random() < electronicsChance) {
          this.inventory['Электроника']++;
          this.totalMined++;
        }
        if (Math.random() < crystalChance) {
          this.inventory['Кристалл'] = (this.inventory['Кристалл'] || 0) + 1;
          this.totalMined++;
        }
        
        this.saveGame();
      }
    }

    this.render();
    this.questsManager.checkQuests();
    this.achievementsManager.checkAchievements();
  }

  handleRebelAttack() {
    const threatLevel = Math.min(1, this.rebelActivity * 0.2);
    
    if (Math.random() < threatLevel) {
      const attackType = Math.floor(Math.random() * 3);
      let message = "🌙 Повстанцы атаковали!";
      
      switch(attackType) {
        case 0: // Кража ресурсов
          const resources = Object.keys(this.inventory).filter(k => k !== 'ИИ' && this.inventory[k] > 0);
          if (resources.length > 0) {
            const stolenResource = resources[Math.floor(Math.random() * resources.length)];
            const amount = Math.min(this.inventory[stolenResource], Math.floor(Math.random() * 3) + 1);
            this.inventory[stolenResource] -= amount;
            message += ` Украдено ${amount} ${stolenResource}`;
          }
          break;
          
        case 1: // Повреждение оборудования
          if (this.upgrades.mining > 0 && Math.random() < 0.3) {
            this.upgrades.mining--;
            message += " Повреждена система добычи! Уровень понижен";
          }
          break;
          
        case 2: // Вандализм
          if (this.inventory['Мусор'] > 0) {
            const destroyed = Math.min(this.inventory['Мусор'], Math.floor(Math.random() * 5) + 3);
            this.inventory['Мусор'] -= destroyed;
            message += ` Уничтожено ${destroyed} мусора`;
          }
          break;
      }
      
      this.log(message);
      this.rebelActivity++;
      this.saveGame();
    }
  }

  log(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `> ${message}`;
    document.getElementById('logBox').appendChild(entry);
    
    if (this.autoScrollEnabled) {
      document.getElementById('logBox').scrollTop = document.getElementById('logBox').scrollHeight;
    }
  }

  updateTimeDisplay() {
    const icon = this.isDay ? '☀️' : '🌙';
    document.getElementById('timeDisplay').textContent = `${this.isDay ? 'День' : 'Ночь'} ${icon} (${this.gameTime}s)`;
  }

  updateCurrencyDisplay() {
    document.getElementById('currencyDisplay').textContent = `${this.tng}₸`;
  }
  
  updateDefenseDisplay() {
    const defensePower = this.upgrades.defense ? 30 + (this.upgrades.defenseLevel * 15) : 0;
    document.getElementById('defenseDisplay').textContent = `${defensePower}%`;
  }

  saveGame() {
    const saveData = {
      inventory: this.inventory,
      tng: this.tng,
      coalEnabled: this.coalEnabled,
      gameTime: this.gameTime,
      isDay: this.isDay,
      passiveCounter: this.passiveCounter,
      sellMode: this.sellMode,
      recycleMode: this.recycleMode,
      trashSold: this.trashSold,
      upgrades: this.upgrades,
      autoScrollEnabled: this.autoScrollEnabled,
      quests: this.quests,
      rebelActivity: this.rebelActivity,
      lastUpdateTime: Date.now(),
      nightsDefended: this.nightsDefended,
      coalProduced: this.coalProduced,
      totalMined: this.totalMined,
      totalRecycled: this.totalRecycled,
      achievements: {
        FIRST_MINER: this.achievements.FIRST_MINER.unlocked,
        COAL_KING: this.achievements.COOL_KING?.unlocked,
        DEFENSE_EXPERT: this.achievements.DEFENSE_EXPERT.unlocked,
        RECYCLER: this.achievements.RECYCLER.unlocked,
        CRYSTAL_HUNTER: this.achievements.CRYSTAL_HUNTER.unlocked
      },
      collapsedState: this.collapsedState
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
  }

  loadGame() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        Object.keys(this.inventory).forEach(key => {
          if (data.inventory[key] !== undefined) this.inventory[key] = data.inventory[key];
        });
        this.tng = data.tng ?? 0;
        this.coalEnabled = data.coalEnabled ?? false;
        this.gameTime = data.gameTime ?? 30;
        this.isDay = data.isDay ?? true;
        this.passiveCounter = data.passiveCounter ?? 0;
        this.sellMode = data.sellMode ?? false;
        this.recycleMode = data.recycleMode ?? false;
        this.trashSold = data.trashSold ?? 0;
        this.upgrades.mining = data.upgrades?.mining ?? 0;
        this.upgrades.defense = data.upgrades?.defense ?? false;
        this.upgrades.defenseLevel = data.upgrades?.defenseLevel ?? 0;
        this.upgrades.crystalBoost = data.upgrades?.crystalBoost ?? false;
        this.autoScrollEnabled = data.autoScrollEnabled ?? true;
        this.quests = data.quests ?? [];
        this.rebelActivity = data.rebelActivity ?? 0;
        this.lastUpdateTime = data.lastUpdateTime ?? Date.now();
        this.nightsDefended = data.nightsDefended ?? 0;
        this.coalProduced = data.coalProduced ?? 0;
        this.totalMined = data.totalMined ?? 0;
        this.totalRecycled = data.totalRecycled ?? 0;
        
        if (data.achievements) {
          Object.keys(data.achievements).forEach(key => {
            if (this.achievements[key]) {
              this.achievements[key].unlocked = data.achievements[key];
            }
          });
        }
        
        if (data.collapsedState) {
          Object.assign(this.collapsedState, data.collapsedState);
        }
      } catch (e) {
        console.error('Ошибка загрузки сохранения', e);
      }
    }
  }

  render() {
    document.getElementById('miningBonus').textContent = `+${this.upgrades.mining + (this.upgrades.crystalBoost ? 15 : 0)}%`;
    document.getElementById('miningLevel').textContent = this.upgrades.mining;
    document.getElementById('miningProgress').style.width = `${this.upgrades.mining * 10}%`;
    
    document.getElementById('coalStatus').textContent = this.coalEnabled ? 'Активно' : 'Выкл';
    document.getElementById('defenseStatus').textContent = this.upgrades.defense ? 'Активно' : 'Выкл';
    document.getElementById('defenseLevel').textContent = `Ур. ${this.upgrades.defenseLevel}/5`;
    
    let rebelText = 'Низкий';
    let rebelColor = '#00cc66';
    if (this.rebelActivity > 2) {
      rebelText = 'Высокий';
      rebelColor = '#ff3333';
    } else if (this.rebelActivity > 0) {
      rebelText = 'Средний';
      rebelColor = '#ffcc00';
    }
    document.getElementById('rebelStatus').textContent = rebelText;
    document.getElementById('rebelStatus').style.color = rebelColor;
    
    const aiActive = this.isDay || this.coalEnabled;
    document.getElementById('aiStatusText').textContent = aiActive ? 'Активен' : 'Неактивен';
    document.getElementById('aiStatusText').style.color = aiActive ? '#00cc66' : '#ff3333';
    
    this.updateCurrencyDisplay();
    this.updateDefenseDisplay();
    this.updateTimeDisplay();
    
    document.getElementById('upgradeMiningBtn').disabled = this.upgrades.mining >= 10 || this.inventory['Чипы'] < 5;
    document.getElementById('upgradeDefenseBtn').disabled = this.upgrades.defense || this.inventory['Электроника'] < 3;
    document.getElementById('upgradeDefenseLevelBtn').disabled = this.upgrades.defenseLevel >= 5 || this.inventory['Чипы'] < (this.upgrades.defenseLevel + 1) * 10;
    
    document.getElementById('miningChipsReq').textContent = `${this.inventory['Чипы']}/5`;
    document.getElementById('miningChipsReq').className = this.inventory['Чипы'] >= 5 ? 
      'requirement-value requirement-met' : 'requirement-value requirement-not-met';
    
    document.getElementById('defenseElectronicsReq').textContent = `${this.inventory['Электроника']}/3`;
    document.getElementById('defenseElectronicsReq').className = this.inventory['Электроника'] >= 3 ? 
      'requirement-value requirement-met' : 'requirement-value requirement-not-met';
    
    document.getElementById('defenseChipsReq').textContent = `${this.inventory['Чипы']}/${(this.upgrades.defenseLevel + 1) * 10}`;
    document.getElementById('defenseChipsReq').className = this.inventory['Чипы'] >= (this.upgrades.defenseLevel + 1) * 10 ? 
      'requirement-value requirement-met' : 'requirement-value requirement-not-met';
    
    document.getElementById('autoScrollBtn').textContent = this.autoScrollEnabled ? 'Автоскролл ✓' : 'Автоскролл';
    
    const inventoryDiv = document.getElementById('inventory');
    inventoryDiv.innerHTML = '';

    Object.entries(this.inventory).forEach(([name, count]) => {
      if (name === 'ИИ') return;
      
      const slot = document.createElement('div');
      slot.className = 'slot';
      if (name === 'Кристалл') slot.classList.add('crystal');
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'item-name';
      nameDiv.textContent = name;
      
      const countDiv = document.createElement('div');
      countDiv.className = 'item-count';
      countDiv.textContent = `x${count}`;
      
      slot.appendChild(nameDiv);
      slot.appendChild(countDiv);

      if (this.criticalMining && (name === 'Уголь' || name === 'Электроника' || name === 'Кристалл')) {
        slot.classList.add('critical');
        this.criticalMining = false;
      }
      
      if (name === 'Уголь' || name === 'Мусор') {
        const bonusDiv = document.createElement('div');
        bonusDiv.className = 'mining-bonus';
        const baseChance = name === 'Уголь' ? 3 : 1.5;
        const totalBonus = this.upgrades.mining + (this.coalEnabled ? (name === 'Уголь' ? 2 : 1) : 0) + (this.upgrades.crystalBoost ? 15 : 0);
        bonusDiv.textContent = `+${baseChance + totalBonus}%`;
        slot.appendChild(bonusDiv);
      }

      if (this.sellMode && name === 'Мусор') {
        slot.classList.add('sell-mode');
        slot.onclick = () => this.inventoryManager.handleSellTrash();
      } 
      else if (this.recycleMode && name === 'Мусор') {
        slot.classList.add('recycle-mode');
        slot.onclick = () => this.inventoryManager.handleRecycleTrash();
      }
      else if (name === 'Уголь') {
        if (this.coalEnabled) {
          slot.style.borderColor = 'var(--primary)';
          slot.style.boxShadow = '0 0 8px var(--primary)';
        }
        
        slot.onclick = () => this.inventoryManager.handleCoalInteraction();
      }
      else if (name === 'Электроника' && count > 0) {
        slot.classList.add('defense');
      }
      else if (name === 'Кристалл') {
        slot.onclick = () => {
          if (this.inventory['Кристалл'] >= 3 && !this.upgrades.crystalBoost) {
            this.upgrades.crystalBoost = true;
            this.inventory['Кристалл'] -= 3;
            this.log("⚡ Активирован кристаллический ускоритель! +15% к добыче");
            this.saveGame();
            this.render();
          }
        };
      }

      inventoryDiv.appendChild(slot);
    });

    while (inventoryDiv.children.length < this.maxSlots) {
      const slot = document.createElement('div');
      slot.className = 'slot empty';
      slot.innerHTML = '<div class="item-name">[Пусто]</div><div class="item-count">+</div>';
      inventoryDiv.appendChild(slot);
    }
    
    this.questsManager.renderQuests();
    this.achievementsManager.renderAchievements();
    this.applyCollapsedState();
  }
  
  applyCollapsedState() {
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
      const title = panel.querySelector('.panel-title span').textContent;
      
      if (title.includes('Состояние') && this.collapsedState.statusPanel) {
        panel.classList.add('collapsed');
      } else if (title.includes('журнал') && this.collapsedState.logPanel) {
        panel.classList.add('collapsed');
      } else if (title.includes('Инвентарь') && this.collapsedState.inventoryPanel) {
        panel.classList.add('collapsed');
      } else if (title.includes('апгрейды') && this.collapsedState.upgradesPanel) {
        panel.classList.add('collapsed');
      } else if (title.includes('Задания') && this.collapsedState.questsPanel) {
        panel.classList.add('collapsed');
      } else if (title.includes('Достижения') && this.collapsedState.achievementsPanel) {
        panel.classList.add('collapsed');
      }
    });
  }

  clearLog() {
    document.getElementById('logBox').innerHTML = '';
    this.log('Журнал очищен');
  }

  toggleAutoScroll() {
    this.autoScrollEnabled = !this.autoScrollEnabled;
    if (this.autoScrollEnabled) {
      document.getElementById('logBox').scrollTop = document.getElementById('logBox').scrollHeight;
    }
    this.saveGame();
    this.render();
  }

  toggleCollapse(panel) {
    const title = panel.querySelector('.panel-title span').textContent;
    
    if (title.includes('Состояние')) {
      this.collapsedState.statusPanel = !this.collapsedState.statusPanel;
    } else if (title.includes('журнал')) {
      this.collapsedState.logPanel = !this.collapsedState.logPanel;
    } else if (title.includes('Инвентарь')) {
      this.collapsedState.inventoryPanel = !this.collapsedState.inventoryPanel;
    } else if (title.includes('апгрейды')) {
      this.collapsedState.upgradesPanel = !this.collapsedState.upgradesPanel;
    } else if (title.includes('Задания')) {
      this.collapsedState.questsPanel = !this.collapsedState.questsPanel;
    } else if (title.includes('Достижения')) {
      this.collapsedState.achievementsPanel = !this.collapsedState.achievementsPanel;
    }
    
    panel.classList.toggle('collapsed');
    this.saveGame();
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  }

  toggleTradeMode() {
    this.sellMode = !this.sellMode;
    if (this.sellMode) this.recycleMode = false;
    this.log(this.sellMode ? 'Активирован режим торговли' : 'Режим торговли отключен');
    this.saveGame();
    this.render();
  }

  toggleRecycleMode() {
    this.recycleMode = !this.recycleMode;
    if (this.recycleMode) this.sellMode = false;
    this.log(this.recycleMode ? 'Активирован режим переработки' : 'Режим переработки отключен');
    this.saveGame();
    this.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});