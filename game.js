const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Propojení s HTML prvky
const moneyText = document.getElementById('money');
const carTypeText = document.getElementById('carType');
const missionText = document.getElementById('missionText');
const shopButton = document.getElementById('shopButton');

// 1. NASTAVENÍ HRÁČE A AUTA (Načítáme uložené peníze z paměti)
let player = {
    x: 400,
    y: 450,
    angle: 0,
    speed: 0,
    maxSpeed: 3.5,    // Základní rychlost
    acc: 0.08,
    friction: 0.04,
    turnSpeed: 0.04,
    width: 32,
    height: 16,
    money: parseInt(localStorage.getItem('gta_money')) || 100,
    hasSuperCar: localStorage.getItem('gta_hasSuperCar') === 'true' ? true : false
};

// Pokud už hráč v minulosti koupil super auto, zapneme mu ho
if (player.hasSuperCar) {
    player.maxSpeed = 6;
    carTypeText.textContent = "Žlutý Sporťák (Rychlé)";
    carTypeText.style.color = "#ffff00";
    shopButton.style.display = "none";
}

// 2. NASTAVENÍ MISÍ A POSTRANNÍCH OBJEKTŮ
// Telefonní budka (Mise)
let phoneBooth = { x: 150, y: 150, radius: 20, active: true };
// Cíl mise (Kam se musí dojet)
let missionTarget = { x: 650, y: 150, radius: 25, active: false };
let hasMission = false;

// 3. LOGIKA VIRTUÁLNÍHO JOYSTICKU
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
    const maxDistance = 45;
    if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
    }
    stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    joystickX = deltaX / maxDistance;
    joystickY = deltaY / maxDistance;
}
function endJoystick() {
    joystickActive = false;
    stick.style.transform = 'translate(0px, 0px)';
    joystickX = 0; joystickY = 0;
}
joystick.addEventListener('touchstart', startJoystick);
window.addEventListener('touchmove', moveJoystick);
window.addEventListener('touchend', endJoystick);
joystick.addEventListener('mousedown', startJoystick);
window.addEventListener('mousemove', moveJoystick);
window.addEventListener('mouseup', endJoystick);

// Klávesnice pro PC testování
let keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// 4. OBCHOD (Garáž)
shopButton.addEventListener('click', () => {
    if (player.money >= 150 && !player.hasSuperCar) {
        player.money -= 150;
        player.hasSuperCar = true;
        player.maxSpeed = 6; // Výrazné zrychlení!
        
        carTypeText.textContent = "Žlutý Sporťák (Rychlé)";
        carTypeText.style.color = "#ffff00";
        shopButton.style.display = "none";
        
        // Uložení do paměti mobilu
        localStorage.setItem('gta_money', player.money);
        localStorage.setItem('gta_hasSuperCar', 'true');
    } else if (!player.hasSuperCar) {
        alert("Nemáš dost peněz! Dokonči misi.");
    }
});

// 5. KONTROLA KOLIZÍ (Vzdálenost mezi dvěma body)
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 6. HLAVNÍ UPDATE SMYČKA
function update() {
    // Zatáčení
    let turnInput = 0;
    if (keys['ArrowLeft'] || keys['a']) turnInput = -1;
    if (keys['ArrowRight'] || keys['d']) turnInput = 1;
    if (Math.abs(joystickX) > 0.2) turnInput = joystickX;
    if (player.speed !== 0) player.angle += player.turnSpeed * turnInput * (player.speed > 0 ? 1 : -1);

    // Plyn a zpátečka
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

    // Pozice auta
    player.x += Math.cos(player.angle) * player.speed;
    player.y += Math.sin(player.angle) * player.speed;

    // Hranice mapy
    if (player.x < 15) player.x = 15;
    if (player.x > canvas.width - 15) player.x = canvas.width - 15;
    if (player.y < 15) player.y = 15;
    if (player.y > canvas.height - 15) player.y = canvas.height - 15;

    // --- MISE LOGIKA ---
    // 1. Aktivace mise u budky
    if (!hasMission && getDistance(player.x, player.y, phoneBooth.x, phoneBooth.y) < phoneBooth.radius + 10) {
        hasMission = true;
        missionTarget.active = true;
        missionText.textContent = "Mise aktivní! Doruč balíček na červené místo na mapě!";
        missionText.style.color = "#ff9800";
    }

    // 2. Dokončení mise v cíli
    if (hasMission && getDistance(player.x, player.y, missionTarget.x, missionTarget.y) < missionTarget.radius + 10) {
        hasMission = false;
        missionTarget.active = false;
        player.money += 50; // Odměna za misi
        missionText.textContent = "Skvěle! Mise splněna, vydělal jsi $50. Můžeš jet pro další misi.";
        missionText.style.color = "#00ff00";
        
        // Uložení peněz do paměti
        localStorage.setItem('gta_money', player.money);
    }

    moneyText.textContent = player.money;
}

// 7. VYKRESLOVÁNÍ GRAFIKY
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vykreslení silnic / dekorací (Pozadí města)
    ctx.fillStyle = "#333";
    ctx.fillRect(100, 100, 600, 100); // Horní hlavní silnice
    ctx.fillRect(100, 400, 600, 100); // Dolní silnice

    // Vykreslení telefonní budky (Zelené kolečko)
    if (!hasMission) {
        ctx.beginPath();
        ctx.arc(phoneBooth.x, phoneBooth.y, phoneBooth.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#4CAF50";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.fillText("MISE", phoneBooth.x - 14, phoneBooth.y + 4);
    }

    // Vykreslení cíle mise (Červené pulzující místo)
    if (missionTarget.active) {
        ctx.beginPath();
        ctx.arc(missionTarget.x, missionTarget.y, missionTarget.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(244, 67, 54, 0.6)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#f44336";
        ctx.stroke();
    }

    // Vykreslení auta hráče
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Barva auta podle toho, jestli má koupený sporťák
    ctx.fillStyle = player.hasSuperCar ? '#ffeb3b' : '#f44336';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    // Okna auta
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(-2, -player.height / 2 + 2, 8, player.height - 4);

    // Světla (předek)
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(player.width / 2 - 2, -player.height / 2 + 1, 3, 3);
    ctx.fillRect(player.width / 2 - 2, player.height / 2 - 4, 3, 3);

    ctx.restore();
}

// Spuštění hry loopu
(function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
})();
