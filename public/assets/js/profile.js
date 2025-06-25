import { app, db } from './firebase_init.js';
import { getAuth, onAuthStateChanged, signOut, deleteUser, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { doc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const auth = getAuth(app);

const encourageLoginDiv = document.getElementById('encourageLogin');
const profileInfoDiv = document.getElementById('profileInfo');
const userIDSpan = document.getElementById('userID');
const emailP = document.getElementById('email');
const creationDateP = document.getElementById('creationdate');

function showProfileInfo(show) {
  if (profileInfoDiv) profileInfoDiv.style.display = show ? 'block' : 'none';
  if (encourageLoginDiv) encourageLoginDiv.style.display = show ? 'none' : 'flex';
}

function showToast(message, duration = 5000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  } else {
    toast.classList.remove('toast-fadeout');
  }
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  toast.style.zIndex = '9999';
  void toast.offsetWidth;

  toast.onclick = null;
  toast.onclick = () => {
    toast.classList.add('toast-fadeout');
    toast.addEventListener('transitionend', function handler() {
      toast.style.display = 'none';
      toast.classList.remove('toast-fadeout');
      toast.removeEventListener('transitionend', handler);
    });
  };

  setTimeout(() => {
    if (toast.style.display === 'block') {
      toast.classList.add('toast-fadeout');
      toast.addEventListener('transitionend', function handler() {
        toast.style.display = 'none';
        toast.classList.remove('toast-fadeout');
        toast.removeEventListener('transitionend', handler);
      });
    }
  }, duration);
}

function showConfirmModal(message, onConfirm, onCancel = null) {
  let modal = document.getElementById('modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'Confirmation';
    const msg = document.createElement('div');
    msg.className = 'modal-message';
    msg.textContent = message;
    const btns = document.createElement('div');
    btns.className = 'modal-buttons';
    const btnYes = document.createElement('button');
    btnYes.textContent = 'Yes';
    btnYes.className = 'modal-button';
    btnYes.onclick = () => { 
      document.body.removeChild(modal); 
      onConfirm(); 
    };
    const btnNo = document.createElement('button');
    btnNo.textContent = 'No';
    btnNo.className = 'modal-button reverse-button';
    btnNo.onclick = () => { 
      document.body.removeChild(modal); 
      if (onCancel) onCancel();
    };
    btns.appendChild(btnYes);
    btns.appendChild(btnNo);
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btns);
    modal.appendChild(box);
    document.body.appendChild(modal);
  }
}

function showInfoModal(message, onOk = null) {
  let modal = document.getElementById('modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box';
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'Information';
    const msg = document.createElement('div');
    msg.className = 'modal-message';
    msg.textContent = message;
    const btns = document.createElement('div');
    btns.className = 'modal-buttons';
    const btnOk = document.createElement('button');
    btnOk.textContent = 'OK';
    btnOk.className = 'modal-button';
    btnOk.onclick = () => { 
      document.body.removeChild(modal); 
      if (onOk) onOk();
    };
    btns.appendChild(btnOk);
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btns);
    modal.appendChild(box);
    document.body.appendChild(modal);
  }
}

let isProcessingAuth = false;

