// 1. NAČTENÍ SKÓRE: Podíváme se do paměti telefonu (localStorage), jestli tam už nějaké skóre je.
// Pokud tam nic není (hraješ poprvé), nastavíme nulu (0).
let score = parseInt(localStorage.getItem('savedScore')) || 0;

// Tady si připravíme propojení s textem a tlačítkem z HTML souboru
const scoreText = document.getElementById('score');
const button = document.getElementById('button');

// 2. ZOBRAZENÍ SKÓRE: Hned jak se hra spustí, ukážeme hráči jeho načtené skóre.
scoreText.textContent = score;

// 3. KLIKACÍ FUNKCE: Tady nastavíme, co se stane, když klikneš na tlačítko.
button.addEventListener('click', () => {
    // Přičteme jeden bod k našemu skóre
    score++;
    
    // Přepíšeme text na obrazovce, aby hráč viděl nové skóre
    scoreText.textContent = score;
    
    // 4. ULOŽENÍ SKÓRE: Nové skóre hned uložíme do paměti telefonu pod názvem 'savedScore'
    localStorage.setItem('savedScore', score);
});
