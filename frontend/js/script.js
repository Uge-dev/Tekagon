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

// Scroll event for sticky header - REMOVED to prevent header movement
// window.addEventListener("scroll", function () {
//   header.classList.toggle("sticky", window.scrollY > 8);
// });



//page preloader
// Wait for the page to fully load
window.addEventListener("load", function () {
  // Add a minimal delay to keep the preloader visible briefly
  setTimeout(() => {
    // Hide the preloader
    const preloader = document.getElementById("preloader");
    preloader.style.opacity = "0";
    preloader.style.transition = "opacity 0.5s ease";

    // After the transition, completely hide the preloader
    setTimeout(() => {
      preloader.style.display = "none";

      // Show the main content immediately
      const content = document.querySelector(".content");
      content.style.display = "block";
      content.style.opacity = "1";
      content.style.transition = "opacity 0.5s ease";
    }, 500); // Match this delay to the opacity transition duration
  }, 500); // Preloader stays visible for only 0.5 seconds (reduced from 2 seconds)
});





/* section fr featured product*/

const carouselSets = document.querySelectorAll('.carousel-set');
const resetButton = document.getElementById('resetButton');
let currentSet = 0;
let animationTimeout;

function showNextSet() {
  // Hide the current set
  const previousSet = carouselSets[currentSet];
  const previousImages = previousSet.querySelectorAll('img');
  previousImages.forEach((img) => {
    img.style.opacity = '0';
    img.style.transform = 'translateY(50px)';
  });
  previousSet.style.opacity = '0';

  // Move to the next set
  currentSet = (currentSet + 1) % carouselSets.length;
  const nextSet = carouselSets[currentSet];

  // Show the new set
  nextSet.style.opacity = '1';
  nextSet.style.transform = 'translateY(0)';

  // Animate each image with a delay
  const images = nextSet.querySelectorAll('img');
  images.forEach((img, index) => {
    setTimeout(() => {
      img.style.opacity = '1';
      img.style.transform = 'translateY(0)';
    }, index * 300); // 300ms delay between images
  });

  // Schedule the next animation
  animationTimeout = setTimeout(showNextSet, 3000); // Adjust time for each group
}

function restartGroupAnimation(event) {
  // Prevent default button behavior
  event.preventDefault();

  // Stop current animation loop
  clearTimeout(animationTimeout);

  // Hide all sets immediately
  carouselSets.forEach((set) => {
    set.style.opacity = '0';
    set.style.transform = 'translateY(100%)';
    const images = set.querySelectorAll('img');
    images.forEach((img) => {
      img.style.opacity = '0';
      img.style.transform = 'translateY(50px)';
    });
  });

  // Restart from the first set
  currentSet = 0;
  const firstSet = carouselSets[currentSet];
  firstSet.style.opacity = '1';
  firstSet.style.transform = 'translateY(0)';
  const firstImages = firstSet.querySelectorAll('img');
  firstImages.forEach((img, index) => {
    setTimeout(() => {
      img.style.opacity = '1';
      img.style.transform = 'translateY(0)';
    }, index * 300); // 300ms delay between images
  });

  // Restart the animation loop
  animationTimeout = setTimeout(showNextSet, 3000);
}

// Initialize the first set
showNextSet();

// Add event listener for the reset button
resetButton.addEventListener('click', restartGroupAnimation);









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








