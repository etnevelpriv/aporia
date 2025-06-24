import { app, db } from './firebase_init.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    showProfileInfo(true);
    emailP.textContent = user.email;
    const emailDoc = await getDoc(doc(db, 'emails', user.email));
    let userID = '#UNKNOWN';
    let creationDate = '';
    let decisions = [], answers = [], comments = [];
    if (emailDoc.exists()) {
      userID = '#' + (emailDoc.data().userID || 'UNKNOWN');
      const userDoc = await getDoc(doc(db, 'users', emailDoc.data().userID));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const createdAt = userData.createdAt;        if (createdAt) {
          const date = new Date(createdAt);
          creationDate = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
        }
        decisions = userData.decisions || [];
        answers = userData.answers || [];
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
    creationDateP.textContent = creationDate || '-';

    document.getElementById('decisionsCount').textContent = decisions.length;
    document.getElementById('answerCount').textContent = answers.length;
    document.getElementById('commentCount').textContent = comments.length;

    const decisionsList = document.getElementById('userDecisionsList');
    const answersList = document.getElementById('userAnswersList');
    const commentsList = document.getElementById('userCommentsList');
    if (decisionsList) {
      decisionsList.innerHTML = '';
      decisions.forEach(d => {

        const card = document.createElement('div');
        card.className = 'profile-card list-group-item';
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
        card.className = 'profile-card list-group-item';
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
    }    if (commentsList) {
      commentsList.innerHTML = '';
      comments.forEach(c => {
        const card = document.createElement('div');
        card.className = 'profile-card list-group-item';
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
  } else {
    showProfileInfo(false);
  }
});
