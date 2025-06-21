import { app } from './firebase_init.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { sendEmailVerification } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { db } from './firebase_init.js';
import { generateUserID } from './user_id.js';
import {
  collection,
  doc,
  setDoc,
  getDoc
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

const registrationForm = document.getElementById('auth-form');
if (registrationForm) {
  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearWarning();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (password !== confirmPassword) {
      showWarning('Passwords do not match.');
      return;
    }
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.includes('password')) {
        showWarning('An account with this email and provider already exists.');
        return;
      } else if (methods.length > 0) {
        showWarning('This email is registered with another provider. Please sign in with that provider to link your email/password.');
        return;
      } else {
        const passwordErrors = [];
        if (password.length < 8) {
          passwordErrors.push('at least 8 characters');
        }
        if (!/[A-Z]/.test(password)) {
          passwordErrors.push('one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
          passwordErrors.push('one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
          passwordErrors.push('one number');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          passwordErrors.push('one special character');
        }
        if (passwordErrors.length > 0) {
          showWarning('Password must contain ' + passwordErrors.join(', ') + '.');
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);
        showVerificationModal(email);
        pollForEmailVerification(user, email);
      }
    } catch (error) {
      let message;
      if (error.code === 'auth/email-already-in-use') {
        const emailDoc = await getDoc(doc(db, 'emails', email));
        if (!emailDoc.exists()) {
          try {
            const oldUserCred = await signInWithEmailAndPassword(auth, email, password);
            await oldUserCred.user.delete();
            showWarning('It looks like you started your registration before, but did not finish it. We have deleted your old account, please try again.');
            return;
          } catch (delErr) {
            return;
          }
        } else {
          message = 'This email address is already registered.';
        }
      } else {
        switch (error.code) {
          case 'auth/password-does-not-meet-requirements':
            message = 'Password must contain at least one special character.';
            break;
          case 'auth/weak-password':
            message = 'The password is too weak. Please choose a stronger password.';
            break;
          case 'auth/invalid-email':
            message = 'Invalid email address format.';
            break;
          default:
            message = 'Registration error: ' + (error.message || 'Unknown error.');
        }
      }
      if (message) showWarning(message);
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
      let userID;
      const emailDoc = await getDoc(doc(db, 'emails', user.email));
      if (emailDoc.exists()) {
        userID = emailDoc.data().userID;
      } else {
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
        const pendingCred = error.credential;
        const email = error.customData.email;
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes('password')) {
          const password = prompt('This email is registered with email/password. Please enter your password to link Google.');
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await linkWithPopup(userCredential.user, googleProvider);
            window.location.href = './profile.html';
          } catch (err) {
            showWarning('Failed to link Google: ' + err.message);
          }
        } else {
          showWarning('Account exists with a different provider. Please use that provider to sign in.');
        }
      } else {
        showWarning('Google sign-in error: ' + error.message);
      }
    }
  });
}

function showVerificationModal(email) {
  let modal = document.getElementById('verification-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'verification-modal';
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
        <h2 style="color: #2BCBCB;">Verify your email</h2>
        <p>We sent a verification link to <b>${email}</b>.<br>Please check your inbox and verify your email to continue.</p>
        <button id="resend-verification" style="margin-top: 20px;">Resend Email</button>
        <button id="cancel-registration" class="reverse-button" style="margin-top: 10px;">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  } else {
    modal.style.display = 'flex';
  }
  document.getElementById('resend-verification').onclick = async () => {
    const user = auth.currentUser;
    if (user) await sendEmailVerification(user);
    alert('Verification email resent.');
  };
  document.getElementById('cancel-registration').onclick = async () => {
    const user = auth.currentUser;
    if (user) {
      await user.delete();
    }
    modal.style.display = 'none';
    document.body.style.overflow = '';
    window.location.reload();
  };
}

function hideVerificationModal() {
  const modal = document.getElementById('verification-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function pollForEmailVerification(user, email) {
  let interval = setInterval(async () => {
    await user.reload();
    if (user.emailVerified) {
      clearInterval(interval);
      hideVerificationModal();
      let userID;
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
      window.location.href = './profile.html';
    }
  }, 3000);
  window.addEventListener('beforeunload', async (e) => {
    await user.reload();
    if (!user.emailVerified) {
      try { await user.delete(); } catch { }
    }
  });
}
