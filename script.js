// Variáveis do jogo
let player = {
    x: 400,
    y: 300,
    width: 40,
    height: 40,
    speed: 5,
    health: 100
};

let zombies = [];
let bullets = [];
let keys = {};
let wave = 1;
let kills = 0;
let gameRunning = false;
let zombieSpawnInterval;
let gameOver = false;

// Elementos do DOM
const playerElement = document.getElementById('player');
const healthElement = document.getElementById('health');
const waveElement = document.getElementById('wave');
const killsElement = document.getElementById('kills');
const gameOverElement = document.getElementById('game-over');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart');

// Inicialização do jogo
function initGame() {
    // Posiciona o jogador no centro
    player.x = window.innerWidth / 2 - player.width / 2;
    player.y = window.innerHeight / 2 - player.height / 2;
    player.health = 100;
    
    // Limpa zumbis e balas
    zombies = [];
    bullets = [];
    
    // Reseta estatísticas
    wave = 1;
    kills = 0;
    gameOver = false;
    
    // Atualiza UI
    updateStats();
    gameOverElement.style.display = 'none';
    
    // Inicia o jogo
    gameRunning = true;
    startWave();
}

// Atualiza estatísticas na tela
function updateStats() {
    healthElement.textContent = `Vida: ${player.health}`;
    waveElement.textContent = `Onda: ${wave}`;
    killsElement.textContent = `Zumbis Mortos: ${kills}`;
}

// Inicia uma nova onda de zumbis
function startWave() {
    // Limpa qualquer intervalo anterior
    if (zombieSpawnInterval) {
        clearInterval(zombieSpawnInterval);
    }
    
    // Define o número de zumbis baseado na onda atual
    const zombieCount = 5 + wave * 2;
    
    // Spawna zumbis em intervalos regulares
    let zombiesSpawned = 0;
    zombieSpawnInterval = setInterval(() => {
        if (zombiesSpawned < zombieCount) {
            spawnZombie();
            zombiesSpawned++;
        } else {
            clearInterval(zombieSpawnInterval);
        }
    }, 1000);
}

// Cria um novo zumbi em uma posição aleatória fora da tela
function spawnZombie() {
    const zombie = {
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        speed: 1 + wave * 0.1,
        health: 50 + wave * 10
    };
    
    // Posiciona o zumbi fora da tela em um dos lados
    const side = Math.floor(Math.random() * 4);
    
    switch (side) {
        case 0: // Topo
            zombie.x = Math.random() * window.innerWidth;
            zombie.y = -30;
            break;
        case 1: // Direita
            zombie.x = window.innerWidth + 30;
            zombie.y = Math.random() * window.innerHeight;
            break;
        case 2: // Baixo
            zombie.x = Math.random() * window.innerWidth;
            zombie.y = window.innerHeight + 30;
            break;
        case 3: // Esquerda
            zombie.x = -30;
            zombie.y = Math.random() * window.innerHeight;
            break;
    }
    
    zombies.push(zombie);
    
    // Cria o elemento HTML do zumbi
    const zombieElement = document.createElement('div');
    zombieElement.className = 'zombie';
    zombieElement.style.left = `${zombie.x}px`;
    zombieElement.style.top = `${zombie.y}px`;
    document.getElementById('game-container').appendChild(zombieElement);
}

// Atira uma bala na direção do mouse
function shoot(e) {
    if (!gameRunning || gameOver) return;
    
    // Calcula a direção da bala
    const angle = Math.atan2(
        e.clientY - (player.y + player.height / 2),
        e.clientX - (player.x + player.width / 2)
    );
    
    const bullet = {
        x: player.x + player.width / 2 - 5,
        y: player.y + player.height / 2 - 5,
        width: 10,
        height: 10,
        speed: 10,
        dx: Math.cos(angle) * 10,
        dy: Math.sin(angle) * 10
    };
    
    bullets.push(bullet);
    
    // Cria o elemento HTML da bala
    const bulletElement = document.createElement('div');
    bulletElement.className = 'bullet';
    bulletElement.style.left = `${bullet.x}px`;
    bulletElement.style.top = `${bullet.y}px`;
    document.getElementById('game-container').appendChild(bulletElement);
}

// Atualiza o estado do jogo
function update() {
    if (!gameRunning || gameOver) return;
    
    // Movimentação do jogador
    if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
    if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
    
    // Limita o jogador dentro da tela
    player.x = Math.max(0, Math.min(window.innerWidth - player.width, player.x));
    player.y = Math.max(0, Math.min(window.innerHeight - player.height, player.y));
    
    // Atualiza posição do jogador na tela
    playerElement.style.left = `${player.x}px`;
    playerElement.style.top = `${player.y}px`;
    
    // Movimenta e verifica colisão das balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        
        // Remove balas que saíram da tela
        if (bullet.x < 0 || bullet.x > window.innerWidth || 
            bullet.y < 0 || bullet.y > window.innerHeight) {
            bullets.splice(i, 1);
            document.querySelectorAll('.bullet')[i].remove();
            continue;
        }
        
        // Atualiza posição da bala na tela
        document.querySelectorAll('.bullet')[i].style.left = `${bullet.x}px`;
        document.querySelectorAll('.bullet')[i].style.top = `${bullet.y}px`;
        
        // Verifica colisão com zumbis
        for (let j = zombies.length - 1; j >= 0; j--) {
            const zombie = zombies[j];
            if (checkCollision(bullet, zombie)) {
                zombie.health -= 25;
                
                // Remove zumbi se a vida acabar
                if (zombie.health <= 0) {
                    zombies.splice(j, 1);
                    document.querySelectorAll('.zombie')[j].remove();
                    kills++;
                    updateStats();
                }
                
                // Remove a bala
                bullets.splice(i, 1);
                document.querySelectorAll('.bullet')[i].remove();
                break;
            }
        }
    }
    
    // Movimenta zumbis em direção ao jogador
    for (let i = 0; i < zombies.length; i++) {
        const zombie = zombies[i];
        
        // Calcula direção para o jogador
        const dx = (player.x + player.width / 2) - (zombie.x + zombie.width / 2);
        const dy = (player.y + player.height / 2) - (zombie.y + zombie.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normaliza e multiplica pela velocidade
        zombie.x += (dx / distance) * zombie.speed;
        zombie.y += (dy / distance) * zombie.speed;
        
        // Atualiza posição do zumbi na tela
        document.querySelectorAll('.zombie')[i].style.left = `${zombie.x}px`;
        document.querySelectorAll('.zombie')[i].style.top = `${zombie.y}px`;
        
        // Verifica colisão com o jogador
        if (checkCollision(player, zombie)) {
            player.health -= 0.5;
            updateStats();
            
            // Game over se a vida acabar
            if (player.health <= 0) {
                endGame();
                break;
            }
        }
    }
    
    // Verifica se todos os zumbis foram mortos para iniciar nova onda
    if (zombies.length === 0 && gameRunning && !gameOver) {
        wave++;
        updateStats();
        startWave();
    }
    
    // Continua o loop de atualização
    requestAnimationFrame(update);
}

// Verifica colisão entre dois objetos
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Finaliza o jogo
function endGame() {
    gameOver = true;
    gameRunning = false;
    gameOverElement.style.display = 'block';
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

document.addEventListener('mousedown', shoot);

startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
    update();
});

restartButton.addEventListener('click', () => {
    // Remove todos os zumbis e balas
    document.querySelectorAll('.zombie').forEach(z => z.remove());
    document.querySelectorAll('.bullet').forEach(b => b.remove());
    
    initGame();
    update();
});

// Inicia a tela inicial
startScreen.style.display = 'flex';