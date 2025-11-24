use crate::game::{GameState, GameEvent};
use crate::game::config::UpgradeConfig;

#[derive(Clone)]
pub struct UpgradeSystem {
    config: UpgradeConfig,
}

impl UpgradeSystem {
    pub fn new(config: UpgradeConfig) -> Self {
        Self { config }
    }
    
    pub fn upgrade_mining(&self, state: &mut GameState) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if state.upgrades.mining >= self.config.mining_max_level {
            events.push(GameEvent::LogMessage("Добыча уже максимально улучшена!".to_string()));
            return events;
        }
        
        let required_chips = self.config.mining_base_cost + 
            state.upgrades.mining * self.config.mining_cost_multiplier;
        
        if state.inventory.chips >= required_chips {
            state.inventory.chips -= required_chips;
            state.upgrades.mining += 1;
            
            events.push(GameEvent::UpgradePurchased {
                upgrade_type: "mining".to_string(),
                level: state.upgrades.mining,
            });
            events.push(GameEvent::LogMessage(
                format!("Улучшена добыча до уровня {}! (-{} чипов)", 
                    state.upgrades.mining, required_chips)
            ));
        } else {
            events.push(GameEvent::NotEnoughResources {
                resource: "Чипы".to_string(),
                required: required_chips,
                available: state.inventory.chips,
            });
        }
        
        events
    }
    
    pub fn activate_defense(&self, state: &mut GameState) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if state.upgrades.defense {
            events.push(GameEvent::LogMessage("Защита уже активирована".to_string()));
            return events;
        }
        
        if state.inventory.plasma >= self.config.defense_activation_cost {
            state.inventory.plasma -= self.config.defense_activation_cost;
            state.upgrades.defense = true;
            
            events.push(GameEvent::DefenseActivated);
            events.push(GameEvent::LogMessage(
                format!("Система защиты активирована! (-{} плазмы)", 
                    self.config.defense_activation_cost)
            ));
        } else {
            events.push(GameEvent::NotEnoughResources {
                resource: "Плазма".to_string(),
                required: self.config.defense_activation_cost,
                available: state.inventory.plasma,
            });
        }
        
        events
    }
    
    pub fn upgrade_defense(&self, state: &mut GameState) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if !state.upgrades.defense {
            events.push(GameEvent::LogMessage("Сначала активируйте защиту!".to_string()));
            return events;
        }
        
        if state.upgrades.defense_level >= self.config.defense_max_level {
            events.push(GameEvent::LogMessage("Защита уже максимально улучшена!".to_string()));
            return events;
        }
        
        let chips_cost = (state.upgrades.defense_level + 1) * 10;
        let plasma_cost = 1 + state.upgrades.defense_level / 2;
        
        if state.inventory.chips >= chips_cost && state.inventory.plasma >= plasma_cost {
            state.inventory.chips -= chips_cost;
            state.inventory.plasma -= plasma_cost;
            state.upgrades.defense_level += 1;
            
            events.push(GameEvent::UpgradePurchased {
                upgrade_type: "defense".to_string(),
                level: state.upgrades.defense_level,
            });
            events.push(GameEvent::LogMessage(
                format!("Улучшена защита до уровня {}! (-{} чипов, -{} плазмы)", 
                    state.upgrades.defense_level, chips_cost, plasma_cost)
            ));
        } else {
            if state.inventory.chips < chips_cost {
                events.push(GameEvent::NotEnoughResources {
                    resource: "Чипы".to_string(),
                    required: chips_cost,
                    available: state.inventory.chips,
                });
            }
            if state.inventory.plasma < plasma_cost {
                events.push(GameEvent::NotEnoughResources {
                    resource: "Плазма".to_string(),
                    required: plasma_cost,
                    available: state.inventory.plasma,
                });
            }
        }
        
        events
    }
}