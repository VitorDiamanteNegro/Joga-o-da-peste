// Constantes do jogo
const PLAYER_SIZE = 20;
const ZOMBIE_SIZE = 16;
const XP_ORB_SIZE = 5;
const BULLET_SIZE = 4;
const FIREBALL_SIZE = 8;
const LIGHTNING_RADIUS = 100;

// Variáveis do jogo
let canvas, ctx;
let player = {
    x: 0,
    y: 0,
    speed: 3,
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
    }
};
let zombies = [];
let xpOrbs = [];
let bullets = [];
let fireballs = [];
let lightningStrikes = [];
let lastZombieSpawn = 0;
let zombieSpawnRate = 1000;
let zombieSpeed = 1;
let zombieHealth = 30;
let zombiesPerWave = 5;
let wave = 1;
let gameTime = 0;
let lastWaveIncrease = 0;
let cameraOffset = { x: 0, y: 0 };
let keys = {};
let mouse = { x: 0, y: 0, clicked: false };
let lastShot = 0;
let shootDelay = 300;
let gameOver = false;

// Inicializa o jogo
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', selectPowerup);
    });
    
    gameLoop();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left + cameraOffset.x;
    mouse.y = e.clientY - rect.top + cameraOffset.y;
}

function handleMouseDown(e) {
    if (e.button === 0) {
        mouse.clicked = true;
        shoot();
    }
}

function handleMouseUp(e) {
    if (e.button === 0) {
        mouse.clicked = false;
    }
}