onAuthStateChanged(auth, async (user) => {
  if (isProcessingAuth) {
    return;
  }
  
  if (user) {
    isProcessingAuth = true;
    
    try {
      showProfileInfo(true);
      emailP.textContent = user.email;
      
      const emailDoc = await getDoc(doc(db, 'emails', user.email));      let userID = '#UNKNOWN';
      let creationDate = '';
      let decisions = [], answers = [], comments = [], myPuzzles = [];
      
      if (emailDoc.exists()) {
        userID = '#' + (emailDoc.data().userID || 'UNKNOWN');
        const userDoc = await getDoc(doc(db, 'users', emailDoc.data().userID));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const createdAt = userData.createdAt;
          
          if (createdAt) {
            const date = new Date(createdAt);
            creationDate = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
          }
            decisions = userData.decisions || [];
          answers = userData.answers || [];
          myPuzzles = userData.myPuzzles || [];
          comments = [];
          
          answers.forEach(ans => {
            if (Array.isArray(ans.comments)) {
              ans.comments.forEach(comment => {
                comments.push({
                  ...comment,
                  puzzleTitle: ans.puzzleTitle,
                  puzzleURL: ans.puzzleURL
                });
              });
            }
          });
          
          try {
            const puzzlesSnapshot = await getDocs(collection(db, 'puzzles'));
            puzzlesSnapshot.forEach(puzzleDoc => {
              const puzzleData = puzzleDoc.data();
              const puzzleAnswers = puzzleData.answers || [];
              
              puzzleAnswers.forEach(answer => {
                if (Array.isArray(answer.comments)) {
                  answer.comments.forEach(comment => {
                    if (comment.userID === emailDoc.data().userID) {
                      const alreadyExists = comments.some(existingComment => 
                        existingComment.commentID === comment.commentID
                      );
                      
                      if (!alreadyExists) {
                        const category = (puzzleData.category || '').toLowerCase().replace(/\s+/g, '');
                        const title = (puzzleData.puzzleTitle || '').replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().split(' ').filter(Boolean).join('-');
                        const tags = (puzzleData.tags || []).map(tag => tag.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase()).join('-');
                        let slug = `/puzzle/${category}/${title}`;
                        if (tags) slug += `-${tags}`;
                        const puzzleURL = window.location.origin + slug;
                        
                        comments.push({
                          ...comment,
                          puzzleTitle: puzzleData.puzzleTitle,
                          puzzleURL: puzzleURL
                        });
                      }
                    }
                  });
                }
              });
            });
          } catch (error) {
            console.error('Error fetching comments from all puzzles:', error);
          }
        }
      }
      
      userIDSpan.textContent = userID;
      creationDateP.textContent = creationDate || '-';      document.getElementById('decisionsCount').textContent = decisions.length;
      document.getElementById('answerCount').textContent = answers.length;
      document.getElementById('commentCount').textContent = comments.length;
      document.getElementById('myPuzzlesCount').textContent = myPuzzles.length;

      const decisionsList = document.getElementById('userDecisionsList');
      const answersList = document.getElementById('userAnswersList');
      const commentsList = document.getElementById('userCommentsList');
      const puzzlesList = document.getElementById('userPuzzlesList');
      
      if (decisionsList) {
        decisionsList.innerHTML = '';
        decisions.forEach(d => {
          const card = document.createElement('div');
          card.className = 'list-group-item';
          card.style.cursor = 'pointer';
          card.tabIndex = 0;
          card.innerHTML = `<strong>${d.puzzleTitle || ''}</strong><br><span>${d.decisionText || ''}</span>`;
          if (d.puzzleURL) {
            card.onclick = () => {
              window.open(d.puzzleURL, '_blank');
            };
          }
          decisionsList.appendChild(card);
        });
      }
      
      if (answersList) {
        answersList.innerHTML = '';
        answers.forEach(a => {
          const card = document.createElement('div');
          card.className = 'list-group-item';
          card.style.cursor = 'pointer';
          card.tabIndex = 0;
          card.innerHTML = `<strong>${a.puzzleTitle || ''}</strong><br><span>${a.answerText || ''}</span>`;
          if (a.puzzleURL) {
            let url = a.puzzleURL;
            if (a.answerID) url += `#${a.answerID}`;
            card.onclick = () => {
              window.open(url, '_blank');
            };
          }
          answersList.appendChild(card);
        });
      }
        if (commentsList) {
        commentsList.innerHTML = '';
        comments.forEach(c => {
          const card = document.createElement('div');
          card.className = 'list-group-item';
          card.style.cursor = 'pointer';
          card.tabIndex = 0;
          card.innerHTML = `<strong>${c.puzzleTitle || ''}</strong><br><span>${c.commentText || ''}</span>`;
          if (c.puzzleURL) {
            let url = c.puzzleURL;
            if (c.commentID) url += `#${c.commentID}`;
            card.onclick = () => {
              window.open(url, '_blank');
            };
          }
          commentsList.appendChild(card);
        });
      }
      
      if (puzzlesList) {
        puzzlesList.innerHTML = '';
        if (myPuzzles.length === 0) {
          const emptyCard = document.createElement('div');
          emptyCard.className = 'list-group-item text-center';
          emptyCard.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-puzzle-piece fa-3x mb-3" style="color: var(--secondary-color);"></i>
              <p>You haven't created any puzzles yet.</p>
              <a href="/create.html" class="btn btn-primary">Create Your First Puzzle</a>
            </div>
          `;
          puzzlesList.appendChild(emptyCard);
        } else {
          myPuzzles.forEach(p => {
            const card = document.createElement('div');
            card.className = 'list-group-item puzzle-card';
            card.style.cursor = 'pointer';
            card.tabIndex = 0;
            
            const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '';
            const categoryBadge = p.category ? `<span class="badge badge-secondary">${p.category}</span>` : '';
            
            card.innerHTML = `
              <div class="puzzle-card-header">
                <strong>${p.puzzleTitle || 'Untitled Puzzle'}</strong>
                ${categoryBadge}
              </div>
              <div class="puzzle-card-meta">
                <small class="text-muted">
                  <i class="fas fa-calendar"></i> Created: ${createdDate}
                  <i class="fas fa-link ml-2"></i> View Puzzle
                </small>
              </div>
            `;
            
            if (p.slug) {
              card.onclick = () => {
                window.open(p.slug, '_blank');
              };
            }
            puzzlesList.appendChild(card);
          });
        }
      }
    } catch (error) {
      console.error('Error in auth state change handler:', error);
    } finally {
      isProcessingAuth = false;
    }
  } else {
    showProfileInfo(false);
    isProcessingAuth = false;
  }
});

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = './index.html';
    } catch (error) {
      console.error('Error signing out:', error);
      showInfoModal('Error signing out. Please try again.');
    }
  });
}

const deleteProfileButton = document.getElementById('deleteProfileButton');
if (deleteProfileButton) {
  deleteProfileButton.addEventListener('click', async () => {
    showConfirmModal(
      'Are you sure you want to delete your profile? This action cannot be undone and will permanently delete all your data including decisions, answers, and comments.',
      () => {
        showConfirmModal(
          'This is your final warning. All your data will be permanently lost. Are you absolutely sure you want to delete your profile?',
          async () => {
            try {
              const user = auth.currentUser;
              if (!user) {
                showInfoModal('No user is currently logged in.');
                return;
              }
              
              const userEmail = user.email;
              
              const emailDoc = await getDoc(doc(db, 'emails', userEmail));
              let userID = null;
              
              if (emailDoc.exists()) {
                userID = emailDoc.data().userID;
                
                if (userID) {
                  await deleteDoc(doc(db, 'users', userID));
                  console.log('User data deleted from users collection');
                  
                  await deleteDoc(doc(db, 'userIDs', userID));
                  console.log('User data deleted from userIDs collection');
                }
                
                await deleteDoc(doc(db, 'emails', userEmail));
                console.log('User data deleted from emails collection');
              }
              
              await deleteUser(user);
              console.log('User deleted from Firebase Authentication');
              
              showInfoModal('Your profile has been successfully deleted.', () => {
                window.location.href = './index.html';
              });
              
            } catch (error) {
              console.error('Error deleting profile:', error);
              
              if (error.code === 'auth/requires-recent-login') {
                showInfoModal('For security reasons, you need to log in again before deleting your profile. Please log out, log back in, and try again.');
              } else {
                showInfoModal('Error deleting profile: ' + error.message + '. Please try again or contact support if the problem persists.');
              }
            }
          }
        );
      }
    );
  });
}

const changePasswordButton = document.getElementById('changePasswordButton');
if (changePasswordButton) {
  changePasswordButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
      showInfoModal('No user is currently logged in.');
      return;
    }
    
    const userEmail = user.email;
    
    showConfirmModal(
      `Are you sure you want to reset your password? A password reset email will be sent to ${userEmail}.`,
      async () => {
        try {
          await sendPasswordResetEmail(auth, userEmail);
          showInfoModal(`Password reset email has been sent to ${userEmail}. Please check your inbox and follow the instructions to reset your password.`);
        } catch (error) {
          console.error('Error sending password reset email:', error);
          
          if (error.code === 'auth/user-not-found') {
            showInfoModal('User not found. Please contact support.');
          } else if (error.code === 'auth/invalid-email') {
            showInfoModal('Invalid email address. Please contact support.');
          } else if (error.code === 'auth/too-many-requests') {
            showInfoModal('Too many requests. Please wait a few minutes before trying again.');
          } else {
            showInfoModal('Error sending password reset email: ' + error.message + '. Please try again or contact support.');
          }
        }
      }
    );
  });
}
