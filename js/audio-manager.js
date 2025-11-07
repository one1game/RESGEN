// ======== audio-manager.js ========
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const audioPlayer = new Audio('https://spritelayerradio.com/listen/classic/classic.mp3');
audioPlayer.loop = true;

function setupRadioPlayer() {
    if (!playBtn || !pauseBtn || !volumeSlider) return;
    
    playBtn.addEventListener('click', () => {
        audioPlayer.play();
        radioState.playing = true;
        log('Радио включено');
        voiceAlerts.alertSystem('Радио включено');
        saveGame();
    });
    
    pauseBtn.addEventListener('click', () => {
        audioPlayer.pause();
        radioState.playing = false;
        log('Радио выключено');
        voiceAlerts.alertSystem('Радио выключено');
        saveGame();
    });
    
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        audioPlayer.volume = volume;
        radioState.volume = volume;
        saveGame();
    });
    
    // Восстановление сохраненного состояния
    audioPlayer.volume = radioState.volume;
    if (volumeSlider) {
        volumeSlider.value = radioState.volume;
    }
}