class Inventory {
  constructor(game) {
    this.game = game;
  }

  handleSellTrash() {
    if (this.game.inventory['Мусор'] > 0) {
      const price = this.calculateTrashPrice();
      const earned = Math.floor(this.game.inventory['Мусор'] * price);
      this.game.tng += earned;
      this.game.trashSold += this.game.inventory['Мусор'];
      
      this.game.log(`Продано ${this.game.inventory['Мусор']} мусора +${earned}₸`);
      this.game.inventory['Мусор'] = 0;
      this.game.updateCurrencyDisplay();
      this.game.saveGame();
      this.game.render();
      this.game.questsManager.checkQuests();
    }
  }

  handleRecycleTrash() {
    if (this.game.inventory['Мусор'] >= 5) {
      this.game.inventory['Мусор'] -= 5;
      this.game.inventory['Уголь']++;
      this.game.coalProduced++;
      this.game.totalRecycled += 5;
      
      this.game.log('Переработано 5 мусора → 1 уголь');
      this.game.saveGame();
      this.game.render();
      this.game.achievementsManager.checkAchievements();
      
      this.game.quests.forEach(quest => {
        if (quest.type === 'recycle') {
          quest.progress++;
        }
      });
    }
  }

  handleCoalInteraction() {
    if (this.game.sellMode && this.game.isDay) {
      if (this.game.inventory['Уголь'] > 0) {
        this.game.inventory['Уголь']--;
        this.game.tng += 3;
        this.game.coalEnabled = false;
        
        this.game.log('Продано 1 уголь +3₸ (ТЭЦ отключена)');
        this.game.updateCurrencyDisplay();
        this.game.saveGame();
        this.game.render();
      }
    } 
    else if (!this.game.sellMode && !this.game.recycleMode) {
      if (!this.game.coalEnabled) {
        if (this.game.inventory['Уголь'] > 0) {
          this.game.coalEnabled = true;
          this.game.inventory['Уголь']--;
          
          this.game.log('Угольная ТЭЦ активирована (-1 уголь)');
        } else {
          this.game.log('Нет угля для активации!');
        }
      } else {
        this.game.coalEnabled = false;
        this.game.log('Угольная ТЭЦ отключена');
      }
      this.game.saveGame();
      this.game.render();
    }
  }

  calculateTrashPrice() {
    const basePrice = 1;
    const priceDrop = Math.floor(this.game.trashSold / 5) * 0.05;
    return Math.max(basePrice - priceDrop, 0.3);
  }

  mineResources() {
    const aiActive = this.game.isDay || this.game.coalEnabled;
    if (!aiActive) {
      this.game.log('❌ ИИ неактивен! Нужна энергия');
      return;
    }
    
    let coalChance = 0.02 + (this.game.coalEnabled ? 0.02 : 0) + (this.game.upgrades.mining * 0.01);
    let trashChance = 0.01 + (this.game.coalEnabled ? 0.01 : 0) + (this.game.upgrades.mining * 0.01);
    let chipChance = 0.005;
    let electronicsChance = 0.003;
    let crystalChance = 0.001;
    const isCritical = Math.random() < 0.05;

    if (this.game.upgrades.crystalBoost) {
      coalChance += 0.015;
      trashChance += 0.01;
      chipChance += 0.003;
      electronicsChance += 0.002;
      crystalChance += 0.0005;
    }

    let foundSomething = false;

    if (Math.random() < coalChance) {
      const amount = isCritical ? 2 : 1;
      this.game.inventory['Уголь'] += amount;
      this.game.criticalMining = isCritical;
      
      this.game.log(`Найден${amount > 1 ? 'о' : ''} ${amount} угля 🪨${isCritical ? ' ✨' : ''}`);
      foundSomething = true;
      this.game.totalMined += amount;
      
      this.game.quests.forEach(quest => {
        if (quest.type === 'mine' && quest.resource === 'Уголь') {
          quest.progress = this.game.inventory['Уголь'];
        }
      });
    }
    
    if (Math.random() < trashChance) {
      this.game.inventory['Мусор']++;
      this.game.log('Найден мусор ♻️');
      foundSomething = true;
      this.game.totalMined++;
      
      this.game.quests.forEach(quest => {
        if (quest.type === 'mine' && quest.resource === 'Мусор') {
          quest.progress = this.game.inventory['Мусор'];
        }
      });
    }
    
    if (Math.random() < chipChance) {
      this.game.inventory['Чипы']++;
      this.game.criticalMining = true;
      this.game.log('Найден чип 🎛️✨');
      foundSomething = true;
      this.game.totalMined++;
      
      this.game.quests.forEach(quest => {
        if (quest.type === 'mine' && quest.resource === 'Чипы') {
          quest.progress = this.game.inventory['Чипы'];
        }
      });
    }
    
    if (Math.random() < electronicsChance) {
      this.game.inventory['Электроника']++;
      this.game.criticalMining = true;
      this.game.log('Найдена электроника 💾✨');
      foundSomething = true;
      this.game.totalMined++;
      
      this.game.quests.forEach(quest => {
        if (quest.type === 'mine' && quest.resource === 'Электроника') {
          quest.progress = this.game.inventory['Электроника'];
        }
      });
    }
    
    if (Math.random() < crystalChance) {
      this.game.inventory['Кристалл'] = (this.game.inventory['Кристалл'] || 0) + 1;
      this.game.criticalMining = true;
      this.game.log("✨ Найден редкий энергетический кристалл!");
      foundSomething = true;
      this.game.totalMined++;
    }
    
    if (!foundSomething) {
      this.game.log('Ничего не найдено...');
    }
    
    this.game.saveGame();
    this.game.render();
    this.game.questsManager.checkQuests();
    this.game.achievementsManager.checkAchievements();
  }
}