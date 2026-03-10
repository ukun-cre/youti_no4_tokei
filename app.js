const app = {
    settings: { sound: true, level: 1, count: 5 },
    state: { currentQuestion: 0, score: 0, combo: 0, maxCombo: 0, correctAnswer: 0 },
    
    // SVG素材（キャラクターとおやつ）
    svg: {
        dog: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#F39C12"/><circle cx="35" cy="40" r="5" fill="#FFF"/><circle cx="65" cy="40" r="5" fill="#FFF"/><circle cx="35" cy="40" r="2" fill="#000"/><circle cx="65" cy="40" r="2" fill="#000"/><ellipse cx="50" cy="60" rx="10" ry="6" fill="#000"/><path d="M 40 70 Q 50 80 60 70" stroke="#000" stroke-width="3" fill="none"/></svg>`,
        cat: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#E74C3C"/><polygon points="10,10 40,20 20,40" fill="#E74C3C"/><polygon points="90,10 60,20 80,40" fill="#E74C3C"/><circle cx="35" cy="45" r="5" fill="#FFF"/><circle cx="65" cy="45" r="5" fill="#FFF"/><circle cx="35" cy="45" r="2" fill="#000"/><circle cx="65" cy="45" r="2" fill="#000"/><polygon points="45,55 55,55 50,65" fill="#F1C40F"/><path d="M 40 70 Q 50 75 60 70" stroke="#000" stroke-width="3" fill="none"/></svg>`,
        snacks: [
            `<svg viewBox="0 0 100 100"><circle cx="50" cy="55" r="40" fill="#E74C3C"/><path d="M 50 15 Q 60 5 70 15" stroke="#27AE60" stroke-width="6" fill="none"/></svg>`, // りんご
            `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#D35400"/><circle cx="30" cy="40" r="4" fill="#6E2C00"/><circle cx="70" cy="45" r="4" fill="#6E2C00"/><circle cx="50" cy="70" r="4" fill="#6E2C00"/><circle cx="45" cy="25" r="4" fill="#6E2C00"/></svg>`, // クッキー
            `<svg viewBox="0 0 100 100"><rect x="30" y="40" width="40" height="20" rx="10" fill="#9B59B6"/><polygon points="10,30 30,40 30,60 10,70" fill="#9B59B6"/><polygon points="90,30 70,40 70,60 90,70" fill="#9B59B6"/></svg>` // キャンディ
        ]
    },
    
    // Audio Context (効果音生成用)
    audioCtx: null,
    
    init() {
        this.loadSettings();
        document.getElementById('menu-characters').innerHTML = `<div class="character">${this.svg.dog}</div><div class="character">${this.svg.cat}</div>`;
        this.updateSettingsUI();
    },

    loadSettings() {
        const saved = localStorage.getItem('mathAppConfigs');
        if(saved) this.settings = JSON.parse(saved);
        this.state.maxCombo = parseInt(localStorage.getItem('mathAppHighScore') || 0);
        document.getElementById('high-score').textContent = `${this.state.maxCombo} かい`;
    },

    saveSettings() {
        this.settings.level = parseInt(document.getElementById('select-level').value);
        this.settings.count = parseInt(document.getElementById('select-count').value);
        localStorage.setItem('mathAppConfigs', JSON.stringify(this.settings));
    },

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    },

    toggleSound() {
        this.settings.sound = !this.settings.sound;
        document.getElementById('btn-sound').textContent = this.settings.sound ? "ON" : "OFF";
        this.saveSettings();
    },

    playSound(type) {
        if (!this.settings.sound) return;
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        if (type === 'correct') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
            osc.start(); osc.stop(this.audioCtx.currentTime + 0.5);
        } else if (type === 'wrong') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(this.audioCtx.currentTime + 0.3);
        }
    },

    speak(text) {
        if (!this.settings.sound || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'ja-JP'; msg.rate = 0.9; msg.pitch = 1.2;
        window.speechSynthesis.speak(msg);
    },

    startGame() {
        this.state.currentQuestion = 0;
        this.state.combo = 0;
        document.getElementById('character-reaction').innerHTML = `<div class="character" id="game-char">${this.svg.dog}</div>`;
        this.switchView('view-game');
        this.nextQuestion();
    },

    quitGame() {
        this.switchView('view-menu');
    },

    nextQuestion() {
        if (this.state.currentQuestion >= this.settings.count) {
            this.speak("よくできました！");
            this.quitGame();
            return;
        }
        this.state.currentQuestion++;
        document.getElementById('question-counter').textContent = `${this.state.currentQuestion} / ${this.settings.count}`;
        
        // 問題生成ロジック
        let maxNum = this.settings.level === 1 ? 5 : (this.settings.level === 2 ? 10 : 20);
        let isAddition = Math.random() > 0.5;
        let num1, num2, ans;

        if (isAddition) {
            ans = Math.floor(Math.random() * maxNum) + 1;
            num1 = Math.floor(Math.random() * ans);
            num2 = ans - num1;
        } else {
            num1 = Math.floor(Math.random() * maxNum) + 1;
            num2 = Math.floor(Math.random() * num1);
            ans = num1 - num2;
        }
        
        this.state.correctAnswer = ans;
        const operatorStr = isAddition ? "+" : "-";
        const eqText = `${num1} ${operatorStr} ${num2}`;
        document.getElementById('equation-text').textContent = `${eqText} = ?`;
        
        // 音声読み上げ用フォーマット
        const readOperator = isAddition ? "たす" : "ひく";
        this.speak(`${num1} ${readOperator} ${num2} は？`);

        // おやつの描画
        const snackType = this.svg.snacks[Math.floor(Math.random() * this.svg.snacks.length)];
        let snacksHTML = '';
        const displayCount = isAddition ? ans : num1; // 足し算は答えの数、引き算は元の数だけおやつを表示
        for(let i=0; i<displayCount; i++) {
            snacksHTML += `<div class="snack-icon">${snackType}</div>`;
        }
        document.getElementById('snacks-container').innerHTML = snacksHTML;

        // 選択肢の生成 (正解 + ダミー2つ)
        let choices = new Set([ans]);
        while(choices.size < 3) {
            let dummy = ans + Math.floor(Math.random() * 5) - 2;
            if (dummy >= 0 && dummy <= maxNum && dummy !== ans) choices.add(dummy);
        }
        let choicesArr = Array.from(choices).sort(() => Math.random() - 0.5);
        
        let choicesHTML = '';
        choicesArr.forEach(c => {
            choicesHTML += `<button class="btn btn-choice" onclick="app.checkAnswer(${c})">${c}</button>`;
        });
        document.getElementById('choices-container').innerHTML = choicesHTML;
    },

    checkAnswer(selected) {
        const charEl = document.getElementById('game-char');
        if (selected === this.state.correctAnswer) {
            this.playSound('correct');
            this.speak("せいかい！すごいね！");
            charEl.classList.add('jump');
            this.fireConfetti();
            this.state.combo++;
            if(this.state.combo > this.state.maxCombo) {
                this.state.maxCombo = this.state.combo;
                localStorage.setItem('mathAppHighScore', this.state.maxCombo);
                document.getElementById('high-score').textContent = `${this.state.maxCombo} かい`;
            }
            setTimeout(() => {
                charEl.classList.remove('jump');
                this.nextQuestion();
            }, 1500);
        } else {
            this.playSound('wrong');
            this.speak("おしい！もういっかい！");
            this.state.combo = 0;
            charEl.innerHTML = this.svg.cat; // 不正解時は猫に切り替わる演出
            setTimeout(() => { charEl.innerHTML = this.svg.dog; }, 1500);
        }
    },

    // 紙吹雪エフェクト (Canvas API)
    fireConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        let particles = [];
        for(let i=0; i<50; i++) {
            particles.push({
                x: canvas.width / 2, y: canvas.height / 2,
                r: Math.random() * 6 + 4,
                dx: Math.random() * 10 - 5, dy: Math.random() * -10 - 5,
                color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#9B59B6'][Math.floor(Math.random()*4)]
            });
        }
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let active = false;
            particles.forEach(p => {
                p.x += p.dx; p.y += p.dy; p.dy += 0.5; // 重力
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fillStyle = p.color; ctx.fill();
                if (p.y < canvas.height) active = true;
            });
            if (active) requestAnimationFrame(animate);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        animate();
    }
};

window.onload = () => app.init();