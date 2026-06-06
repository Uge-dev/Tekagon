// The list of words you provided
const words = [
  "Tekagon",
  "Tech",
  "Servicing",
  "Company"
];

let currentWordIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;

function typewriterStep() {
  const textElement = document.querySelector('.typewriter-text');
  if (!textElement) {
    setTimeout(typewriterStep, 500);
    return;
  }

  const currentWord = words[currentWordIndex];

  if (isDeleting) {
    currentCharIndex--;
  } else {
    currentCharIndex++;
  }

  textElement.textContent = currentWord.substring(0, currentCharIndex);

  let typeSpeed = isDeleting ? 75 : 150;

  if (!isDeleting && currentCharIndex === currentWord.length) {
    typeSpeed = 1500;
    isDeleting = true;
  } else if (isDeleting && currentCharIndex === 0) {
    isDeleting = false;
    currentWordIndex = (currentWordIndex + 1) % words.length;
    typeSpeed = 500;
  }

  setTimeout(typewriterStep, typeSpeed);
}

function startProfileTypewriter() {
  if (document.querySelector('.typewriter-text')) {
    setTimeout(typewriterStep, 500);
  } else {
    setTimeout(startProfileTypewriter, 500);
  }
}

// Start the animation when the page loads or when the profile banner becomes available.
document.addEventListener('DOMContentLoaded', startProfileTypewriter);