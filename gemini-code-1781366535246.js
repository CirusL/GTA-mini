let score = 0;
const scoreText = document.getElementById('score');
const button = document.getElementById('button');

// Když klikneš na tlačítko, přičte se bod a přepíše se skóre
button.addEventListener('click', () => {
    score++;
    scoreText.textContent = score;
});