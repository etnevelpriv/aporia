import { app, db } from './firebase_init.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, deleteDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { generateUserID } from './user_id.js';

const auth = getAuth(app);

const loginForm = document.getElementById('admin-login-form');
const loginButton = document.querySelector('.admin-login button[type="submit"]');
const adminLoginDiv = document.querySelector('.admin-login');
const adminPageDiv = document.getElementById('admin-page');
const logoutButton = document.getElementById('logout-button');

// Puzzle Management Elements
const puzzlesSection = document.getElementById('puzzles-section');
const puzzleForm = document.getElementById('puzzle-form');
const puzzleIdInput = document.getElementById('puzzle-id');
const puzzleTitleInput = document.getElementById('puzzleTitle');
const puzzleTextInput = document.getElementById('puzzleText');
const categoryInput = document.getElementById('category');
const tagsInput = document.getElementById('tags');
const categoryFieldsDiv = document.getElementById('category-fields');
const puzzlesListDiv = document.getElementById('puzzles-list');
const cancelEditBtn = document.getElementById('cancel-edit');

function showAdminPage(show) {
  adminPageDiv.style.display = show ? 'block' : 'none';
  adminLoginDiv.style.display = show ? 'none' : 'flex';
}

showAdminPage(false);

loginButton.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-username').value;
  const password = document.getElementById('password').value;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
      showAdminPageWithPuzzles(true);
    } else {
      alert('Access denied: You are not an admin.');
      await signOut(auth);
    }
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});

logoutButton.addEventListener('click', async () => {
  await signOut(auth);
  showAdminPage(false);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
      showAdminPageWithPuzzles(true);
    } else {
      showAdminPage(false);
      await signOut(auth);
    }
  } else {
    showAdminPage(false);
  }
});

function clearPuzzleForm() {
  puzzleIdInput.value = '';
  puzzleTitleInput.value = '';
  puzzleTextInput.value = '';
  categoryInput.value = 'paradox';
  tagsInput.value = '';
  categoryFieldsDiv.innerHTML = '';
  cancelEditBtn.style.display = 'none';
}

function renderCategoryFields(category, data = {}) {
  let html = '';
  if (category === 'statement') {
    html += `<div class="form-group">
      <label for="agreedNumber">Agreed Number</label>
      <input type="number" id="agreedNumber" class="form-control" value="${data.agreedNumber || 0}" readonly>
    </div>`;
    html += `<div class="form-group">
      <label for="disagreedNumber">Disagreed Number</label>
      <input type="number" id="disagreedNumber" class="form-control" value="${data.disagreedNumber || 0}" readonly>
    </div>`;
  } else if (category === 'wouldyourather') {
    html += `<div class="form-group">
      <label for="optionRed">Option Red</label>
      <input type="text" id="optionRed" class="form-control" value="${data.optionRed || ''}">
    </div>`;
    html += `<div class="form-group">
      <label for="optionBlue">Option Blue</label>
      <input type="text" id="optionBlue" class="form-control" value="${data.optionBlue || ''}">
    </div>`;
    html += `<div class="form-group">
      <label for="optionRedNumber">Option Red Number</label>
      <input type="number" id="optionRedNumber" class="form-control" value="${data.optionRedNumber || 0}" readonly>
    </div>`;
    html += `<div class="form-group">
      <label for="optionBlueNumber">Option Blue Number</label>
      <input type="number" id="optionBlueNumber" class="form-control" value="${data.optionBlueNumber || 0}" readonly>
    </div>`;
  }
  categoryFieldsDiv.innerHTML = html;
}

categoryInput.addEventListener('change', (e) => {
  renderCategoryFields(e.target.value);
});

