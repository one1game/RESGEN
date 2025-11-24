use crate::game::{GameState, GameEvent};
use crate::game::config::GameConfig;
use rand::Rng;

#[derive(Clone)]
pub struct RebelSystem;

impl RebelSystem {
    pub fn new() -> Self {
        Self
    }
    
    pub fn update_rebel_activity(&self, state: &mut GameState, config: &GameConfig) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if !state.is_day {
            let old_activity = state.rebel_activity;
            state.rebel_activity = state.rebel_activity.saturating_add(config.rebels.activity_increase);
            
            if state.rebel_activity > config.rebels.max_activity {
                state.rebel_activity = config.rebels.max_activity;
            }
            
            if state.rebel_activity != old_activity && 
               state.rebel_activity % config.rebels.log_activity_threshold == 0 {
                events.push(GameEvent::LogMessage(
                    format!("🌙 Активность повстанцев: {}/{}", state.rebel_activity, config.rebels.max_activity)
                ));
            }
        } else {
            if state.rebel_activity > 0 {
                let old_activity = state.rebel_activity;
                state.rebel_activity = state.rebel_activity.saturating_sub(config.rebels.activity_decrease);
                
                if state.rebel_activity == 0 && old_activity > 0 {
                    events.push(GameEvent::LogMessage("☀️ Повстанцы отступили".to_string()));
                }
            }
        }
        
