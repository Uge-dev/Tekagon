(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
      console.warn('Tekagon service worker registration failed:', error);
    });
  });
})();
