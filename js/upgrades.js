class Upgrades {
  constructor(game) {
    this.game = game;
  }

  upgradeMining() {
    if (this.game.upgrades.mining < 10 && this.game.inventory['Чипы'] >= 5) {
      this.game.inventory['Чипы'] -= 5;
      this.game.upgrades.mining++;
      
      this.game.log(`Улучшена добыча! Теперь +${this.game.upgrades.mining}% к шансам`);
      
      this.game.quests.forEach(quest => {
        if (quest.type === 'mine' && quest.resource === 'upgrade') {
          quest.progress = this.game.upgrades.mining;
        }
      });
      
      this.game.saveGame();
      this.game.render();
      this.game.questsManager.checkQuests();
    }
  }

  activateDefense() {
    if (!this.game.upgrades.defense && this.game.inventory['Электроника'] >= 3) {
      this.game.inventory['Электроника'] -= 3;
      this.game.upgrades.defense = true;
      
      this.game.log('Активированы туррели защиты!');
      this.game.saveGame();
      this.game.render();
    }
  }

  upgradeDefense() {
    if (this.game.upgrades.defenseLevel < 5 && 
        this.game.inventory['Чипы'] >= (this.game.upgrades.defenseLevel + 1) * 10) {
      const cost = (this.game.upgrades.defenseLevel + 1) * 10;
      this.game.inventory['Чипы'] -= cost;
      this.game.upgrades.defenseLevel++;
      
      this.game.log(`Улучшена защита до уровня ${this.game.upgrades.defenseLevel}!`);
      this.game.saveGame();
      this.game.render();
      this.game.achievementsManager.checkAchievements();
    }
  }
}