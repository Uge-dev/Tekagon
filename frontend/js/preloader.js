window.addEventListener('load', function() {
  const preloader = document.getElementById('preloader');
  
  // Add the fade-out class once the window is fully loaded
  preloader.classList.add('fade-out');
  
  // Remove the preloader from the DOM completely after the fade transition (500ms)
  setTimeout(() => {
    preloader.style.display = 'none';
  }, 500); 
});