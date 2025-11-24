use rand::Rng;
use crate::game::{GameState, GameEvent};
use crate::game::config::MiningConfig;

#[derive(Clone)]
pub struct MiningSystem {
    config: MiningConfig,
}

impl MiningSystem {
    pub fn new(config: MiningConfig) -> Self {
        Self { config }
    }
    
    // ОБЩИЙ МЕТОД ДЛЯ ДОБЫЧИ РЕСУРСОВ
    fn mine_resources_common(&self, state: &mut GameState, is_auto: bool) -> Vec<GameEvent> {
        let mut events = Vec::new();
    
        if !state.is_ai_active() {
            if !is_auto {
                events.push(GameEvent::LogMessage("❌ Система неактивна! Включите ТЭЦ или дождитесь дня".to_string()));
            }
            return events;
        }
        
        let mut rng = rand::thread_rng();
        
        // ОДИНАКОВЫЕ ШАНСЫ ДЛЯ РУЧНОЙ И АВТОМАТИЧЕСКОЙ ДОБЫЧИ
        let coal_chance = self.config.base_chances.coal + 
            if state.coal_enabled { self.config.coal_bonus } else { 0.0 } +
            (state.upgrades.mining as f64 * self.config.upgrade_bonus);
        
        let trash_chance = self.config.base_chances.trash +
            (state.upgrades.mining as f64 * 0.005);
        
        let chips_chance = if state.chips_unlocked { 
            self.config.base_chances.chips + (state.upgrades.mining as f64 * 0.001)
        } else { 0.0 };
        
        let plasma_chance = if state.plasma_unlocked {
            self.config.base_chances.plasma + (state.upgrades.mining as f64 * 0.002)
        } else { 0.0 };
        
        // КРИТИЧЕСКИЙ УРОН ОДИНАКОВЫЙ ДЛЯ ОБОИХ РЕЖИМОВ
        let is_critical = rng.gen::<f64>() < self.config.critical_chance;
        let multiplier = if is_critical { self.config.critical_multiplier } else { 1 };
        
        // ПРЕФИКС ДЛЯ РЕСУРСА (auto_ для автодобычи)
        let resource_prefix = if is_auto { "auto_" } else { "" };
        
        // ДОБЫЧА УГЛЯ
        if rng.gen::<f64>() < coal_chance {
            let amount = multiplier;
            state.inventory.coal += amount;
            state.total_mined += amount;
            events.push(GameEvent::ResourceMined {
                resource: format!("{}coal", resource_prefix),
                amount,
                critical: is_critical,
            });
            
            if !state.coal_unlocked {
                state.coal_unlocked = true;
            }
        }
        
        // ДОБЫЧА МУСОРА
        if rng.gen::<f64>() < trash_chance {
            let amount = multiplier;
            state.inventory.trash += amount;
            state.total_mined += amount;
            events.push(GameEvent::ResourceMined {
                resource: format!("{}trash", resource_prefix),
                amount,
                critical: is_critical,
            });
            
            if !state.trash_unlocked {
                state.trash_unlocked = true;
            }
        }
        
        // ДОБЫЧА ЧИПОВ
        if state.chips_unlocked && rng.gen::<f64>() < chips_chance {
            let amount = multiplier;
            state.inventory.chips += amount;
            state.total_mined += amount;
            events.push(GameEvent::ResourceMined {
                resource: format!("{}chips", resource_prefix),
                amount,
                critical: is_critical,
            });
        }
        
        // ДОБЫЧА ПЛАЗМЫ
        if state.plasma_unlocked && rng.gen::<f64>() < plasma_chance {
            let amount = multiplier;
            state.inventory.plasma += amount;
            state.total_mined += amount;
            events.push(GameEvent::ResourceMined {
                resource: format!("{}plasma", resource_prefix),
                amount,
                critical: is_critical,
            });
        }
        
        events
    }
    
    // РУЧНАЯ ДОБЫЧА
    pub fn mine_resources(&self, state: &mut GameState) -> Vec<GameEvent> {
        self.mine_resources_common(state, false)
    }
    
