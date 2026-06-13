const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Propojení HUDu a Garáže
const moneyText = document.getElementById('money');
const carTypeText = document.getElementById('carType');
const missionText = document.getElementById('missionText');
const btnSedan = document.getElementById('btn-sedan');
const btnPickup = document.getElementById('btn-pickup');
const btnSport = document.getElementById('btn-sport');

// ROZMĚRY VELKÉHO SVĚTA
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;

// NASTAVENÍ HRÁČE (Peníze a odemčená auta se načítají z paměti)
let player = {
    x: 300, // Začínáme v městě
    y: 300,
    angle: 0,
    speed: 0,
    maxSpeed: 3.5,
    acc: 0.08,
    friction: 0.04,
    turnSpeed: 0.04,
    width: 32,
    height: 16,
    color: '#f44336',
    money: parseInt(localStorage.getItem('gta_money')) || 100,
    unlockedCars: JSON.parse(localStorage.getItem('gta_cars')) || ['sedan'],
    currentCar: 'sedan'
};

// DATA O AUTECH V OBCHODĚ
const carDatabase = {
    sedan: { name: "Sedan", speed: 3.5, color: "#f44336", turn: 0.04 },
    pickup: { name: "Pickup", speed: 4.8, color: "#2196f3", turn: 0.035 },
    sport: { name: "Sporťák", speed: 6.8, color: "#ffeb3b", turn: 0.05 }
};

// SEZNAM MISÍ NA MAPĚ
let missions = [
    { id: 1, name: "Městský kurýr", startX: 500, startY: 300, targetX: 1200, targetY: 450, reward: 40, active: false, done: false, title: "Mise 1: Odvez balíček na konec hlavní třídy!" },
    { id: 2, name: "Útěk do přírody", startX: 1400, startY: 450, targetX: 2500, targetY: 1500, reward: 80, active: false, done: false, title: "Mise 2: Doruč tajný kufr do chaty hluboko v lese!" }
];
let activeMission = null;

// VYTVOŘENÍ PŘÍRODY (Náhodné stromy na mapě mimo město)
let trees = [];
for (let i = 0; i < 60; i++) {
    trees.push({
        x: 1600 + Math.random() * 1300,
        y: Math.random() * WORLD_HEIGHT,
        size: 20 + Math.random() * 15
    });
}

// --- LOGIKA OVLÁDÁNÍ (JOYSTICK A KLÁVESNICE) ---
const joystick = document.getElementById('joystickContainer');
const stick = document.getElementById('joystickStick');
let joystickActive = false, joystickStartX = 0, joystickStartY = 0, joystickX = 0, joystickY = 0;

function startJoystick(e) {
    joystickActive = true;
    const touch = e.touches ? e.touches[0] : e;
    const rect = joystick.getBoundingClientRect();
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
}
function moveJoystick(e) {
    if (!joystickActive) return;
    const touch = e.touches ? e.touches[0] : e;
    let deltaX = touch.clientX - joystickStartX;
    let deltaY = touch.clientY - joystickStartY;
    let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > 40) { deltaX = (deltaX / distance) * 40; deltaY = (deltaY / distance) * 40; }
    stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    joystickX = deltaX / 40; joystickY = deltaY / 40;
}
function endJoystick() {
    joystickActive = false; stick.style.transform = 'translate(0px, 0px)'; joystickX = 0; joystickY = 0;
}
joystick.addEventListener('touchstart', startJoystick); window.addEventListener('touchmove', moveJoystick); window.addEventListener('touchend', endJoystick);
joystick.addEventListener('mousedown', startJoystick); window.addEventListener('mousemove', moveJoystick); window.addEventListener('mouseup', endJoystick);

let keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// --- FUNKCE PRO PRODEJNU A STŘÍDÁNÍ AUT ---
function updateGarageUI() {
    moneyText.textContent = player.money;
    
    // Tlačítko Pickup
    if (player.unlockedCars.includes('pickup')) {
        btnPickup.textContent = "Zvolit Pickup";
        if(player.currentCar === 'pickup') btnPickup.textContent = "Pickup (Aktivní)";
    }
    // Tlačítko Sporťák
    if (player.unlockedCars.includes('sport')) {
        btnSport.textContent = "Zvolit Sporťák";
        if(player.currentCar === 'sport') btnSport.textContent = "Sporťák (Aktivní)";
    }
}

function selectCar(type) {
    if (player.unlockedCars.includes(type)) {
        player.currentCar = type;
        player.maxSpeed = carDatabase[type].speed;
        player.color = carDatabase[type].color;
        player.turnSpeed = carDatabase[type].turn;
        carTypeText.textContent = carDatabase[type].name;
        carTypeText.style.color = carDatabase[type].color;
    } else {
        // Nákup auta
        let price = type === 'pickup' ? 100 : 250;
        if (player.money >= price) {
            player.money -= price;
            player.unlockedCars.push(type);
            localStorage.setItem('gta_money', player.money);
            localStorage.setItem('gta_cars', JSON.stringify(player.unlockedCars));
            selectCar(type);
        } else {
            alert("Nemáš dost peněz na toto auto!");
        }
    }
    updateGarageUI();
}

btnSedan.addEventListener('click', () => selectCar('sedan'));
btnPickup.addEventListener('click', () => selectCar('pickup'));
btnSport.addEventListener('click', () => selectCar('sport'));

