(function () {
    // SCSS Logic translation
    // @mixin dots($count) { $text-shadow: (); ... }

    function generateDots(count) {
        let shadows = [];
        for (let i = 0; i < count; i++) {
            // Position relative to font-size (em)
            const x = (-0.5 + Math.random() * 3).toFixed(3) + 'em';
            const y = (-0.5 + Math.random() * 3).toFixed(3) + 'em';
            const blur = '9px'; // Slightly larger blur

            // Blue (210) to Purple (290)
            const hue = Math.floor(Math.random() * 80 + 210);
            const color = `hsla(${hue}, 100%, 70%, 0.9)`; // Increased lightness slightly for visibility

            shadows.push(`${x} ${y} ${blur} ${color}`);
        }
        return shadows.join(', ');
    }

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes move {
            from {
                transform: rotate(0deg) scale(12) translateX(-20px);
            }
            to {
                transform: rotate(360deg) scale(18) translateX(20px);
            }
        }

        #particle-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1; 
            overflow: hidden;
        }

        .particle-layer {
            position: fixed;
            top: 50%;
            left: 50%;
            width: 3em;
            height: 3em;
            content: '.';
            mix-blend-mode: screen;
            font-size: 80px; /* Increased from 52px */
            color: transparent;
            animation: move infinite ease-in-out alternate;
        }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'particle-container';

    // Create 4 layers with much slower durations (approx 3x slower)
    // 1. body::before
    const layer1 = document.createElement('div');
    layer1.className = 'particle-layer';
    layer1.textContent = '.'; // Required for text-shadow
    layer1.style.textShadow = generateDots(40);
    layer1.style.animationDuration = '132s'; // 44s * 3
    layer1.style.animationDelay = '-81s';
    container.appendChild(layer1);

    // 2. body::after
    const layer2 = document.createElement('div');
    layer2.className = 'particle-layer';
    layer2.textContent = '.';
    layer2.style.textShadow = generateDots(40);
    layer2.style.animationDuration = '129s'; // 43s * 3
    layer2.style.animationDelay = '-96s';
    container.appendChild(layer2);

    // 3. head::before
    const layer3 = document.createElement('div');
    layer3.className = 'particle-layer';
    layer3.textContent = '.';
    layer3.style.textShadow = generateDots(40);
    layer3.style.animationDuration = '126s'; // 42s * 3
    layer3.style.animationDelay = '-69s';
    container.appendChild(layer3);

    // 4. head::after
    const layer4 = document.createElement('div');
    layer4.className = 'particle-layer';
    layer4.textContent = '.';
    layer4.style.textShadow = generateDots(40);
    layer4.style.animationDuration = '123s'; // 41s * 3
    layer4.style.animationDelay = '-57s';
    container.appendChild(layer4);

    document.body.appendChild(container);
})();
