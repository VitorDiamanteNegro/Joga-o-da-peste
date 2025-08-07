// Constantes do jogo
const PLAYER_SIZE = 40;
const ZOMBIE_SIZE = 32;
const XP_ORB_SIZE = 8;
const BULLET_SIZE = 6;
const FIREBALL_SIZE = 16;
const LIGHTNING_RADIUS = 120;

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
    },
    direction: 0 // Ângulo em radianos
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
let gamePaused = false;
let spritesLoaded = false;
let playerSprite, zombieSprite, fireballSprite;

// Inicializa o jogo
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Carrega sprites
    loadSprites();
    
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
    
    // Inicia o loop do jogo
    requestAnimationFrame(gameLoop);
}

function loadSprites() {
    playerSprite = document.getElementById('playerSprite');
    zombieSprite = document.getElementById('zombieSprite');
    fireballSprite = document.getElementById('fireballSprite');
    
    // Verifica se as sprites estão carregadas
    spritesLoaded = playerSprite.complete && zombieSprite.complete && fireballSprite.complete;
    
    if (!spritesLoaded) {
        const checkSprites = setInterval(() => {
            if (playerSprite.complete && zombieSprite.complete && fireballSprite.complete) {
                spritesLoaded = true;
                clearInterval(checkSprites);
            }
        }, 100);
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function handleKeyDown(e) {
    if (gamePaused) return;
    keys[e.key.toLowerCase()] = true;
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left + cameraOffset.x;
    mouse.y = e.clientY - rect.top + cameraOffset.y;
    
    // Atualiza direção do jogador
    player.direction = Math.atan2(mouse.y - player.y, mouse.x - player.x);
}

function handleMouseDown(e) {
    if (e.button === 0 && !gamePaused) {
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
    
    // Atualiza offset da câmera (mapa infinito)
    cameraOffset.x = player.x - canvas.width / 2;
    cameraOffset.y = player.y - canvas.height / 2;
    
    // Spawn de zumbis
    if (timestamp - lastZombieSpawn > zombieSpawnRate && zombies.length < zombiesPerWave * 2) {
        spawnZombie();
        lastZombieSpawn = timestamp;
    }
    
    // Atualiza zumbis
    zombies.forEach(zombie => {
        // Move zumbi em direção ao jogador
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            zombie.x += (dx / distance) * zombie.speed;
            zombie.y += (dy / distance) * zombie.speed;
            zombie.direction = Math.atan2(dy, dx);
        }
        
        // Verifica colisão com o jogador
        if (distance < PLAYER_SIZE / 2 + ZOMBIE_SIZE / 2) {
            player.health -= 0.5;
            zombie.x -= (dx / distance) * 5; // Empurra o zumbi
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
    
    // Remove zumbis mortos
    zombies = zombies.filter(zombie => zombie.health > 0);
    
    // Atualiza projéteis
    bullets.forEach(bullet => {
        bullet.x += bullet.dx * bullet.speed;
        bullet.y += bullet.dy * bullet.speed;
        bullet.lifetime -= 16;
        
        // Verifica colisão com zumbis
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
                
                // Efeito de raio
                if (bullet.isLightning) {
                    lightningStrike(zombie.x, zombie.y);
                }
                
                break;
            }
        }
    });
    
    // Remove projéteis expirados
    bullets = bullets.filter(bullet => bullet.lifetime > 0);
    
    // Atualiza bolas de fogo
    fireballs.forEach(fireball => {
        fireball.x += fireball.dx * fireball.speed;
        fireball.y += fireball.dy * fireball.speed;
        fireball.lifetime -= 16;
        
        // Verifica colisão com zumbis
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
    
    // Remove bolas de fogo expiradas
    fireballs = fireballs.filter(fireball => fireball.lifetime > 0);
    
    // Atualiza zumbis queimando
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
    
    // Atualiza raios
    lightningStrikes.forEach(lightning => {
        lightning.lifetime -= 16;
        
        if (lightning.lifetime <= 0) {
            // Dano em área
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
    
    // Remove raios expirados
    lightningStrikes = lightningStrikes.filter(lightning => lightning.lifetime > 0);
    
    // Atualiza orbes de XP
    xpOrbs.forEach((orb, index) => {
        // Move em direção ao jogador se estiver perto
        const dx = player.x - orb.x;
        const dy = player.y - orb.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
            orb.x += (dx / distance) * 2;
            orb.y += (dy / distance) * 2;
        }
        
        // Verifica colisão com o jogador
        if (distance < PLAYER_SIZE / 2 + XP_ORB_SIZE / 2) {
            player.xp += orb.value;
            xpOrbs.splice(index, 1);
            
            if (player.xp >= player.nextLevelXp) {
                levelUp();
            }
        }
    });
    
    // Atualiza tempo e dificuldade
    if (!gamePaused) {
        gameTime += 16;
        
        // Aumenta dificuldade a cada 4 minutos
        if (gameTime - lastWaveIncrease > 240000) {
            wave++;
            lastWaveIncrease = gameTime;
            zombiesPerWave += 2;
            zombieSpeed += 0.2;
            zombieHealth += 5;
            zombieSpawnRate = Math.max(200, zombieSpawnRate - 100);
        }
    }
    
    updateUI();
}

function draw() {
    ctx.save();
    ctx.translate(-cameraOffset.x, -cameraOffset.y);
    
    // Desenha orbes de XP
    xpOrbs.forEach(orb => {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, XP_ORB_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 10;
    });
    
    // Desenha zumbis
    zombies.forEach(zombie => {
        if (spritesLoaded) {
            ctx.save();
            ctx.translate(zombie.x, zombie.y);
            ctx.rotate(zombie.direction);
            ctx.drawImage(zombieSprite, -ZOMBIE_SIZE, -ZOMBIE_SIZE, ZOMBIE_SIZE * 2, ZOMBIE_SIZE * 2);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(zombie.x, zombie.y, ZOMBIE_SIZE, 0, Math.PI * 2);
            ctx.fillStyle = zombie.burning ? '#ff6600' : '#00aa00';
            ctx.fill();
        }
        
        // Barra de vida
        const healthPercent = zombie.health / zombie.maxHealth;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(zombie.x - ZOMBIE_SIZE, zombie.y - ZOMBIE_SIZE - 10, ZOMBIE_SIZE * 2, 5);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(zombie.x - ZOMBIE_SIZE, zombie.y - ZOMBIE_SIZE - 10, ZOMBIE_SIZE * 2 * healthPercent, 5);
    });
    
    // Desenha projéteis
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.fill();
    });
    
    // Desenha bolas de fogo
    fireballs.forEach(fireball => {
        if (spritesLoaded) {
            ctx.drawImage(fireballSprite, fireball.x - FIREBALL_SIZE, fireball.y - FIREBALL_SIZE, FIREBALL_SIZE * 2, FIREBALL_SIZE * 2);
        } else {
            ctx.beginPath();
            ctx.arc(fireball.x, fireball.y, FIREBALL_SIZE, 0, Math.PI * 2);
            ctx.fillStyle = '#ff6600';
            ctx.fill();
        }
    });
    
    // Desenha raios
    lightningStrikes.forEach(lightning => {
        if (lightning.lifetime > 0) {
            const radius = LIGHTNING_RADIUS * (1 - lightning.lifetime / 500);
            const gradient = ctx.createRadialGradient(
                lightning.x, lightning.y, 0,
                lightning.x, lightning.y, radius
            );
            gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(lightning.x, lightning.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    });
    
    // Desenha jogador
    if (spritesLoaded) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.direction);
        ctx.drawImage(playerSprite, -PLAYER_SIZE, -PLAYER_SIZE, PLAYER_SIZE * 2, PLAYER_SIZE * 2);
        ctx.restore();
    } else {
        ctx.beginPath();
        ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
    }
    
    // Barra de vida do jogador
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(player.x - PLAYER_SIZE, player.y - PLAYER_SIZE - 15, PLAYER_SIZE * 2, 8);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.fillRect(player.x - PLAYER_SIZE, player.y - PLAYER_SIZE - 15, PLAYER_SIZE * 2 * healthPercent, 8);
    
    // Sombra do jogador
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + PLAYER_SIZE + 5, PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    
    ctx.restore();
    
    // Efeito de pausa quando selecionando poder
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Selecione um poder para continuar', canvas.width / 2, canvas.height / 2 - 100);
    }
}

function spawnZombie() {
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    const spawnDistance = Math.max(canvas.width, canvas.height) * 0.7;
    
    switch (edge) {
        case 0: // Topo
            x = player.x + (Math.random() - 0.5) * canvas.width;
            y = player.y - spawnDistance;
            break;
        case 1: // Direita
            x = player.x + spawnDistance;
            y = player.y + (Math.random() - 0.5) * canvas.height;
            break;
        case 2: // Baixo
            x = player.x + (Math.random() - 0.5) * canvas.width;
            y = player.y + spawnDistance;
            break;
        case 3: // Esquerda
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
        burnTime: 0,
        direction: 0
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
    if (gamePaused) return;
    
    const now = Date.now();
    if (now - lastShot < shootDelay) return;
    lastShot = now;
    
    const angle = player.direction;
    
    if (player.powers.multishot) {
        // Tiro triplo
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
        // Bola de fogo
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
        // Tiro normal ou de raio
        bullets.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: 7,
            damage: player.powers.lightning ? 20 : 15,
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
    
    // A cada 5 níveis, mostra seleção de poder
    if (player.level % 5 === 0) {
        showPowerupCards();
    }
}

function showPowerupCards() {
    gamePaused = true;
    document.getElementById('powerupLevel').textContent = player.level;
    document.getElementById('powerupCards').style.display = 'block';
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
    gamePaused = false;
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
    zombieSpeed = 1;
    zombieHealth = 30;
    zombiesPerWave = 5;
    zombieSpawnRate = 1000;
    gameOver = false;
    gamePaused = false;
    
    document.getElementById('powerupCards').style.display = 'none';
}

// Inicia o jogo quando a página carrega
window.onload = init;