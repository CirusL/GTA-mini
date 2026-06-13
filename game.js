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

// NASTAVENÍ HRÁČE (Načítáme peníze, auta i aktuální misi z paměti)
let player = {
    x: 300,
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
    currentMissionNumber: parseInt(localStorage.getItem('gta_mission_num')) || 1, // Začínáme misí 1
    unlockedCars: JSON.parse(localStorage.getItem('gta_cars')) || ['sedan'],
    currentCar: 'sedan'
};

// DATA O AUTECH V OBCHODĚ
const carDatabase = {
    sedan: { name: "Sedan", speed: 3.5, color: "#f44336", turn: 0.04 },
    pickup: { name: "Pickup", speed: 4.8, color: "#2196f3", turn: 0.035 },
    sport: { name: "Sporťák", speed: 6.8, color: "#ffeb3b", turn: 0.05 }
};

// Pevné místo startu misí (Telefonní budka zůstává na jednom místě)
let phoneBooth = { x: 500, y: 300, radius: 20 };

// Cíl aktuální mise (Bude se generovat náhodně)
let missionTarget = { x: 0, y: 0, radius: 30, active: false, reward: 0, title: "" };
let hasMission = false;

// Druhy úkolů, které hra náhodně kombinuje
const missionTypes = [
    "Doruč balíček šéfovi gangu",
    "Uteč před policií na bezpečné místo",
    "Odvez tajné dokumenty do úkrytu",
    "Zachraň parťáka a dovez ho na základnu",
    "Pašuj zlato přes hranice města"
];

// FUNKCE NA VYGENEROVÁNÍ NOVÉ MISE (Může jich být klidně 1000!)
function generateNextMission() {
    // 1. Vybereme náhodný typ úkolu z pole výše
    let randomType = missionTypes[Math.floor(Math.random() * missionTypes.length)];
    
    // 2. Vybereme náhodné souřadnice cíle kdekoli na obrovské mapě
    // Aby to nebylo hned u budky, cíl bude dál než 500 pixelů
    let targetX = Math.random() * (WORLD_WIDTH - 200) + 100;
    let targetY = Math.random() * (WORLD_HEIGHT - 200) + 100;
    
    // 3. Spočítáme odměnu: základ je $30 + s každou další misí dostaneš o $2 víc!
    let reward = 30 + (player.currentMissionNumber * 2);
    
    // 4. Uložíme data do cíle mise
    missionTarget.x = targetX;
    missionTarget.y = targetY;
    missionTarget.reward = reward;
    
    // Rozlišíme v textu, jestli se jede do města nebo do přírody
    let oblast = targetX > 1500 ? "v lesích v přírodě" : "v ulicích města";
    missionTarget.title = `Mise ${player.currentMissionNumber}/100: ${randomType} ${oblast}! (Odměna: $${reward})`;
}

// VYTVOŘENÍ PŘÍRODY (Náhodné stromy na mapě mimo město)
let trees = [];
for (let i = 0; i < 70; i++) {
    trees.push({
        x: 1550 + Math.random() * 1350,
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
    
    if (player.unlockedCars.includes('pickup')) {
        btnPickup.textContent = "Zvolit Pickup";
        if(player.currentCar === 'pickup') btnPickup.textContent = "Pickup (Aktivní)";
    }
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

// Nasměrování na správné auto při startu hry
selectCar(player.currentCar);

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

    // KONTROLA VZDÁLENOSTÍ
    let pDist = (x1, y1, x2, y2) => Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);

    // 1. Přijetí mise u zelené budky
    if (!hasMission && pDist(player.x, player.y, phoneBooth.x, phoneBooth.y) < phoneBooth.radius + 10) {
        hasMission = true;
        missionTarget.active = true;
        generateNextMission(); // Vygenerujeme náhodný úkol
        missionText.textContent = missionTarget.title;
        missionText.style.color = "#ff9800";
    }

    // 2. Dokončení aktuální mise v červeném cíli
    if (hasMission && missionTarget.active && pDist(player.x, player.y, missionTarget.x, missionTarget.y) < missionTarget.radius + 10) {
        player.money += missionTarget.reward;
        
        if (player.currentMissionNumber >= 100) {
            missionText.textContent = "🏆 KANONÁDA! Dokončil jsi všech 100 misí a ovládl jsi celé město! Jsi král podsvětí!";
            missionText.style.color = "#00ffff";
        } else {
            missionText.textContent = `✔ Výborně! Dokončil jsi misi ${player.currentMissionNumber}. Vydělal jsi $${missionTarget.reward}. Jed' zpátky k zelené budce pro další!`;
            missionText.style.color = "#00ff00";
        }

        player.currentMissionNumber++; // Posuneme se na další číslo mise
        hasMission = false;
        missionTarget.active = false;

        // Uložení postupu do paměti mobilu
        localStorage.setItem('gta_money', player.money);
        localStorage.setItem('gta_mission_num', player.currentMissionNumber);
        updateGarageUI();
    }
}

// --- VYKRESLOVÁNÍ ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let camX = player.x - canvas.width / 2;
    let camY = player.y - canvas.height / 2;
    if (camX < 0) camX = 0; if (camX > WORLD_WIDTH - canvas.width) camX = WORLD_WIDTH - canvas.width;
    if (camY < 0) camY = 0; if (camY > WORLD_HEIGHT - canvas.height) camY = WORLD_HEIGHT - canvas.height;

    ctx.save();
    ctx.translate(-camX, -camY);

    // KRESLENÍ MĚSTA (Asfaltové silnice)
    ctx.fillStyle = "#555";
    ctx.fillRect(100, 100, 1300, 120);  
    ctx.fillRect(400, 100, 120, 800);   
    ctx.fillRect(100, 700, 1300, 120);  

    // KRESLENÍ PŘÍRODY (Polní cesty a les)
    ctx.fillStyle = "#8d6e63"; 
    ctx.fillRect(1400, 130, 1200, 60);
    ctx.fillRect(2500, 130, 60, 1500);

    trees.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fillStyle = "#1b5e20"; 
        ctx.fill();
    });

    // VYKRESLENÍ TELEFONNÍ BUDEK (START MISÍ)
    if (!hasMission) {
        ctx.beginPath();
        ctx.arc(phoneBooth.x, phoneBooth.y, phoneBooth.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#4CAF50"; // Zelená budka
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.fillText("START", phoneBooth.x - 16, phoneBooth.y + 4);
    }

    // VYKRESLENÍ CÍLE MISE
    if (missionTarget.active) {
        ctx.beginPath();
        ctx.arc(missionTarget.x, missionTarget.y, missionTarget.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(244, 67, 54, 0.5)"; // Červený kruh cíle
        ctx.fill();
        ctx.strokeStyle = "#f44336";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // VYKRESLENÍ AUTA
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.fillStyle = player.color;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    ctx.fillStyle = '#2196f3'; // Okna
    ctx.fillRect(-2, -player.height / 2 + 2, 8, player.height - 4);

    ctx.fillStyle = '#ffff00'; // Světla
    ctx.fillRect(player.width / 2 - 2, -player.height / 2 + 1, 3, 3);
    ctx.fillRect(player.width / 2 - 2, player.height / 2 - 4, 3, 3);

    ctx.restore();
    ctx.restore(); 
}

// Spuštění
updateGarageUI();
if (player.currentMissionNumber > 1) {
    missionText.textContent = `Vítej zpět! Jsi na misi číslo ${player.currentMissionNumber}/100. Dojeď k zelené budce.`;
}
(function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
})();
