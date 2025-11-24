use crate::game::{GameState, GameEvent};
use crate::game::config::EconomyConfig;

#[derive(Clone)]
pub struct EconomySystem {
    config: EconomyConfig,
}

impl EconomySystem {
    pub fn new(config: EconomyConfig) -> Self {
        Self { config }
    }
    
    pub fn buy_resource(&self, state: &mut GameState, resource: &str) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        match resource {
            "coal" => {
                let price = self.config.trade_prices.coal_buy;
                if state.tng >= price {
                    state.tng -= price;
                    state.inventory.coal += 1;
                    events.push(GameEvent::LogMessage(format!("Куплен 1 уголь за {}₸", price)));
                } else {
                    events.push(GameEvent::LogMessage("Недостаточно денег".to_string()));
                }
            }
            "chips" => {
                let price = self.config.trade_prices.chips_buy;
                if state.tng >= price {
                    state.tng -= price;
                    state.inventory.chips += 1;
                    events.push(GameEvent::LogMessage(format!("Куплен 1 чип за {}₸", price)));
                } else {
                    events.push(GameEvent::LogMessage("Недостаточно денег".to_string()));
                }
            }
            "plasma" => {
                let price = self.config.trade_prices.plasma_buy;
                if state.tng >= price {
                    state.tng -= price;
                    state.inventory.plasma += 1;
                    events.push(GameEvent::LogMessage(format!("Куплен 1 плазма за {}₸", price)));
                } else {
                    events.push(GameEvent::LogMessage("Недостаточно денег".to_string()));
                }
            }
            _ => {
                events.push(GameEvent::LogMessage("Неизвестный ресурс".to_string()));
            }
        }
        
        events
    }
    
    pub fn sell_resource(&self, state: &mut GameState, resource: &str) -> Vec<GameEvent> {
        let mut events = Vec::new();
        
        match resource {
            "coal" => {
                let price = self.config.trade_prices.coal_sell;
                if state.inventory.coal > 0 {
                    state.inventory.coal -= 1;
                    state.tng += price;
                    events.push(GameEvent::LogMessage(format!("Продан 1 уголь за {}₸", price)));
                } else {
                    events.push(GameEvent::LogMessage("Нет угля для продажи".to_string()));
                }
            }
            "trash" => {
                let price = self.config.trash_base_price;
                if state.inventory.trash > 0 {
                    state.inventory.trash -= 1;
                    state.tng += price;
                    events.push(GameEvent::LogMessage(format!("Продан 1 мусор за {}₸", price)));
                } else {
                    events.push(GameEvent::LogMessage("Нет мусора для продажи".to_string()));
                }
            }
            "chips" => {
                let price = self.config.trade_prices.chips_sell;
                if state.inventory.chips > 0 {
                    state.inventory.chips -= 1;
                    state.tng += price;
                    events.push(GameEvent::LogMessage(format!("Продан 1 чип за {}₸", price)));
                } else {
                    events.push(GameEvent::LogMessage("Нет чипов для продажи".to_string()));
                }
            }
            "plasma" => {
                let price = self.config.trade_prices.plasma_sell;
                if state.inventory.plasma > 0 {
                    state.inventory.plasma -= 1;
                    state.tng += price;
                    events.push(GameEvent::LogMessage(format!("Продан 1 плазма за {}₸", price)));
                } else {
                    events.push(GameEvent::LogMessage("Нет плазмы для продажи".to_string()));
                }
            }
            _ => {
                events.push(GameEvent::LogMessage("Неизвестный ресурс".to_string()));
            }
        }
        
        events
    }
}