    // АВТОМАТИЧЕСКАЯ ДОБЫЧА
    pub fn auto_mine_resources(&self, state: &mut GameState) -> Vec<GameEvent> {
        self.mine_resources_common(state, true)
    }
    
    // ПАССИВНАЯ ДОБЫЧА
    pub fn passive_mining(&self, state: &mut GameState) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if !state.is_passive_mining_active() {
            return events;
        }
        
        let mut rng = rand::thread_rng();
        
        // ПАССИВНАЯ ДОБЫЧА УГЛЯ
        if rng.gen::<f64>() < self.config.passive_chances.coal {
            state.inventory.coal += 1;
            state.total_mined += 1;
            events.push(GameEvent::ResourceMined {
                resource: "coal".to_string(),
                amount: 1,
                critical: false,
            });
            
            if !state.coal_unlocked {
                state.coal_unlocked = true;
            }
        }
        
        // ПАССИВНАЯ ДОБЫЧА МУСОРА
        if rng.gen::<f64>() < self.config.passive_chances.trash {
            state.inventory.trash += 1;
            state.total_mined += 1;
            events.push(GameEvent::ResourceMined {
                resource: "trash".to_string(),
                amount: 1,
                critical: false,
            });
            
            if !state.trash_unlocked {
                state.trash_unlocked = true;
            }
        }
        
        // ПАССИВНАЯ ДОБЫЧА ЧИПОВ
        if state.chips_unlocked && rng.gen::<f64>() < self.config.passive_chances.chips {
            state.inventory.chips += 1;
            state.total_mined += 1;
            events.push(GameEvent::ResourceMined {
                resource: "chips".to_string(),
                amount: 1,
                critical: false,
            });
        }
        
        // ПАССИВНАЯ ДОБЫЧА ПЛАЗМЫ
        if state.plasma_unlocked && rng.gen::<f64>() < self.config.passive_chances.plasma {
            state.inventory.plasma += 1;
            state.total_mined += 1;
            events.push(GameEvent::ResourceMined {
                resource: "plasma".to_string(),
                amount: 1,
                critical: false,
            });
        }
        
        events
    }
    
    // ВСПОМОГАТЕЛЬНЫЙ МЕТОД ДЛЯ РАСЧЕТА ШАНСОВ (может быть полезен для UI)
    pub fn get_mining_chances(&self, state: &GameState) -> MiningChances {
        let coal_chance = self.config.base_chances.coal + 
            if state.coal_enabled { self.config.coal_bonus } else { 0.0 } +
            (state.upgrades.mining as f64 * self.config.upgrade_bonus);
        
        let trash_chance = self.config.base_chances.trash +
            (state.upgrades.mining as f64 * 0.005);
        
        let chips_chance = if state.chips_unlocked { 
            self.config.base_chances.chips + (state.upgrades.mining as f64 * 0.001)
        } else { 0.0 };
        
        let plasma_chance = if state.plasma_unlocked {
            self.config.base_chances.plasma + (state.upgrades.mining as f64 * 0.002)
        } else { 0.0 };
        
        MiningChances {
            coal: coal_chance,
            trash: trash_chance,
            chips: chips_chance,
            plasma: plasma_chance,
            critical: self.config.critical_chance,
        }
    }
}

// СТРУКТУРА ДЛЯ ВОЗВРАТА ШАНСОВ ДОБЫЧИ
pub struct MiningChances {
    pub coal: f64,
    pub trash: f64,
    pub chips: f64,
    pub plasma: f64,
    pub critical: f64,
}

impl MiningChances {
    pub fn format_as_percent(&self) -> String {
        format!(
            "Уголь: {:.1}%, Мусор: {:.1}%, Чипы: {:.1}%, Плазма: {:.1}%, Крит: {:.1}%",
            self.coal * 100.0,
            self.trash * 100.0,
            self.chips * 100.0,
            self.plasma * 100.0,
            self.critical * 100.0
        )
    }
}