// Configurações do jogo
const PLAYER_SIZE = 40;
const ZOMBIE_SIZE = 35;
const XP_ORB_SIZE = 10;
const BULLET_SIZE = 8;
const FIREBALL_SIZE = 20;
const LIGHTNING_RADIUS = 150;

// Variáveis do jogo
let canvas, ctx;
let player = {
    x: 0,
    y: 0,
    speed: 3.5,
    health: 100,
    maxHealth: 100,
    level: 1,
    xp: 0,
    nextLevelXp: 100,
    kills: 0,
    powers: {
        multishot: false,
        fire: false,
        lightning: false
    },
    direction: 0
};
let zombies = [];
let xpOrbs = [];
let bullets = [];
let fireballs = [];
let lightningStrikes = [];
let lastZombieSpawn = 0;
let zombieSpawnRate = 800;
let zombieSpeed = 1.2;
let zombieHealth = 40;
let zombiesPerWave = 15;
let wave = 1;
let gameTime = 0;
let lastWaveIncrease = 0;
let cameraOffset = { x: 0, y: 0 };
let keys = {};
let mouse = { x: 0, y: 0, clicked: false };
let lastShot = 0;
let shootDelay = 250;
let gameOver = false;
let gamePaused = false;

// Inicialização
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    // Controles
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Seleção de poderes
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', selectPowerup);
    });
    
    // Inicia o jogo
    gameLoop();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Controles
function handleKeyDown(e) {
    if (!gamePaused) keys[e.key.toLowerCase()] = true;
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left + cameraOffset.x;
    mouse.y = e.clientY - rect.top + cameraOffset.y;
    player.direction = Math.atan2(mouse.y - player.y, mouse.x - player.x);
}

function handleMouseDown(e) {
    if (e.button === 0 && !gamePaused) {
        mouse.clicked = true;
        shoot();
    }
}

function handleMouseUp(e) {
    if (e.button === 0) mouse.clicked = false;
}

// Loop principal
function gameLoop(timestamp = 0) {
    if (gameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gamePaused) {
        update(timestamp);
    }
    
    draw();
    
    requestAnimationFrame(gameLoop);
}

function update(timestamp) {
    // Movimento do jogador
    const moveX = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    const moveY = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    
    const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);
    const normalizedX = moveLength > 0 ? moveX / moveLength : 0;
    const normalizedY = moveLength > 0 ? moveY / moveLength : 0;
    
    player.x += normalizedX * player.speed;
    player.y += normalizedY * player.speed;
    
    // Câmera
    cameraOffset.x = player.x - canvas.width / 2;
    cameraOffset.y = player.y - canvas.height / 2;
    
    // Spawn de zumbis mais intenso
    if (timestamp - lastZombieSpawn > zombieSpawnRate && zombies.length < zombiesPerWave * 3) {
        spawnZombieWave();
        lastZombieSpawn = timestamp;
    }
    
    // Atualiza zumbis (com perseguição melhorada)
    zombies.forEach(zombie => {
        // Perseguição mais agressiva
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            zombie.x += (dx / distance) * zombie.speed;
            zombie.y += (dy / distance) * zombie.speed;
            zombie.direction = Math.atan2(dy, dx);
        }
        
        // Colisão com jogador
        if (distance < PLAYER_SIZE / 2 + ZOMBIE_SIZE / 2) {
            player.health -= 0.8;
            zombie.x -= (dx / distance) * 5;
            zombie.y -= (dy / distance) * 5;
            
            if (player.health <= 0) {
                gameOver = true;
                setTimeout(() => {
                    alert(`FIM DE JOGO!\nNível: ${player.level}\nZumbis mortos: ${player.kills}\nTempo: ${formatTime(gameTime)}`);
                    resetGame();
                }, 100);
            }
        }
    });
    
    zombies = zombies.filter(z => z.health > 0);
    
    // Ataques teleguiados
    updateProjectiles();
    
    // Orbes de XP
    updateXpOrbs();
    
    // Atualiza tempo e dificuldade
    if (!gamePaused) {
        gameTime += 16;
        
        // Aumenta dificuldade progressivamente
        if (gameTime - lastWaveIncrease > 120000) { // 2 minutos
            wave++;
            lastWaveIncrease = gameTime;
            zombiesPerWave += 5 + Math.floor(wave / 2);
            zombieSpeed += 0.15;
            zombieHealth += 8;
            zombieSpawnRate = Math.max(100, zombieSpawnRate - 50);
        }
    }
    
    updateUI();
}