function gameLoop(timestamp = 0) {
    if (gameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    update(timestamp);
    draw();
    
    requestAnimationFrame(gameLoop);
}

function update(timestamp) {
    const moveX = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    const moveY = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    
    const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);
    const normalizedX = moveLength > 0 ? moveX / moveLength : 0;
    const normalizedY = moveLength > 0 ? moveY / moveLength : 0;
    
    player.x += normalizedX * player.speed;
    player.y += normalizedY * player.speed;
    
    cameraOffset.x = player.x - canvas.width / 2;
    cameraOffset.y = player.y - canvas.height / 2;
    
    if (timestamp - lastZombieSpawn > zombieSpawnRate && zombies.length < zombiesPerWave * 2) {
        spawnZombie();
        lastZombieSpawn = timestamp;
    }
    
    zombies.forEach(zombie => {
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            zombie.x += (dx / distance) * zombie.speed;
            zombie.y += (dy / distance) * zombie.speed;
        }
        
        if (distance < PLAYER_SIZE / 2 + ZOMBIE_SIZE / 2) {
            player.health -= 0.5;
            zombie.x -= (dx / distance) * 5;
            zombie.y -= (dy / distance) * 5;
            
            if (player.health <= 0) {
                player.health = 0;
                gameOver = true;
                setTimeout(() => {
                    alert(`Fim de jogo! Você alcançou o nível ${player.level} e sobreviveu por ${Math.floor(gameTime/60000)} minutos e ${Math.floor((gameTime%60000)/1000)} segundos.`);
                    resetGame();
                }, 100);
            }
        }
    });
    
    zombies = zombies.filter(zombie => zombie.health > 0);
    
    bullets.forEach(bullet => {
        bullet.x += bullet.dx * bullet.speed;
        bullet.y += bullet.dy * bullet.speed;
        bullet.lifetime -= 16;
        
        for (let i = 0; i < zombies.length; i++) {
            const zombie = zombies[i];
            const dx = zombie.x - bullet.x;
            const dy = zombie.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ZOMBIE_SIZE / 2 + BULLET_SIZE / 2) {
                zombie.health -= bullet.damage;
                bullet.lifetime = 0;
                
                if (zombie.health <= 0) {
                    spawnXpOrb(zombie.x, zombie.y, 10);
                    player.kills++;
                    player.xp += 10;
                    
                    if (player.xp >= player.nextLevelXp) {
                        levelUp();
                    }
                }
                
                if (bullet.isLightning) {
                    lightningStrike(zombie.x, zombie.y);
                }
                
                break;
            }
        }
    });
    
    bullets = bullets.filter(bullet => bullet.lifetime > 0);
    
    fireballs.forEach(fireball => {
        fireball.x += fireball.dx * fireball.speed;
        fireball.y += fireball.dy * fireball.speed;
        fireball.lifetime -= 16;
        
        for (let i = 0; i < zombies.length; i++) {
            const zombie = zombies[i];
            const dx = zombie.x - fireball.x;
            const dy = zombie.y - fireball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ZOMBIE_SIZE / 2 + FIREBALL_SIZE / 2) {
                zombie.health -= fireball.damage;
                zombie.burning = true;
                zombie.burnTime = 1000;
                
                if (zombie.health <= 0) {
                    spawnXpOrb(zombie.x, zombie.y, 10);
                    player.kills++;
                    player.xp += 10;
                    
                    if (player.xp >= player.nextLevelXp) {
                        levelUp();
                    }
                }
                
                fireball.lifetime = 0;
                break;
            }
        }
    });
    
    fireballs = fireballs.filter(fireball => fireball.lifetime > 0);
    
    zombies.forEach(zombie => {
        if (zombie.burning) {
            zombie.burnTime -= 16;
            zombie.health -= 0.5;
            
            if (zombie.burnTime <= 0) {
                zombie.burning = false;
            }
            
            if (zombie.health <= 0) {
                spawnXpOrb(zombie.x, zombie.y, 10);
                player.kills++;
                player.xp += 10;
                
                if (player.xp >= player.nextLevelXp) {
                    levelUp();
                }
            }
        }
    });
    
    lightningStrikes.forEach(lightning => {
        lightning.lifetime -= 16;
        
        if (lightning.lifetime <= 0) {
            zombies.forEach(zombie => {
                const dx = zombie.x - lightning.x;
                const dy = zombie.y - lightning.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < LIGHTNING_RADIUS) {
                    zombie.health -= lightning.damage * (1 - distance / LIGHTNING_RADIUS);
                    
                    if (zombie.health <= 0) {
                        spawnXpOrb(zombie.x, zombie.y, 10);
                        player.kills++;
                        player.xp += 10;
                        
                        if (player.xp >= player.nextLevelXp) {
                            levelUp();
                        }
                    }
                }
            });
        }
    });
    
    lightningStrikes = lightningStrikes.filter(lightning => lightning.lifetime > 0);
    
    xpOrbs.forEach((orb, index) => {
        const dx = player.x - orb.x;
        const dy = player.y - orb.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
            orb.x += (dx / distance) * 2;
            orb.y += (dy / distance) * 2;
        }
        
        if (distance < PLAYER_SIZE / 2 + XP_ORB_SIZE / 2) {
            player.xp += orb.value;
            xpOrbs.splice(index, 1);
            
            if (player.xp >= player.nextLevelXp) {
                levelUp();
            }
        }
    });
    
    gameTime += 16;
    updateUI();
    
    if (gameTime - lastWaveIncrease > 240000) {
        wave++;
        lastWaveIncrease = gameTime;
        zombiesPerWave += 2;
        zombieSpeed += 0.2;
        zombieHealth += 5;
        zombieSpawnRate = Math.max(200, zombieSpawnRate - 100);
    }
}

function draw() {
    ctx.save();
    ctx.translate(-cameraOffset.x, -cameraOffset.y);
    
    xpOrbs.forEach(orb => {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, XP_ORB_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    });
    
    zombies.forEach(zombie => {
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, ZOMBIE_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = zombie.burning ? '#ff6600' : '#00aa00';
        ctx.fill();
        
        const healthPercent = zombie.health / zombie.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(zombie.x - ZOMBIE_SIZE, zombie.y - ZOMBIE_SIZE - 8, ZOMBIE_SIZE * 2, 3);
        ctx.fillStyle = 'green';
        ctx.fillRect(zombie.x - ZOMBIE_SIZE, zombie.y - ZOMBIE_SIZE - 8, ZOMBIE_SIZE * 2 * healthPercent, 3);
    });
    
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    });
    
    fireballs.forEach(fireball => {
        ctx.beginPath();
        ctx.arc(fireball.x, fireball.y, FIREBALL_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6600';
        ctx.fill();
    });
    
    lightningStrikes.forEach(lightning => {
        if (lightning.lifetime > 0) {
            ctx.beginPath();
            ctx.arc(lightning.x, lightning.y, LIGHTNING_RADIUS * (1 - lightning.lifetime / 500), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.fill();
        }
    });
    
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x - PLAYER_SIZE, player.y - PLAYER_SIZE - 8, PLAYER_SIZE * 2, 5);
    ctx.fillStyle = 'green';
    ctx.fillRect(player.x - PLAYER_SIZE, player.y - PLAYER_SIZE - 8, PLAYER_SIZE * 2 * healthPercent, 5);
    
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const indicatorX = player.x + Math.cos(angle) * PLAYER_SIZE;
    const indicatorY = player.y + Math.sin(angle) * PLAYER_SIZE;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(indicatorX, indicatorY);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
}

