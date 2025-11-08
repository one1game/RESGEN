// ======== supabase-cloud.js ========
class CloudSaveManager {
    constructor() {
        this.supabase = null;
        this.playerId = this.getPlayerId();
        this.isOnline = false;
        this.init();
    }

    getPlayerId() {
        let id = localStorage.getItem('corebox_player_id');
        if (!id) {
            id = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('corebox_player_id', id);
        }
        return id;
    }

    async init() {
        try {
            // ЗАМЕНИТЕ НА ВАШИ РЕАЛЬНЫЕ КЛЮЧИ!
            const SUPABASE_URL = 'https://pvweieworrnzjkixowam.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d2VpZXdvcnJuempraXhvd2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjI4MzEsImV4cCI6MjA3ODE5ODgzMX0.ciTGRjOad4u6Wzmg77aka5kNRaHCwYpqe4NSWgasTTY';
            
            // Используем глобальный supabase из CDN
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            
            // Проверяем подключение
            const { data, error } = await this.supabase
                .from('game_saves')
                .select('id')
                .limit(1);
            
            this.isOnline = !error;
            console.log('✅ Cloud saves:', this.isOnline ? 'ONLINE' : 'OFFLINE');
        } catch (error) {
            console.log('❌ Cloud saves: OFFLINE');
            this.isOnline = false;
        }
    }

    async saveGame(saveData) {
        if (!this.isOnline) return false;

        try {
            const { error } = await this.supabase
                .from('game_saves')
                .upsert({
                    player_id: this.playerId,
                    save_data: JSON.stringify(saveData),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Cloud save failed:', error);
            return false;
        }
    }

    async loadGame() {
        if (!this.isOnline) return null;

        try {
            const { data, error } = await this.supabase
                .from('game_saves')
                .select('save_data')
                .eq('player_id', this.playerId)
                .single();

            if (error) throw error;
            return JSON.parse(data.save_data);
        } catch (error) {
            console.error('Cloud load failed:', error);
            return null;
        }
    }
}

// Создаем глобальную переменную сразу
window.cloudSaveManager = new CloudSaveManager();