function spawnZombieWave() {
    const count = 3 + Math.floor(wave * 1.5);
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.max(canvas.width, canvas.height) * 0.6 + Math.random() * 200;
            const x = player.x + Math.cos(angle) * distance;
            const y = player.y + Math.sin(angle) * distance;
            
            zombies.push({
                x: x,
                y: y,
                speed: zombieSpeed * (0.9 + Math.random() * 0.3),
                health: zombieHealth * (0.8 + Math.random() * 0.5),
                maxHealth: zombieHealth,
                burning: false,
                burnTime: 0,
                direction: 0
            });
        }, i * 300);
    }
}

function updateProjectiles() {
    // Balas normais/raio (teleguiadas)
    bullets.forEach(bullet => {
        if (bullet.target && zombies.some(z => z === bullet.target)) {
            // Persegue o alvo
            const dx = bullet.target.x - bullet.x;
            const dy = bullet.target.y - bullet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                bullet.dx = dx / dist;
                bullet.dy = dy / dist;
            }
        } else if (zombies.length > 0) {
            // Encontra novo alvo mais próximo
            let closest = null;
            let minDist = Infinity;
            
            zombies.forEach(zombie => {
                const dx = zombie.x - bullet.x;
                const dy = zombie.y - bullet.y;
                const dist = dx * dx + dy * dy;
                
                if (dist < minDist) {
                    minDist = dist;
                    closest = zombie;
                }
            });
            
            bullet.target = closest;
        }
        
        bullet.x += bullet.dx * bullet.speed;
        bullet.y += bullet.dy * bullet.speed;
        bullet.lifetime -= 16;
        
        // Colisão com zumbis
        if (bullet.target) {
            const dx = bullet.target.x - bullet.x;
            const dy = bullet.target.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ZOMBIE_SIZE / 2 + BULLET_SIZE / 2) {
                bullet.target.health -= bullet.damage;
                
                if (bullet.isLightning) {
                    lightningStrike(bullet.target.x, bullet.target.y);
                }
                
                if (bullet.target.health <= 0) {
                    spawnXpOrb(bullet.target.x, bullet.target.y, 15);
                    player.kills++;
                    player.xp += 15;
                    checkLevelUp();
                }
                
                bullet.lifetime = 0;
            }
        }
    });
    
    bullets = bullets.filter(b => b.lifetime > 0);
    
    // Bolas de fogo (teleguiadas)
    fireballs.forEach(fireball => {
        if (fireball.target && zombies.some(z => z === fireball.target)) {
            const dx = fireball.target.x - fireball.x;
            const dy = fireball.target.y - fireball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                fireball.dx = dx / dist;
                fireball.dy = dy / dist;
            }
        } else if (zombies.length > 0) {
            let closest = null;
            let minDist = Infinity;
            
            zombies.forEach(zombie => {
                const dx = zombie.x - fireball.x;
                const dy = zombie.y - fireball.y;
                const dist = dx * dx + dy * dy;
                
                if (dist < minDist) {
                    minDist = dist;
                    closest = zombie;
                }
            });
            
            fireball.target = closest;
        }
        
        fireball.x += fireball.dx * fireball.speed;
        fireball.y += fireball.dy * fireball.speed;
        fireball.lifetime -= 16;
        
        if (fireball.target) {
            const dx = fireball.target.x - fireball.x;
            const dy = fireball.target.y - fireball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ZOMBIE_SIZE / 2 + FIREBALL_SIZE / 2) {
                fireball.target.health -= fireball.damage;
                fireball.target.burning = true;
                fireball.target.burnTime = 1500;
                
                if (fireball.target.health <= 0) {
                    spawnXpOrb(fireball.target.x, fireball.target.y, 15);
                    player.kills++;
                    player.xp += 15;
                    checkLevelUp();
                }
                
                fireball.lifetime = 0;
            }
        }
    });
    
    fireballs = fireballs.filter(f => f.lifetime > 0);
    
    // Zumbis queimando
    zombies.forEach(zombie => {
        if (zombie.burning) {
            zombie.burnTime -= 16;
            zombie.health -= 0.8;
            
            if (zombie.burnTime <= 0) {
                zombie.burning = false;
            }
            
            if (zombie.health <= 0) {
                spawnXpOrb(zombie.x, zombie.y, 15);
                player.kills++;
                player.xp += 15;
                checkLevelUp();
            }
        }
    });
    
    // Raios
    lightningStrikes.forEach(lightning => {
        lightning.lifetime -= 16;
        
        if (lightning.lifetime <= 0) {
            // Dano em área com corrente
            let targets = [];
            zombies.forEach(zombie => {
                const dx = zombie.x - lightning.x;
                const dy = zombie.y - lightning.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < LIGHTNING_RADIUS) {
                    targets.push({
                        zombie: zombie,
                        distance: distance
                    });
                }
            });
            
            // Ordena por proximidade e pega os mais próximos
            targets.sort((a, b) => a.distance - b.distance);
            targets = targets.slice(0, 5);
            
            targets.forEach(target => {
                const damage = lightning.damage * (1 - target.distance / LIGHTNING_RADIUS);
                target.zombie.health -= damage;
                
                if (target.zombie.health <= 0) {
                    spawnXpOrb(target.zombie.x, target.zombie.y, 15);
                    player.kills++;
                    player.xp += 15;
                    checkLevelUp();
                }
            });
        }
    });
    
    lightningStrikes = lightningStrikes.filter(l => l.lifetime > 0);
}

