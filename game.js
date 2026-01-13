// Game configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ball class
class Ball {
    constructor(x, y, radius, color, bounds) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.bounds = bounds;
    }

    update() {
        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x - this.radius < this.bounds.left || this.x + this.radius > this.bounds.right) {
            this.vx *= -1;
            this.x = Math.max(this.bounds.left + this.radius, Math.min(this.bounds.right - this.radius, this.x));
        }

        if (this.y - this.radius < this.bounds.top || this.y + this.radius > this.bounds.bottom) {
            this.vy *= -1;
            this.y = Math.max(this.bounds.top + this.radius, Math.min(this.bounds.bottom - this.radius, this.y));
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Add a subtle shine effect
        const gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3, 
            this.y - this.radius * 0.3, 
            0,
            this.x, 
            this.y, 
            this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Particle class for distraction
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.life = 1;
        this.decay = 0.01;
        this.size = Math.random() * 4 + 2;
        this.hue = Math.random() * 360;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 70%, 50%, ${this.life})`;
        ctx.fill();
    }
}

// Game state
const game = {
    leftBall: null,
    rightBall: null,
    targetHSL: { h: 220, s: 70, l: 50 },
    currentHSL: { h: 220, s: 70, l: 50 },
    bestScore: 0,
    animationId: null,
    particles: [],
    time: 0,
    
    // Distraction flags
    distractions: {
        movingBg: false,
        colorNoise: false,
        flashing: false,
        particles: false,
        rotating: false
    }
};

// Initialize game
function init() {
    // Left side (target ball)
    const leftBounds = {
        left: 20,
        right: 420,
        top: 20,
        bottom: canvas.height - 20
    };
    
    // Right side (player's ball)
    const rightBounds = {
        left: 580,
        right: 980,
        top: 20,
        bottom: canvas.height - 20
    };

    // Generate random target color (keeping it in the blue range mostly)
    game.targetHSL = {
        h: Math.random() * 80 + 180, // 180-260 (blue range)
        s: Math.random() * 40 + 50,   // 50-90
        l: Math.random() * 30 + 35    // 35-65
    };

    const targetColor = hslToString(game.targetHSL);
    
    game.leftBall = new Ball(
        leftBounds.left + (leftBounds.right - leftBounds.left) / 2,
        canvas.height / 2,
        40,
        targetColor,
        leftBounds
    );

    game.rightBall = new Ball(
        rightBounds.left + (rightBounds.right - rightBounds.left) / 2,
        canvas.height / 2,
        40,
        hslToString(game.currentHSL),
        rightBounds
    );

    updateStats();
}

// Convert HSL to string
function hslToString(hsl) {
    return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

// Calculate color difference
function calculateColorDifference(hsl1, hsl2) {
    // Normalize hue difference (circular)
    let hueDiff = Math.abs(hsl1.h - hsl2.h);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;
    
    const satDiff = Math.abs(hsl1.s - hsl2.s);
    const lightDiff = Math.abs(hsl1.l - hsl2.l);
    
    // Weighted difference (hue is most important)
    return (hueDiff * 2 + satDiff + lightDiff) / 4;
}

// Update statistics display
function updateStats() {
    const diff = calculateColorDifference(game.targetHSL, game.currentHSL);
    const accuracy = Math.max(0, 100 - diff);
    
    const accuracyEl = document.getElementById('accuracy');
    accuracyEl.textContent = `${accuracy.toFixed(1)}%`;
    
    // Color code the accuracy
    accuracyEl.className = 'stat-value';
    if (accuracy >= 90) {
        accuracyEl.classList.add('accuracy-good');
    } else if (accuracy >= 70) {
        accuracyEl.classList.add('accuracy-medium');
    } else {
        accuracyEl.classList.add('accuracy-poor');
    }
    
    document.getElementById('colorDiff').textContent = diff.toFixed(1);
    
    if (accuracy > game.bestScore) {
        game.bestScore = accuracy;
        document.getElementById('bestScore').textContent = `${game.bestScore.toFixed(1)}%`;
    }
}

// Draw background with optional distractions
function drawBackground() {
    // Base background
    if (game.distractions.movingBg) {
        // Animated gradient background
        const gradient = ctx.createLinearGradient(
            0, 
            0, 
            canvas.width, 
            canvas.height + Math.sin(game.time * 0.02) * 100
        );
        gradient.addColorStop(0, '#0a0a0a');
        gradient.addColorStop(0.5, `hsl(${game.time % 360}, 20%, 10%)`);
        gradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw dividing line and boxes
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 3;
    
    // Left box
    ctx.strokeRect(20, 20, 400, canvas.height - 40);
    
    // Right box
    ctx.strokeRect(580, 20, 400, canvas.height - 40);
    
    // Center divider with label
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#666';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET', 220, 45);
    ctx.fillText('YOUR BALL', 780, 45);

    // Rotating patterns distraction
    if (game.distractions.rotating) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        // Left side pattern
        ctx.translate(220, 200);
        ctx.rotate(game.time * 0.02);
        for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.strokeStyle = `hsl(${i * 45}, 70%, 50%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(100, 0);
            ctx.stroke();
        }
        
        // Right side pattern
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(780, 200);
        ctx.rotate(-game.time * 0.02);
        for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.strokeStyle = `hsl(${i * 45 + 180}, 70%, 50%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(100, 0);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Flashing lights distraction
    if (game.distractions.flashing) {
        const flash = Math.sin(game.time * 0.1) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(${255 * flash}, ${100 * flash}, ${200 * flash}, ${flash * 0.1})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Color noise distraction
    if (game.distractions.colorNoise) {
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `hsla(${Math.random() * 360}, 70%, 50%, 0.1)`;
            ctx.fillRect(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.random() * 20 + 5,
                Math.random() * 20 + 5
            );
        }
    }
}

// Animation loop
function animate() {
    game.time++;
    
    // Clear and draw background
    drawBackground();
    
    // Update and draw balls
    game.leftBall.update();
    game.rightBall.update();
    
    game.leftBall.draw(ctx);
    game.rightBall.draw(ctx);
    
    // Particle system
    if (game.distractions.particles) {
        // Spawn new particles
        if (Math.random() < 0.3) {
            game.particles.push(
                new Particle(Math.random() * canvas.width, Math.random() * canvas.height)
            );
        }
        
        // Update and draw particles
        game.particles = game.particles.filter(particle => {
            particle.update();
            particle.draw(ctx);
            return particle.life > 0;
        });
    } else {
        game.particles = [];
    }
    
    game.animationId = requestAnimationFrame(animate);
}

// Slider event listeners
const hueSlider = document.getElementById('hueSlider');
const satSlider = document.getElementById('saturationSlider');
const lightSlider = document.getElementById('lightnessSlider');

hueSlider.addEventListener('input', (e) => {
    game.currentHSL.h = parseFloat(e.target.value);
    document.getElementById('hueValue').textContent = Math.round(game.currentHSL.h);
    game.rightBall.color = hslToString(game.currentHSL);
    updateStats();
});

satSlider.addEventListener('input', (e) => {
    game.currentHSL.s = parseFloat(e.target.value);
    document.getElementById('saturationValue').textContent = Math.round(game.currentHSL.s);
    game.rightBall.color = hslToString(game.currentHSL);
    updateStats();
    
    // Update slider background
    e.target.style.background = `linear-gradient(to right, hsl(${game.currentHSL.h}, 0%, 50%), hsl(${game.currentHSL.h}, 100%, 50%))`;
});

lightSlider.addEventListener('input', (e) => {
    game.currentHSL.l = parseFloat(e.target.value);
    document.getElementById('lightnessValue').textContent = Math.round(game.currentHSL.l);
    game.rightBall.color = hslToString(game.currentHSL);
    updateStats();
    
    // Update slider background
    e.target.style.background = `linear-gradient(to right, hsl(${game.currentHSL.h}, ${game.currentHSL.s}%, 0%), hsl(${game.currentHSL.h}, ${game.currentHSL.s}%, 50%), hsl(${game.currentHSL.h}, ${game.currentHSL.s}%, 100%))`;
});

// Button event listeners
document.getElementById('newRoundBtn').addEventListener('click', () => {
    init();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    game.currentHSL = { h: 220, s: 70, l: 50 };
    hueSlider.value = 220;
    satSlider.value = 70;
    lightSlider.value = 50;
    document.getElementById('hueValue').textContent = '220';
    document.getElementById('saturationValue').textContent = '70';
    document.getElementById('lightnessValue').textContent = '50';
    game.rightBall.color = hslToString(game.currentHSL);
    updateStats();
});

// Distraction checkboxes
document.getElementById('movingBgCheck').addEventListener('change', (e) => {
    game.distractions.movingBg = e.target.checked;
});

document.getElementById('colorNoiseCheck').addEventListener('change', (e) => {
    game.distractions.colorNoise = e.target.checked;
});

document.getElementById('flashingCheck').addEventListener('change', (e) => {
    game.distractions.flashing = e.target.checked;
});

document.getElementById('particlesCheck').addEventListener('change', (e) => {
    game.distractions.particles = e.target.checked;
});

document.getElementById('rotatingCheck').addEventListener('change', (e) => {
    game.distractions.rotating = e.target.checked;
});

// Start the game
init();
animate();