function puzzleToRow(puzzle, id) {
  let createdAt = puzzle.createdAt ? new Date(puzzle.createdAt).toLocaleString() : 'N/A';
  let html = `<div class="card mb-2">
    <div class="card-body">
      <h5 class="card-title">${puzzle.puzzleTitle} <span class="badge badge-info">${puzzle.category}</span></h5>
      <p class="card-text">${puzzle.puzzleText}</p>
      <p><b>Puzzle ID:</b> <span style='color:var(--secondary-color);font-family:monospace;'>${id}</span></p>
      <p><b>Created At:</b> ${createdAt}</p>
      <p><b>Tags:</b> ${(puzzle.tags || []).join(', ')}</p>
      <p><b>Number of Answers:</b> ${(puzzle.answers ? puzzle.answers.length : 0)}</p>
      ${(puzzle.category === 'statement') ? `<p><b>Agreed Number:</b> ${puzzle.agreedNumber || 0} &nbsp; <b>Disagreed Number:</b> ${puzzle.disagreedNumber || 0}</p>` : ''}
      ${(puzzle.category === 'wouldyourather') ? `<p><b>Option Red:</b> ${puzzle.optionRed || ''} (${puzzle.optionRedNumber || 0})<br><b>Option Blue:</b> ${puzzle.optionBlue || ''} (${puzzle.optionBlueNumber || 0})</p>` : ''}
      <div style="margin-top:10px;">
        <b>Answers:</b>
        <div style="margin-left:15px;">
          ${(puzzle.answers && puzzle.answers.length > 0) ? puzzle.answers.map((ans, i) => `
            <div style='margin-bottom:10px;padding:8px 12px;background:rgba(81,184,203,0.07);border-radius:6px;'>
              <b>Answer #${i+1}:</b> <span style='color:var(--secondary-color);'>${ans.answerText || ''}</span><br>
              <b>UserID:</b> <span style='font-family:monospace;'>${ans.userID || ''}</span> &nbsp; <b>Likes:</b> ${ans.likes || 0} &nbsp; <b>Reports:</b> ${ans.reportCount || 0}<br>
              <b>Reported By:</b> ${(ans.reportedBy && ans.reportedBy.length > 0) ? ans.reportedBy.join(', ') : 'None'}
              <div style='margin-left:15px;margin-top:5px;'>
                <b>Comments:</b>
                ${(ans.comments && ans.comments.length > 0) ? ans.comments.map((com, j) => `
                  <div style='margin-bottom:6px;padding:6px 10px;background:rgba(43,203,203,0.07);border-radius:4px;'>
                    <b>Comment #${j+1}:</b> <span style='color:var(--third-color);'>${com.commentText || ''}</span><br>
                    <b>UserID:</b> <span style='font-family:monospace;'>${com.userID || ''}</span> &nbsp; <b>Likes:</b> ${com.likes || 0} &nbsp; <b>Reports:</b> ${com.reportCount || 0}<br>
                    <b>Reported By:</b> ${(com.reportedBy && com.reportedBy.length > 0) ? com.reportedBy.join(', ') : 'None'}
                  </div>
                `).join('') : '<span style="color:#888;">No comments</span>'}
              </div>
            </div>
          `).join('') : '<span style="color:#888;">No answers</span>'}
        </div>
      </div>
      <button onclick="window.editPuzzle('${id}')">Edit</button>
      <button class="reverse-button" onclick="window.deletePuzzle('${id}')">Delete</button>
    </div>
  </div>`;
  return html;
}

async function loadPuzzles() {
  puzzlesListDiv.innerHTML = '<div>Loading puzzles...</div>';
  const querySnapshot = await getDocs(collection(db, 'puzzles'));
  let html = '';
  querySnapshot.forEach((doc) => {
    html += puzzleToRow(doc.data(), doc.id);
  });
  puzzlesListDiv.innerHTML = html || '<div>No puzzles found.</div>';
}

window.editPuzzle = async function(id) {
  const docRef = doc(db, 'puzzles', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    puzzleIdInput.value = id;
    puzzleTitleInput.value = data.puzzleTitle || '';
    puzzleTextInput.value = data.puzzleText || '';
    categoryInput.value = data.category || 'paradox';
    tagsInput.value = (data.tags || []).join(', ');
    renderCategoryFields(data.category, data);
    cancelEditBtn.style.display = 'inline-block';
    window.scrollTo({ top: puzzleForm.offsetTop - 40, behavior: 'smooth' });
  }
};

window.deletePuzzle = async function(id) {
  if (confirm('Are you sure you want to delete this puzzle?')) {
    await deleteDoc(doc(db, 'puzzles', id));
    loadPuzzles();
    clearPuzzleForm();
  }
};

function generatePuzzleID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

puzzleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let id = puzzleIdInput.value;
  if (!id) {
    // Generate unique puzzleID
    let exists = true;
    while (exists) {
      id = generatePuzzleID();
      const docSnap = await getDoc(doc(db, 'puzzles', id));
      exists = docSnap.exists();
    }
  }
  const puzzleTitle = puzzleTitleInput.value.trim();
  const puzzleText = puzzleTextInput.value.trim();
  const category = categoryInput.value;
  const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  let puzzle = {
    puzzleTitle,
    puzzleText,
    category,
    tags,
    createdAt: new Date().toISOString(),
    answers: [],
  };
  if (category === 'statement') {
    puzzle.agreedNumber = parseInt(document.getElementById('agreedNumber').value) || 0;
    puzzle.disagreedNumber = parseInt(document.getElementById('disagreedNumber').value) || 0;
  } else if (category === 'wouldyourather') {
    puzzle.optionRed = document.getElementById('optionRed').value;
    puzzle.optionBlue = document.getElementById('optionBlue').value;
    puzzle.optionRedNumber = parseInt(document.getElementById('optionRedNumber').value) || 0;
    puzzle.optionBlueNumber = parseInt(document.getElementById('optionBlueNumber').value) || 0;
  }
  // Remove ability to change the numbers by not updating them if editing
  if (puzzleIdInput.value) {
    const oldDoc = await getDoc(doc(db, 'puzzles', id));
    if (oldDoc.exists()) {
      const oldData = oldDoc.data();
      if (category === 'statement') {
        puzzle.agreedNumber = oldData.agreedNumber || 0;
        puzzle.disagreedNumber = oldData.disagreedNumber || 0;
      } else if (category === 'wouldyourather') {
        puzzle.optionRedNumber = oldData.optionRedNumber || 0;
        puzzle.optionBlueNumber = oldData.optionBlueNumber || 0;
      }
    }
  }
  await setDoc(doc(db, 'puzzles', id), puzzle);
  loadPuzzles();
  clearPuzzleForm();
});

cancelEditBtn.addEventListener('click', (e) => {
  e.preventDefault();
  clearPuzzleForm();
});

// Load puzzles when admin page is shown
function showAdminPageWithPuzzles(show) {
  showAdminPage(show);
  if (show) loadPuzzles();
}