function updateXpOrbs() {
    xpOrbs.forEach((orb, index) => {
        const dx = player.x - orb.x;
        const dy = player.y - orb.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
            const speed = 3 + (1 - distance / 150) * 5;
            orb.x += (dx / distance) * speed;
            orb.y += (dy / distance) * speed;
        }
        
        if (distance < PLAYER_SIZE / 2 + XP_ORB_SIZE / 2) {
            player.xp += orb.value;
            xpOrbs.splice(index, 1);
            checkLevelUp();
        }
    });
}

function shoot() {
    const now = Date.now();
    if (now - lastShot < shootDelay) return;
    lastShot = now;
    
    if (zombies.length === 0) return;
    
    // Encontra o zumbi mais próximo
    let closestZombie = null;
    let minDist = Infinity;
    
    zombies.forEach(zombie => {
        const dx = zombie.x - player.x;
        const dy = zombie.y - player.y;
        const dist = dx * dx + dy * dy;
        
        if (dist < minDist) {
            minDist = dist;
            closestZombie = zombie;
        }
    });
    
    if (player.powers.multishot) {
        // Tiro múltiplo (3 zumbis mais próximos)
        const targets = [...zombies]
            .sort((a, b) => {
                const distA = Math.pow(a.x - player.x, 2) + Math.pow(a.y - player.y, 2);
                const distB = Math.pow(b.x - player.x, 2) + Math.pow(b.y - player.y, 2);
                return distA - distB;
            })
            .slice(0, 3);
        
        targets.forEach(target => {
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            bullets.push({
                x: player.x,
                y: player.y,
                dx: dx / dist,
                dy: dy / dist,
                speed: 6,
                damage: 12,
                lifetime: 1200,
                target: target
            });
        });
    } else if (player.powers.fire) {
        // Bola de fogo
        const dx = closestZombie.x - player.x;
        const dy = closestZombie.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        fireballs.push({
            x: player.x,
            y: player.y,
            dx: dx / dist,
            dy: dy / dist,
            speed: 5,
            damage: 25,
            lifetime: 1500,
            target: closestZombie
        });
    } else {
        // Tiro normal ou de raio
        const dx = closestZombie.x - player.x;
        const dy = closestZombie.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        bullets.push({
            x: player.x,
            y: player.y,
            dx: dx / dist,
            dy: dy / dist,
            speed: player.powers.lightning ? 8 : 7,
            damage: player.powers.lightning ? 30 : 20,
            lifetime: 1200,
            target: closestZombie,
            isLightning: player.powers.lightning
        });
    }
}

