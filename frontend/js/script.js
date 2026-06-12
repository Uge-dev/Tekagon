// Updated navbar toggle for mobile
const hamburger = document.getElementById('hamburger');
const navbar = document.getElementById('navbar');
const header = document.querySelector('header');

if (hamburger && navbar) {
  hamburger.addEventListener('click', function (e) {
    e.preventDefault();
    hamburger.classList.toggle('active');
    navbar.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', hamburger.classList.contains('active'));
  });

  const navLinks = navbar.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      hamburger.classList.remove('active');
      navbar.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024) {
      hamburger.classList.remove('active');
      navbar.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

// Scroll event for sticky header
window.addEventListener("scroll", function () {
  header.classList.toggle("sticky", window.scrollY > 80);
});



// Keep the preloader independent from slow remote fonts, videos, and APIs.
function dismissPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader || preloader.classList.contains('is-hidden')) return;

  preloader.classList.add('is-hidden');
  setTimeout(() => preloader.remove(), 220);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(dismissPreloader, 180), { once: true });
} else {
  setTimeout(dismissPreloader, 180);
}

// Hard fallback: the overlay must never trap the visitor.
setTimeout(dismissPreloader, 900);





/* section fr featured product*/

const carouselSets = document.querySelectorAll('.carousel-set');
const resetButton = document.getElementById('resetButton');
let currentSet = 0;
let animationTimeout;

function showCarouselSet(index) {
  carouselSets.forEach((set, setIndex) => {
    const images = set.querySelectorAll('img');

    if (setIndex === index) {
      set.style.opacity = '1';
      set.style.transform = 'translateY(0)';
      images.forEach((img) => {
        img.style.opacity = '0';
        img.style.transform = 'translateY(50px)';
      });
      images.forEach((img, idx) => {
        setTimeout(() => {
          img.style.opacity = '1';
          img.style.transform = 'translateY(0)';
        }, idx * 300);
      });
    } else {
      set.style.opacity = '0';
      set.style.transform = 'translateY(100%)';
      images.forEach((img) => {
        img.style.opacity = '0';
        img.style.transform = 'translateY(50px)';
      });
    }
  });

  currentSet = index;
}

function showNextSet() {
  clearTimeout(animationTimeout);

  const nextIndex = (currentSet + 1) % carouselSets.length;
  showCarouselSet(nextIndex);

  animationTimeout = setTimeout(showNextSet, 3000); // Adjust time for each group
}

// Initialize the first set
showCarouselSet(currentSet);
animationTimeout = setTimeout(showNextSet, 3000);

// Add event listener for the reset button to advance to the next group
if (resetButton) {
  resetButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    showNextSet();
  });
}









//sectioon for button animation    
function showImage(imageId) {
  // Hide all images
  document.querySelectorAll('.image').forEach(image => {
    image.classList.remove('active');
  });

  // Show the selected image
  const selectedImage = document.getElementById(imageId);
  selectedImage.classList.add('active');
}







//section for hover effect
// Optional: Add hover-based animations
const phItems = document.querySelectorAll('.ph-item');

phItems.forEach((item) => {
  item.addEventListener('mouseover', () => {
    const id = item.id;

    if (id === 'left') {
      document.querySelector('.ph-sect').style.transform = 'translateX(20%)';
    } else if (id === 'right') {
      document.querySelector('.ph-sect').style.transform = 'translateX(-20%)';
    }
  });

  item.addEventListener('mouseleave', () => {
    document.querySelector('.ph-sect').style.transform = 'translateX(0)';
  });
});








// Select all FAQ items
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach((item) => {
  const question = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');
  const icon = item.querySelector('.icon');

  question.addEventListener('click', () => {
    // Toggle the "open" class for smooth transitions
    answer.classList.toggle('open');

    // Toggle the icon between + and -
    icon.textContent = icon.textContent === '+' ? '-' : '+';
  });
});

// Scroll Direction Detection and Animation Handler
let lastScrollTop = 0;
const animatedElements = new Map();

function initScrollAnimations() {
  // Select all sections (except banner and header), cards, and major container divs to animate
  const sections = document.querySelectorAll(
    'section:not(.banner):not(header), .card, .carousel-container, .cont-gp, .val-sect, .abt-bg, .ph1, .faq-det, .bg-container, .card-container'
  );

  if (sections.length === 0) return;

  // Add animation class to sections and track them
  sections.forEach((section) => {
    section.classList.add('scroll-animate');
    animatedElements.set(section, false); // false = not animated yet
  });
}

// Scroll event handler to detect direction and apply animations
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const isScrollingDown = scrollTop > lastScrollTop;

  animatedElements.forEach((isAnimated, element) => {
    const elementTop = element.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    // Check if element is in viewport
    if (elementTop < windowHeight * 0.85 && elementTop > -100) {
      if (!isAnimated) {
        // Remove reverse class if it exists
        element.classList.remove('reverse');
        // Add active class to trigger animation
        element.classList.add('active');
        animatedElements.set(element, true);
      }
    } else if (elementTop > windowHeight) {
      // Element is below viewport
      if (isAnimated) {
        element.classList.remove('active');
        element.classList.add('reverse');
        animatedElements.set(element, false);
      }
    }
  });

  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, { passive: true });

// Initialize animations when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      initScrollAnimations();
    }, 50);
  });
} else {
  initScrollAnimations();
}








