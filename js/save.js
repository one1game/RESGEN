class SaveManager {
  constructor(game) {
    this.game = game;
  }

  saveGame() {
    const saveData = {
      inventory: this.game.inventory,
      tng: this.game.tng,
      coalEnabled: this.game.coalEnabled,
      gameTime: this.game.gameTime,
      isDay: this.game.isDay,
      passiveCounter: this.game.passiveCounter,
      sellMode: this.game.sellMode,
      recycleMode: this.game.recycleMode,
      trashSold: this.game.trashSold,
      upgrades: this.game.upgrades,
      autoScrollEnabled: this.game.autoScrollEnabled,
      quests: this.game.quests,
      rebelActivity: this.game.rebelActivity,
      lastUpdateTime: Date.now(),
      nightsDefended: this.game.nightsDefended,
      coalProduced: this.game.coalProduced,
      totalMined: this.game.totalMined,
      totalRecycled: this.game.totalRecycled,
      achievements: {
        FIRST_MINER: this.game.achievements.FIRST_MINER.unlocked,
        COAL_KING: this.game.achievements.COOL_KING?.unlocked,
        DEFENSE_EXPERT: this.game.achievements.DEFENSE_EXPERT.unlocked,
        RECYCLER: this.game.achievements.RECYCLER.unlocked,
        CRYSTAL_HUNTER: this.game.achievements.CRYSTAL_HUNTER.unlocked
      },
      collapsedState: this.game.collapsedState
    };
    localStorage.setItem(this.game.STORAGE_KEY, JSON.stringify(saveData));
  }

  loadGame() {
    const saved = localStorage.getItem(this.game.STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        Object.keys(this.game.inventory).forEach(key => {
          if (data.inventory[key] !== undefined) this.game.inventory[key] = data.inventory[key];
        });
        this.game.tng = data.tng ?? 0;
        this.game.coalEnabled = data.coalEnabled ?? false;
        this.game.gameTime = data.gameTime ?? 30;
        this.game.isDay = data.isDay ?? true;
        this.game.passiveCounter = data.passiveCounter ?? 0;
        this.game.sellMode = data.sellMode ?? false;
        this.game.recycleMode = data.recycleMode ?? false;
        this.game.trashSold = data.trashSold ?? 0;
        this.game.upgrades.mining = data.upgrades?.mining ?? 0;
        this.game.upgrades.defense = data.upgrades?.defense ?? false;
        this.game.upgrades.defenseLevel = data.upgrades?.defenseLevel ?? 0;
        this.game.upgrades.crystalBoost = data.upgrades?.crystalBoost ?? false;
        this.game.autoScrollEnabled = data.autoScrollEnabled ?? true;
        this.game.quests = data.quests ?? [];
        this.game.rebelActivity = data.rebelActivity ?? 0;
        this.game.lastUpdateTime = data.lastUpdateTime ?? Date.now();
        this.game.nightsDefended = data.nightsDefended ?? 0;
        this.game.coalProduced = data.coalProduced ?? 0;
        this.game.totalMined = data.totalMined ?? 0;
        this.game.totalRecycled = data.totalRecycled ?? 0;
        
        if (data.achievements) {
          Object.keys(data.achievements).forEach(key => {
            if (this.game.achievements[key]) {
              this.game.achievements[key].unlocked = data.achievements[key];
            }
          });
        }
        
        if (data.collapsedState) {
          Object.assign(this.game.collapsedState, data.collapsedState);
        }
      } catch (e) {
        console.error('Ошибка загрузки сохранения', e);
      }
    }
  }
}