function lightningStrike(x, y) {
    lightningStrikes.push({
        x: x,
        y: y,
        damage: 40,
        lifetime: 600
    });
}

function checkLevelUp() {
    if (player.xp >= player.nextLevelXp) {
        player.level++;
        player.xp -= player.nextLevelXp;
        player.nextLevelXp = Math.floor(player.nextLevelXp * 1.25);
        
        // A cada 5 níveis, escolher poder
        if (player.level % 5 === 0) {
            showPowerupCards();
        }
    }
}

function showPowerupCards() {
    gamePaused = true;
    document.getElementById('powerupLevel').textContent = player.level;
    document.getElementById('powerupScreen').style.display = 'flex';
}

function selectPowerup(e) {
    const power = e.currentTarget.getAttribute('data-power');
    
    switch (power) {
        case 'lightning':
            player.powers.lightning = true;
            break;
        case 'fire':
            player.powers.fire = true;
            break;
        case 'multishot':
            player.powers.multishot = true;
            break;
    }
    
    document.getElementById('powerupScreen').style.display = 'none';
    gamePaused = false;
}

function draw() {
    ctx.save();
    ctx.translate(-cameraOffset.x, -cameraOffset.y);
    
    // Resetar sombras
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    
    // Fundo (opcional)
    drawBackground();
    
    // Orbes de XP
    xpOrbs.forEach(orb => {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, XP_ORB_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(Date.now() / 200) * 0.3})`;
        ctx.fill();
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 15;
    });
    
    // Zumbis
    zombies.forEach(zombie => {
        ctx.save();
        ctx.translate(zombie.x, zombie.y);
        ctx.rotate(zombie.direction);
        
        // Corpo
        ctx.beginPath();
        ctx.arc(0, 0, ZOMBIE_SIZE * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = zombie.burning ? '#f80' : '#0a0';
        ctx.fill();
        
        // Olhos
        ctx.beginPath();
        ctx.arc(-10, -8, 5, 0, Math.PI * 2);
        ctx.arc(10, -8, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f00';
        ctx.fill();
        
        // Boca
        ctx.beginPath();
        ctx.arc(0, 10, 8, 0, Math.PI);
        ctx.strokeStyle = '#800';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();
        
        // Barra de vida
        const healthPercent = zombie.health / zombie.maxHealth;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(zombie.x - ZOMBIE_SIZE, zombie.y - ZOMBIE_SIZE - 15, ZOMBIE_SIZE * 2, 5);
        ctx.fillStyle = healthPercent > 0.6 ? 'rgba(0, 255, 0, 0.7)' : 
                         healthPercent > 0.3 ? 'rgba(255, 165, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(zombie.x - ZOMBIE_SIZE, zombie.y - ZOMBIE_SIZE - 15, ZOMBIE_SIZE * 2 * healthPercent, 5);
    });
    
    // Projéteis
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = bullet.isLightning ? '#4af' : '#ff0';
        ctx.fill();
        ctx.shadowColor = bullet.isLightning ? '#4af' : '#ff0';
        ctx.shadowBlur = 10;
    });
    
    // Bolas de fogo
    fireballs.forEach(fireball => {
        const gradient = ctx.createRadialGradient(
            fireball.x, fireball.y, 0,
            fireball.x, fireball.y, FIREBALL_SIZE
        );
        gradient.addColorStop(0, '#ff0');
        gradient.addColorStop(0.5, '#f80');
        gradient.addColorStop(1, '#f00');
        
        ctx.beginPath();
        ctx.arc(fireball.x, fireball.y, FIREBALL_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowColor = '#f80';
        ctx.shadowBlur = 20;
    });
    
    // Raios
    lightningStrikes.forEach(lightning => {
        if (lightning.lifetime > 0) {
            const radius = LIGHTNING_RADIUS * (1 - lightning.lifetime / 600);
            const gradient = ctx.createRadialGradient(
                lightning.x, lightning.y, 0,
                lightning.x, lightning.y, radius
            );
            gradient.addColorStop(0, 'rgba(100, 200, 255, 0.9)');
            gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(lightning.x, lightning.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    });
    
    // Jogador
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.direction);
    
    // Corpo
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = '#07f';
    ctx.fill();
    
    // Olhos
    ctx.beginPath();
    ctx.arc(-12, -10, 8, 0, Math.PI * 2);
    ctx.arc(12, -10, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(-10, -10, 4, 0, Math.PI * 2);
    ctx.arc(14, -10, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    
    // Boca
    ctx.beginPath();
    ctx.arc(0, 10, 10, 0, Math.PI, true);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.restore();
    
    // Barra de vida do jogador
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.fillRect(player.x - PLAYER_SIZE, player.y - PLAYER_SIZE - 20, PLAYER_SIZE * 2, 8);
    ctx.fillStyle = healthPercent > 0.6 ? 'rgba(0, 255, 0, 0.7)' : 
                     healthPercent > 0.3 ? 'rgba(255, 165, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
    ctx.fillRect(player.x - PLAYER_SIZE, player.y - PLAYER_SIZE - 20, PLAYER_SIZE * 2 * healthPercent, 8);
    
    // Sombra
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + PLAYER_SIZE + 5, PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    
    // Resetar sombras
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    
    ctx.restore();
    
    // Efeito de pausa
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawBackground() {
    // Grade para efeito de mapa infinito
    const gridSize = 100;
    const startX = Math.floor(cameraOffset.x / gridSize) * gridSize;
    const startY = Math.floor(cameraOffset.y / gridSize) * gridSize;
    
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.3)';
    ctx.lineWidth = 1;
    
    for (let x = startX; x < startX + canvas.width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - cameraOffset.x, 0);
        ctx.lineTo(x - cameraOffset.x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < startY + canvas.height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - cameraOffset.y);
        ctx.lineTo(canvas.width, y - cameraOffset.y);
        ctx.stroke();
    }
}

function updateUI() {
    document.getElementById('level').textContent = player.level;
    document.getElementById('xp').textContent = player.xp;
    document.getElementById('nextLevelXp').textContent = player.nextLevelXp;
    document.getElementById('health').textContent = Math.floor(player.health);
    document.getElementById('wave').textContent = wave;
    document.getElementById('zombieCount').textContent = zombies.length;
    document.getElementById('time').textContent = formatTime(gameTime);
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function resetGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        speed: 3.5,
        health: 100,
        maxHealth: 100,
        level: 1,
        xp: 0,
        nextLevelXp: 100,
        kills: 0,
        powers: {
            multishot: false,
            fire: false,
            lightning: false
        },
        direction: 0
    };
    zombies = [];
    xpOrbs = [];
    bullets = [];
    fireballs = [];
    lightningStrikes = [];
    wave = 1;
    gameTime = 0;
    lastWaveIncrease = 0;
    zombieSpeed = 1.2;
    zombieHealth = 40;
    zombiesPerWave = 15;
    zombieSpawnRate = 800;
    gameOver = false;
    gamePaused = false;
    
    document.getElementById('powerupScreen').style.display = 'none';
}

// Inicia o jogo
window.onload = init;