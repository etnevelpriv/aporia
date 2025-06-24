import { app, db } from './firebase_init.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

function generateSlug(puzzle) {
  const slugify = str => str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const tagString = (puzzle.tags || []).join('-');
  return (
    '/puzzle/' +
    slugify(puzzle.category) +
    '/' +
    slugify(puzzle.puzzleTitle) +
    (tagString ? '-' + slugify(tagString) : '')
  );
}

async function main() {
  const root = document.getElementById('all-puzzles-root');
  root.innerHTML = '<div>Loading puzzles...</div>';
  const querySnapshot = await getDocs(collection(db, 'puzzles'));
  if (querySnapshot.empty) {
    root.innerHTML = '<div>No puzzles found.</div>';
    return;
  }
  let html = '<div class="puzzle-list">';
  querySnapshot.forEach(docSnap => {
    const puzzle = docSnap.data();
    const slug = generateSlug(puzzle);
    html += `<div class="puzzle-list-item">
      <a href="${slug}" class="puzzle-link">
        <b>${puzzle.puzzleTitle}</b> <span class="badge">${puzzle.category}</span><br>
        <span class="puzzle-tags">${(puzzle.tags || []).join(', ')}</span>
      </a>
    </div>`;
  });
  html += '</div>';
  root.innerHTML = html;

  document.querySelectorAll('.puzzle-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = link.getAttribute('href');
    });
  });
}

main();
