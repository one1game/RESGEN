class Achievements {
  constructor(game) {
    this.game = game;
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
  }

  checkAchievements() {
    if (!this.achievements.FIRST_MINER.unlocked && this.game.totalMined > 0) {
      this.achievements.FIRST_MINER.unlocked = true;
      this.game.tng += this.achievements.FIRST_MINER.reward;
      this.game.log(`🏆 Достижение: ${this.achievements.FIRST_MINER.title} +${this.achievements.FIRST_MINER.reward}₸`);
    }
    
    if (!this.achievements.COOL_KING.unlocked && this.game.inventory['Уголь'] >= 50) {
      this.achievements.COOL_KING.unlocked = true;
      this.game.tng += this.achievements.COOL_KING.reward;
      this.game.log(`🏆 Достижение: ${this.achievements.COOL_KING.title} +${this.achievements.COOL_KING.reward}₸`);
    }
    
    if (!this.achievements.DEFENSE_EXPERT.unlocked && 
        this.game.upgrades.defense && 
        this.game.upgrades.defenseLevel >= 3) {
      this.achievements.DEFENSE_EXPERT.unlocked = true;
      this.game.tng += this.achievements.DEFENSE_EXPERT.reward;
      this.game.log(`🏆 Достижение: ${this.achievements.DEFENSE_EXPERT.title} +${this.achievements.DEFENSE_EXPERT.reward}₸`);
    }
    
    if (!this.achievements.RECYCLER.unlocked && this.game.totalRecycled >= 30) {
      this.achievements.RECYCLER.unlocked = true;
      this.game.tng += this.achievements.RECYCLER.reward;
      this.game.log(`🏆 Достижение: ${this.achievements.RECYCLER.title} +${this.achievements.RECYCLER.reward}₸`);
    }
    
    if (!this.achievements.CRYSTAL_HUNTER.unlocked && this.game.inventory['Кристалл'] >= 5) {
      this.achievements.CRYSTAL_HUNTER.unlocked = true;
      this.game.tng += this.achievements.CRYSTAL_HUNTER.reward;
      this.game.log(`🏆 Достижение: ${this.achievements.CRYSTAL_HUNTER.title} +${this.achievements.CRYSTAL_HUNTER.reward}₸`);
    }
    
    this.game.updateCurrencyDisplay();
  }

  renderAchievements() {
    this.game.achievementsContainer.innerHTML = '';
    
    Object.values(this.achievements).forEach(achievement => {
      const achievementCard = document.createElement('div');
      achievementCard.className = `achievement-card ${achievement.unlocked ? 'unlocked' : ''}`;
      
      achievementCard.innerHTML = `
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-desc">${achievement.description}</div>
        <div class="achievement-reward">+${achievement.reward}₸</div>
      `;
      
      if (!achievement.unlocked) {
        const lock = document.createElement('div');
        lock.className = 'achievement-locked';
        lock.innerHTML = '🔒';
        achievementCard.appendChild(lock);
      }
      
      this.game.achievementsContainer.appendChild(achievementCard);
    });
  }
}