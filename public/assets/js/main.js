import { app } from './firebase_init.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
const auth = getAuth(app);
function toggleLoginButtons(show) {
  document.querySelectorAll('.navbar-button-a').forEach(btn => {
    btn.style.display = show ? 'block' : 'none';
  });
}
onAuthStateChanged(auth, user => {
  toggleLoginButtons(!user);
});

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

function setActiveMenuItem() {
  let path = window.location.pathname;
  if (path.startsWith('/')) path = path.substring(1);
  path = path.replace(/\.html$/, '');
  if (path === '' || path === 'index') path = 'index';

  function isActive(href) {
    if (!href) return false;
    href = href.replace(/^\.?\//, '');
    href = href.replace(/\.html$/, '');
    if (href === '' || href === 'index') href = 'index';
    return href === path;
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    if (isActive(link.getAttribute('href'))) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', function() {
  if (window.scrollY > 0) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

setActiveMenuItem();