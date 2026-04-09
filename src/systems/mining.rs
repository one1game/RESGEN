// ======== src/systems/mining.rs (ИСПРАВЛЕННАЯ ВЕРСИЯ - ДЛЯ WASM) ========

use rand::Rng;
use crate::game::{GameState, GameEvent};

#[derive(Clone)]
pub struct MiningSystem {
    config: crate::game::config::MiningConfig,
}

impl MiningSystem {
    pub fn new(config: crate::game::config::MiningConfig) -> Self {
        Self { config }
    }
    
    fn get_current_time_ms() -> u64 {
        // Используем performance.now() через web_sys для WASM
        if let Some(window) = web_sys::window() {
            if let Some(performance) = window.performance() {
                return performance.now() as u64;
            }
        }
        // Fallback: используем Date.now()
        js_sys::Date::now() as u64
    }
    
    fn mine_resources_common(&self, state: &mut GameState, is_auto: bool) -> Vec<GameEvent> {
        let mut events = Vec::new();
    
        if !state.is_ai_active() {
            if !is_auto {
                events.push(GameEvent::LogMessage("❌ Система неактивна! Включите ТЭЦ или дождитесь дня".to_string()));
            }
            return events;
        }
        
        // ========== ОБНОВЛЯЕМ ВРЕМЯ ПОСЛЕДНЕГО КЛИКА ==========
        let now = Self::get_current_time_ms();
        let time_since_last_click = if state.last_click_time == 0 {
            1000 // Если первый клик, считаем как 1 секунду
        } else {
            let diff = now.saturating_sub(state.last_click_time);
            if diff == 0 { 100 } else { diff } // Минимум 100 мс
        };
        state.last_click_time = now;
        
        // ========== ПРОВЕРКА: ЕСЛИ ТУРБИНА ПЕРЕГРЕТА НА 100% - ДОБЫЧА НЕВОЗМОЖНА ==========
        if state.turbine_heat >= 100 {
            if !is_auto {
                events.push(GameEvent::LogMessage(
                    "🔥 Турбина перегрета! Дождитесь остывания...".to_string()
                ));
            }
            return events;
        }
        
        // ========== РАСЧЕТ НАГРЕВА В ЗАВИСИМОСТИ ОТ ЧАСТОТЫ КЛИКОВ ==========
        // Базовый нагрев
        let base_heat = if is_auto { 1u32 } else { 2u32 };
        let heat_reduction = state.turbine_upgrade_level;
        
        // РАСЧЕТ БОНУСА ЗА БЫСТРЫЕ КЛИКИ
        let frequency_bonus = if !is_auto && time_since_last_click < 500 {
            // Клики чаще чем 0.5 сек - бонус к нагреву
            let bonus = ((500 - time_since_last_click) / 50) as u32;
            bonus.min(5) // Максимум +5 к нагреву
        } else {
            0
        };
        
        // Штраф за медленные клики (больше 2 секунд) - меньше нагрев
        let frequency_penalty = if !is_auto && time_since_last_click > 2000 {
            let penalty = ((time_since_last_click - 2000) / 500) as u32;
            penalty.min(3) // Максимум -3 к нагреву
        } else {
            0
        };
        
        let mut actual_heat = base_heat.saturating_sub(heat_reduction).max(1);
        actual_heat = actual_heat + frequency_bonus;
        actual_heat = actual_heat.saturating_sub(frequency_penalty);
        actual_heat = actual_heat.max(1);
        
        let old_heat = state.turbine_heat;
        let new_heat = (state.turbine_heat + actual_heat).min(100);
        state.turbine_heat = new_heat;
        
        // ТОЛЬКО ОДНО УВЕДОМЛЕНИЕ - когда достигли 100%
        if new_heat >= 100 && old_heat < 100 {
            state.turbine_cooling = true;
            events.push(GameEvent::LogMessage(
                "⚠️ ТУРБИНА ПЕРЕГРЕТА! Дождитесь остывания...".to_string()
            ));
        }
        
        // Сбрасываем флаг остывания (мы снова греем)
        if state.turbine_cooling && new_heat < 100 {
            state.turbine_cooling = false;
        }
        
        // ========== ДОБЫЧА РЕСУРСОВ ==========
        let mut rng = rand::thread_rng();
        
        // Базовые шансы с учётом улучшений
        let mut coal_chance = self.config.base_chances.coal + 
            if state.coal_enabled { self.config.coal_bonus } else { 0.0 } +
            (state.upgrades.mining as f64 * self.config.upgrade_bonus);
        
        let mut trash_chance = self.config.base_chances.trash +
            (state.upgrades.mining as f64 * 0.005);
        
        let mut ore_chance = self.config.base_chances.ore + 
            (state.upgrades.mining as f64 * 0.003);
        
        // Применяем дебафф от технологического саботажа
        let debuff = if state.mining_debuff_remaining > 0 {
            1.0 - state.mining_debuff_percent as f64
        } else {
            1.0
        };
        
        coal_chance = coal_chance * debuff;
        trash_chance = trash_chance * debuff;
        ore_chance = ore_chance * debuff;
        
        // Дополнительный дебафф для автокликера (психологическая атака)
        let auto_debuff = if is_auto && state.autoclick_debuff_remaining > 0 {
            1.0 - state.autoclick_debuff_percent as f64
        } else {
            1.0
        };
        
        let final_coal_chance = coal_chance * auto_debuff;
        let final_trash_chance = trash_chance * auto_debuff;
        let final_ore_chance = ore_chance * auto_debuff;
        
        let is_critical = rng.gen::<f64>() < self.config.critical_chance;
        let multiplier = if is_critical { self.config.critical_multiplier } else { 1 };
        
        // Добыча угля
        if rng.gen::<f64>() < final_coal_chance {
            let amount = multiplier;
            state.inventory.coal += amount;
            state.total_mined += amount;
            state.total_coal_mined += amount;
            
            if !is_auto {
                events.push(GameEvent::ResourceMined {
                    resource: "coal".to_string(),
                    amount,
                    critical: is_critical,
                });
            }
            
            if !state.coal_unlocked {
                state.coal_unlocked = true;
            }
        }
        
        // Добыча мусора
        if rng.gen::<f64>() < final_trash_chance {
            let amount = multiplier;
            state.inventory.trash += amount;
            state.total_mined += amount;
            state.total_trash_mined += amount;
            
            if !is_auto {
                events.push(GameEvent::ResourceMined {
                    resource: "trash".to_string(),
                    amount,
                    critical: is_critical,
                });
            }
            
            if !state.trash_unlocked {
                state.trash_unlocked = true;
            }
        }
        
        // Добыча руды
        if rng.gen::<f64>() < final_ore_chance {
            let amount = multiplier;
            state.inventory.ore += amount;
            state.total_mined += amount;
            state.total_ore_mined += amount;
            
            if !is_auto {
                events.push(GameEvent::ResourceMined {
                    resource: "ore".to_string(),
                    amount,
                    critical: is_critical,
                });
            }
        }
        
        events
    }
    