        events
    }
    
    pub fn check_rebel_attack(&self, state: &mut GameState, config: &GameConfig) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if state.is_day || state.rebel_activity == 0 {
            return events;
        }
        
        let mut rng = rand::thread_rng();
        
        let attack_chance = config.rebels.base_attack_chance + 
            (state.rebel_activity as f64 * config.rebels.activity_bonus_per_level);
        
        let final_attack_chance = attack_chance.min(config.rebels.max_attack_chance);
        
        if rng.gen::<f64>() < final_attack_chance {
            let attack_successful = self.execute_attack(state, config);
            
            if attack_successful {
                let attack_events = self.handle_successful_attack(state, config);
                
                // ПРОВЕРЯЕМ, БЫЛ ЛИ НАНЕСЕН РЕАЛЬНЫЙ УЩЕРБ
                if !attack_events.is_empty() {
                    events.extend(attack_events);
                    
                    // УВЕЛИЧИВАЕМ АКТИВНОСТЬ ПОСЛЕ УСПЕШНОЙ АТАКИ С УЩЕРБОМ
                    if state.rebel_activity < config.rebels.max_activity {
                        state.rebel_activity += 1;
                    }
                }
                // ЕСЛИ УЩЕРБА НЕ БЫЛО - НИЧЕГО НЕ ДОБАВЛЯЕМ В СОБЫТИЯ
            } else {
                // АТАКА ОТРАЖЕНА
                if config.rebels.enable_defense_messages {
                    events.push(GameEvent::LogMessage(
                        "🛡️ Защита отразила атаку повстанцев!".to_string()
                    ));
                }
                
                if state.rebel_activity > 0 {
                    state.rebel_activity -= 1;
                }
            }
        }
        
        events
    }
    
    fn execute_attack(&self, state: &GameState, config: &GameConfig) -> bool {
        if state.upgrades.defense {
            let defense_power = config.rebels.defense_base_power + 
                state.upgrades.defense_level * config.rebels.defense_level_bonus;
            let mut rng = rand::thread_rng();
            
            let defense_chance = defense_power as f64 / 100.0;
            
            if rng.gen::<f64>() < defense_chance {
                return false; // Атака отражена
            }
        }
        
        true // Атака успешна
    }
    
    fn handle_successful_attack(&self, state: &mut GameState, config: &GameConfig) -> Vec<GameEvent> {
        let mut events = Vec::new();
        let mut rng = rand::thread_rng();
        let mut damage_dealt = false;

        match state.rebel_activity {
            1..=3 => {
                if state.inventory.trash > 0 {
                    let stolen = ((state.inventory.trash as f64) * config.rebels.steal_rates.low_activity_trash) as u32;
                    let stolen = stolen.max(1).min(state.inventory.trash);
                    if stolen > 0 {
                        state.inventory.trash = state.inventory.trash.saturating_sub(stolen);
                        if config.rebels.enable_attack_messages {
                            events.push(GameEvent::LogMessage(
                                format!("🌙 Повстанцы украли {} мусора", stolen)
                            ));
                        }
                        damage_dealt = true;
                    }
                }
            },
            4..=6 => {
                if state.inventory.coal > 0 {
                    let stolen = ((state.inventory.coal as f64) * config.rebels.steal_rates.medium_activity_coal) as u32;
                    let stolen = stolen.max(1).min(state.inventory.coal);
                    if stolen > 0 {
                        state.inventory.coal = state.inventory.coal.saturating_sub(stolen);
                        if config.rebels.enable_attack_messages {
                            events.push(GameEvent::LogMessage(
                                format!("🌙 Повстанцы украли {} угля", stolen)
                            ));
                        }
                        damage_dealt = true;
                        
                        if state.coal_enabled && state.inventory.coal == 0 {
                            state.coal_enabled = false;
                            events.push(GameEvent::CoalDepleted);
                            if config.rebels.enable_attack_messages {
                                events.push(GameEvent::LogMessage(
                                    "🔋 Уголь закончился! ТЭЦ отключена".to_string()
                                ));
                            }
                        }
                    }
                }
            },
            7..=10 => {
                // ВЫСОКАЯ АКТИВНОСТЬ - МОЖЕТ БЫТЬ НЕСКОЛЬКО ВИДОВ УЩЕРБА
                let mut damage_messages = Vec::new();
                
                if state.inventory.chips > 0 {
                    let stolen = ((state.inventory.chips as f64) * config.rebels.steal_rates.high_activity_chips) as u32;
                    let stolen = stolen.max(1).min(state.inventory.chips);
                    if stolen > 0 {
                        state.inventory.chips = state.inventory.chips.saturating_sub(stolen);
                        damage_messages.push(format!("похищено {} чипов", stolen));
                        damage_dealt = true;
                    }
                }
                
                if state.coal_enabled && rng.gen::<f64>() < config.rebels.disable_chances.coal_plant_disable {
                    state.coal_enabled = false;
                    damage_messages.push("ТЭЦ выведена из строя".to_string());
                    damage_dealt = true;
                }
                
                if state.computational_power > 0 && rng.gen::<f64>() < config.rebels.disable_chances.power_reset {
                    let lost = ((state.computational_power as f64) * config.rebels.power_reset_rate) as u32;
                    let lost = lost.max(1).min(state.computational_power);
                    if lost > 0 {
                        state.computational_power = state.computational_power.saturating_sub(lost);
                        damage_messages.push(format!("сброшено {} мощности", lost));
                        damage_dealt = true;
                    }
                }
                
                // СОЗДАЕМ СООБЩЕНИЕ ТОЛЬКО ЕСЛИ БЫЛ НАНЕСЕН УЩЕРБ
                if damage_dealt && config.rebels.enable_attack_messages {
                    if damage_messages.len() == 1 {
                        events.push(GameEvent::LogMessage(
                            format!("🌙 Мощная атака повстанцев! {}", damage_messages[0])
                        ));
                    } else {
                        let damage_text = damage_messages.join(", ");
                        events.push(GameEvent::LogMessage(
                            format!("🌙 Мощная атака повстанцев! {}", damage_text)
                        ));
                    }
                }
            },
            _ => {}
        }

        // ВОЗВРАЩАЕМ СОБЫТИЯ ТОЛЬКО ЕСЛИ БЫЛ НАНЕСЕН УЩЕРБ
        if damage_dealt {
            events
        } else {
            Vec::new() // Пустой вектор - ущерба не было
        }
    }
}