// --- LOGIKA HRY (UPDATE) ---
function update() {
    // Ovládání zatáčení a jízdy
    let turnInput = 0;
    if (keys['ArrowLeft'] || keys['a']) turnInput = -1;
    if (keys['ArrowRight'] || keys['d']) turnInput = 1;
    if (Math.abs(joystickX) > 0.2) turnInput = joystickX;
    if (player.speed !== 0) player.angle += player.turnSpeed * turnInput * (player.speed > 0 ? 1 : -1);

    let speedInput = 0;
    if (keys['ArrowUp'] || keys['w']) speedInput = 1;
    if (keys['ArrowDown'] || keys['s']) speedInput = -1;
    if (Math.abs(joystickY) > 0.2) speedInput = -joystickY;

    if (speedInput > 0) {
        if (player.speed < player.maxSpeed) player.speed += player.acc;
    } else if (speedInput < 0) {
        if (player.speed > -player.maxSpeed / 2) player.speed -= player.acc;
    } else {
        if (player.speed > 0) player.speed -= player.friction;
        if (player.speed < 0) player.speed += player.friction;
        if (Math.abs(player.speed) < player.friction) player.speed = 0;
    }

    player.x += Math.cos(player.angle) * player.speed;
    player.y += Math.sin(player.angle) * player.speed;

    // Hranice celého obrovského světa
    if (player.x < 20) player.x = 20; if (player.x > WORLD_WIDTH - 20) player.x = WORLD_WIDTH - 20;
    if (player.y < 20) player.y = 20; if (player.y > WORLD_HEIGHT - 20) player.y = WORLD_HEIGHT - 20;

    // KONTROLA MISÍ
    let pDist = (x1, y1, x2, y2) => Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);

    missions.forEach(m => {
        // Přijetí mise u budky
        if (!activeMission && pDist(player.x, player.y, m.startX, m.startY) < 30) {
            activeMission = m;
            missionText.textContent = m.title;
            missionText.style.color = "#ff9800";
        }
        // Dokončení mise v cíli
        if (activeMission === m && pDist(player.x, player.y, m.targetX, m.targetY) < 35) {
            player.money += m.reward;
            missionText.textContent = `Skvělé! Splnil jsi misi: ${m.name} a získal $${m.reward}!`;
            missionText.style.color = "#00ff00";
            activeMission = null;
            localStorage.setItem('gta_money', player.money);
            updateGarageUI();
        }
    });
}

// --- VYKRESLOVÁNÍ (S CHYTROU KAMEROU) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // VÝPOČET POZICE KAMERY (Kamera centruje auto doprostřed plátna)
    let camX = player.x - canvas.width / 2;
    let camY = player.y - canvas.height / 2;

    // Zamezíme kameře vyjet mimo obrovský svět
    if (camX < 0) camX = 0; if (camX > WORLD_WIDTH - canvas.width) camX = WORLD_WIDTH - canvas.width;
    if (camY < 0) camY = 0; if (camY > WORLD_HEIGHT - canvas.height) camY = WORLD_HEIGHT - canvas.height;

    ctx.save();
    ctx.translate(-camX, -camY); // Všechno, co teď nakreslíme, bude posunuté podle kamery!

    // 1. KRESLENÍ ADRES / SILNIC MĚSTA (Město je vlevo: x: 0 až 1500)
    ctx.fillStyle = "#555"; // Šedý asfalt města
    ctx.fillRect(100, 100, 1300, 120);  // Hlavní ulice západ-východ
    ctx.fillRect(400, 100, 120, 800);   // Křižovatka dolů
    ctx.fillRect(100, 700, 1300, 120);  // Dolní ulice města

    // 2. KRESLENÍ PŘÍRODY / POLNÍCH CEST (Příroda je vpravo: x: 1500 až 3000)
    ctx.fillStyle = "#8d6e63"; // Hnědá polní cesta vedoucí do lesa
    ctx.fillRect(1400, 130, 1200, 60);
    ctx.fillRect(2500, 130, 60, 1500);

    // Kreslení lesa (stromů) v přírodě
    trees.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fillStyle = "#1b5e20"; // Tmavě zelené koruny stromů
        ctx.fill();
    });

    // 3. VYKRESLENÍ TELEFONNÍCH BUDEK (MISE)
    missions.forEach(m => {
        if (!activeMission) {
            ctx.beginPath();
            ctx.arc(m.startX, m.startY, 20, 0, Math.PI * 2);
            ctx.fillStyle = "#4CAF50";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#fff";
            ctx.stroke();
            ctx.fillStyle = "#fff";
            ctx.font = "bold 11px Arial";
            ctx.fillText("MISÍ " + m.id, m.startX - 15, m.startY + 4);
        }

        // Vykreslení cíle aktivní mise
        if (activeMission === m) {
            ctx.beginPath();
            ctx.arc(m.targetX, m.targetY, 30, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(244, 67, 54, 0.5)";
            ctx.fill();
            ctx.strokeStyle = "#f44336";
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });

    // 4. VYKRESLENÍ AUTA HRÁČE
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.fillStyle = player.color;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    // Okna auta
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(-2, -player.height / 2 + 2, 8, player.height - 4);

    // Přední světla
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(player.width / 2 - 2, -player.height / 2 + 1, 3, 3);
    ctx.fillRect(player.width / 2 - 2, player.height / 2 - 4, 3, 3);

    ctx.restore();
    ctx.restore(); // Konec kamery
}

// Spuštění
updateGarageUI();
(function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
})();