    pub fn mine_resources(&self, state: &mut GameState) -> Vec<GameEvent> {
        self.mine_resources_common(state, false)
    }
    
    pub fn auto_mine_resources(&self, state: &mut GameState) -> Vec<GameEvent> {
        self.mine_resources_common(state, true)
    }
    
    pub fn passive_mining(&self, state: &mut GameState) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        if !state.is_passive_mining_active() {
            return events;
        }
        
        let mut rng = rand::thread_rng();
        
        let debuff = if state.mining_debuff_remaining > 0 {
            1.0 - state.mining_debuff_percent as f64
        } else {
            1.0
        };
        
        let coal_chance = self.config.passive_chances.coal * debuff;
        let trash_chance = self.config.passive_chances.trash * debuff;
        let ore_chance = self.config.passive_chances.ore * debuff;
        
        if rng.gen::<f64>() < coal_chance {
            state.inventory.coal += 1;
            state.total_mined += 1;
            state.total_coal_mined += 1;
            
            events.push(GameEvent::ResourceMined {
                resource: "coal".to_string(),
                amount: 1,
                critical: false,
            });
            
            if !state.coal_unlocked {
                state.coal_unlocked = true;
            }
        }
        
        if rng.gen::<f64>() < trash_chance {
            state.inventory.trash += 1;
            state.total_mined += 1;
            state.total_trash_mined += 1;
            
            events.push(GameEvent::ResourceMined {
                resource: "trash".to_string(),
                amount: 1,
                critical: false,
            });
            
            if !state.trash_unlocked {
                state.trash_unlocked = true;
            }
        }
        
        if rng.gen::<f64>() < ore_chance {
            state.inventory.ore += 1;
            state.total_mined += 1;
            state.total_ore_mined += 1;
            
            events.push(GameEvent::ResourceMined {
                resource: "ore".to_string(),
                amount: 1,
                critical: false,
            });
        }
        
        events
    }
}