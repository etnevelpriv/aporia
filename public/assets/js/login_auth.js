import { app } from './firebase_init.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { db } from './firebase_init.js';
import { generateUserID } from './user_id.js';
import {
  doc,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function showWarning(message) {
  const warningDiv = document.getElementById('warning-message');
  if (warningDiv) {
    warningDiv.textContent = message;
    warningDiv.style.display = 'block';
  }
}
function clearWarning() {
  const warningDiv = document.getElementById('warning-message');
  if (warningDiv) {
    warningDiv.textContent = '';
    warningDiv.style.display = 'none';
  }
}

const loginForm = document.getElementById('auth-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearWarning();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const emailDoc = await getDoc(doc(db, 'emails', email));
      if (!emailDoc.exists()) {
        await userCredential.user.delete();
        showWarning('It looks like you started your registration before, but did not finish it. We have deleted your old account, please try to register a new profile.');
        return;
      }
      window.location.href = './profile.html';
    } catch (error) {
      let message;
      switch (error.code) {
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/invalid-login-credentials':
          message = 'Invalid login credentials. Please check your email and password.';
          break;
        default:
          message = 'Login error: ' + (error.message || 'Unknown error.');
      }
      showWarning(message);
    }
  });
}

const googleBtn = document.getElementById('google-signup-button');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    clearWarning();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const emailDoc = await getDoc(doc(db, 'emails', user.email));
      let userID;
      if (!emailDoc.exists()) {
        let exists = true;
        while (exists) {
          userID = generateUserID();
          const userIDDoc = await getDoc(doc(db, 'userIDs', userID));
          exists = userIDDoc.exists();
        }
        const createdAt = new Date().toISOString();
        await Promise.all([
          setDoc(doc(db, 'users', userID), {
            createdAt,
            email: user.email,
            uid: user.uid
          }),
          setDoc(doc(db, 'emails', user.email), {
            userID
          }),
          setDoc(doc(db, 'userIDs', userID), {
            userID
          })
        ]);
      }
      window.location.href = './profile.html';
    } catch (error) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        showWarning('Account exists with a different provider. Please use that provider to sign in.');
      } else {
        showWarning('Google sign-in error: ' + error.message);
      }
    }
  });
}