function spawnZombie() {
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    const spawnDistance = Math.max(canvas.width, canvas.height) * 0.7;
    
    switch (edge) {
        case 0:
            x = player.x + (Math.random() - 0.5) * canvas.width;
            y = player.y - spawnDistance;
            break;
        case 1:
            x = player.x + spawnDistance;
            y = player.y + (Math.random() - 0.5) * canvas.height;
            break;
        case 2:
            x = player.x + (Math.random() - 0.5) * canvas.width;
            y = player.y + spawnDistance;
            break;
        case 3:
            x = player.x - spawnDistance;
            y = player.y + (Math.random() - 0.5) * canvas.height;
            break;
    }
    
    zombies.push({
        x: x,
        y: y,
        speed: zombieSpeed,
        health: zombieHealth,
        maxHealth: zombieHealth,
        burning: false,
        burnTime: 0
    });
}

function spawnXpOrb(x, y, value) {
    xpOrbs.push({
        x: x,
        y: y,
        value: value
    });
}

function shoot() {
    const now = Date.now();
    if (now - lastShot < shootDelay) return;
    lastShot = now;
    
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    
    if (player.powers.multishot) {
        for (let i = -1; i <= 1; i++) {
            const spreadAngle = angle + i * 0.2;
            bullets.push({
                x: player.x,
                y: player.y,
                dx: Math.cos(spreadAngle),
                dy: Math.sin(spreadAngle),
                speed: 5,
                damage: 10,
                lifetime: 1000
            });
        }
    } else if (player.powers.fire) {
        fireballs.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: 4,
            damage: 15,
            lifetime: 1200
        });
    } else {
        bullets.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: 7,
            damage: 15,
            lifetime: 1000,
            isLightning: player.powers.lightning
        });
    }
}

function lightningStrike(x, y) {
    lightningStrikes.push({
        x: x,
        y: y,
        damage: 20,
        lifetime: 500
    });
}

function levelUp() {
    player.level++;
    player.xp -= player.nextLevelXp;
    player.nextLevelXp = Math.floor(player.nextLevelXp * 1.2);
    
    if (player.level % 5 === 0) {
        showPowerupCards();
    }
}

function showPowerupCards() {
    document.getElementById('powerupLevel').textContent = player.level;
    document.getElementById('powerupCards').style.display = 'block';
    zombieSpawnRate = 999999;
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
    
    document.getElementById('powerupCards').style.display = 'none';
    zombieSpawnRate = 1000 - (wave * 100);
}

function updateUI() {
    document.getElementById('level').textContent = player.level;
    document.getElementById('xp').textContent = player.xp;
    document.getElementById('nextLevelXp').textContent = player.nextLevelXp;
    document.getElementById('health').textContent = Math.floor(player.health);
    document.getElementById('wave').textContent = wave;
    
    const minutes = Math.floor(gameTime / 60000);
    const seconds = Math.floor((gameTime % 60000) / 1000);
    document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function resetGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        speed: 3,
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
        }
    };
    zombies = [];
    xpOrbs = [];
    bullets = [];
    fireballs = [];
    lightningStrikes = [];
    wave = 1;
    gameTime = 0;
    lastWaveIncrease = 0;
    zombieSpeed = 1;
    zombieHealth = 30;
    zombiesPerWave = 5;
    zombieSpawnRate = 1000;
    gameOver = false;
    
    document.getElementById('powerupCards').style.display = 'none';
}

// Inicia o jogo
window.onload = init;