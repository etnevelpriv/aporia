import { app } from './firebase_init.js';
import {
  getAuth,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { db } from './firebase_init.js';
import {
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const auth = getAuth(app);

function showForgotPasswordModal() {
  let modal = document.getElementById('forgot-password-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'forgot-password-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = '#1B1E23';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div style="background: transparent; padding: 40px 30px; border: unset; box-shadow: none; text-align: center; max-width: 400px; color: #D2DCDC;">
        <h2 style="color: #2BCBCB;">Forgot Password</h2>
        <p>Enter your email address to reset your password.</p>
        <input id="forgot-password-email" type="email" placeholder="Email address" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #2BCBCB;" />
        <div id="forgot-password-warning" style="margin-bottom: 10px; display: none;"></div>
        <button id="forgot-password-submit" style="margin-top: 10px;">Send Email</button>
        <button id="forgot-password-cancel" class="reverse-button" style="margin-top: 10px;">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  } else {
    modal.style.display = 'flex';
  }
  document.getElementById('forgot-password-submit').onclick = handleForgotPasswordSubmit;
  document.getElementById('forgot-password-cancel').onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };
}

async function handleForgotPasswordSubmit() {
  const emailInput = document.getElementById('forgot-password-email');
  const warningDiv = document.getElementById('forgot-password-warning');
  const email = emailInput.value.trim();
  warningDiv.style.display = 'none';
  warningDiv.textContent = '';
  if (!email) {
    warningDiv.textContent = 'Please enter your email address.';
    warningDiv.style.display = 'block';
    return;
  }
  try {
    const emailDoc = await getDoc(doc(db, 'emails', email));
    if (emailDoc.exists()) {
      await sendPasswordResetEmail(auth, email);
      warningDiv.textContent = 'Password reset email sent. Please check your inbox.';
      warningDiv.style.color = '#2BCBCB';
      warningDiv.style.display = 'block';
    } else {
        warningDiv.textContent = 'There is no registered profile with this email address.';
        warningDiv.style.color = '#cb2b2b';
        warningDiv.style.display = 'block';      const methods = await fetchSignInMethodsForEmail(auth, email);

    }
  } catch (error) {
    let message;
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'Invalid email address format.';
        break;
      case 'auth/user-not-found':
        message = 'No user found with this email address.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many requests. Please try again later.';
        break;
      default:
        message = 'Error: ' + (error.message || 'Unknown error.') + (error.code ? ' (' + error.code + ')' : '');
    }
    warningDiv.textContent = message;
    warningDiv.style.display = 'block';
  }
}

export { showForgotPasswordModal };
