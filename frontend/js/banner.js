window.addEventListener('load', () => {
  document.body.classList.add('is-loaded');
});

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('#mobileMenu');

if (menuButton && mobileMenu) {
  const setMenuState = (isOpen) => {
    mobileMenu.classList.toggle('is-open', isOpen);
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  };

  menuButton.addEventListener('click', () => {
    setMenuState(!mobileMenu.classList.contains('is-open'));
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuState(false));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuState(false);
  });
}
