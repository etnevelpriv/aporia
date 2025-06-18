// Hamburger menu
const hamburger = document.getElementById('hamburger-menu');
const fullscreenMenu = document.getElementById('fullscreen-menu');

function toggleMenu() {
  hamburger.classList.toggle('active');
  fullscreenMenu.classList.toggle('open');
  if (fullscreenMenu.classList.contains('open')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

if (hamburger && fullscreenMenu) {
  hamburger.addEventListener('click', toggleMenu);
  hamburger.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') toggleMenu();
  });
  fullscreenMenu.querySelectorAll('.nav-link, .navbar-button').forEach(el => {
    el.addEventListener('click', () => {
      if (fullscreenMenu.classList.contains('open')) toggleMenu();
    });
  });
}