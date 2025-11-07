// ======== voice-alerts.js ========
class VoiceAlerts {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.selectedVoice = null;
        this.enabled = true;
        this.volume = 0.8;
        this.rate = 1.0;
        this.pitch = 1.0;
        
        this.init();
    }
    
    init() {
        this.loadVoices();
        
        if (this.synth.getVoices().length === 0) {
            this.synth.addEventListener('voiceschanged', () => {
                this.loadVoices();
            });
        }
    }
    
    loadVoices() {
        this.voices = this.synth.getVoices();
        
        const preferredVoices = [
            'Google русский',
            'Microsoft Irina - Russian',
            'Yandex Russian',
            'русский',
            'Russian'
        ];
        
        this.selectedVoice = this.voices.find(voice => 
            preferredVoices.some(pref => voice.name.includes(pref))
        ) || this.voices[0];
        
        console.log('Выбран голос:', this.selectedVoice?.name);
    }
    
    speak(text, urgent = false) {
        if (!this.enabled || !this.selectedVoice) return;
        
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.selectedVoice;
        utterance.volume = this.volume;
        utterance.rate = urgent ? 1.2 : this.rate;
        utterance.pitch = urgent ? 1.1 : this.pitch;
        
        if (urgent) {
            utterance.volume = 1.0;
        }
        
        this.synth.speak(utterance);
    }
    
    alertResourceFound(resource, amount, isCritical = false) {
        const messages = {
            'Уголь': [`Найден ${amount} уголь`, `Добыто ${amount} угля`],
            'Мусор': [`Найден ${amount} мусор`, `Обнаружено ${amount} мусора`],
            'Чипы': [`Найден ${amount} чип`, `Добыт ${amount} технологический чип`],
            'Плазма': [`Найдена ${amount} плазма`, `Обнаружена ${amount} плазма`]
        };
        
        const resourceMessages = messages[resource] || [`Найден ресурс: ${resource}`];
        const message = isCritical ? 
            `Критическая добыча! ${resourceMessages[1]}` : 
            resourceMessages[0];
            
        this.speak(message, isCritical);
    }
    
    alertRebelAttack(attackType, details = {}) {
        const messages = {
            'steal': `Повстанцы атаковали! Украдено ${details.amount} ${details.resource}`,
            'damage': `Повстанцы повредили систему добычи! Уровень понижен`,
            'destroy': `Повстанцы уничтожили ${details.amount} мусора`,
            'disable': `Повстанцы отключили защиту!`,
            'hack': `Критическая атака! ИИ взломан на ${details.minutes} минут`
        };
        
        const message = messages[attackType] || 'Повстанцы атаковали базу!';
        this.speak(message, true);
    }
    
    alertSystem(message, urgent = false) {
        this.speak(message, urgent);
    }
    
    toggleEnabled() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    setRate(rate) {
        this.rate = Math.max(0.1, Math.min(2, rate));
    }
    
    setPitch(pitch) {
        this.pitch = Math.max(0, Math.min(2, pitch));
    }
}

const voiceAlerts = new VoiceAlerts();