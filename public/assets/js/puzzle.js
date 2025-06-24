import { db } from './firebase_init.js';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

function createSlug(puzzle) {
    const category = (puzzle.category || '').toLowerCase().replace(/\s+/g, '');
    const title = puzzle.puzzleTitle.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().split(' ').filter(Boolean).join('-');
    const tags = (puzzle.tags || []).map(tag => tag.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase()).join('-');
    let slug = `/puzzle/${category}/${title}`;
    if (tags) slug += `-${tags}`;
    return slug;
}

let puzzlesBySlug = {};

let currentUser = null;
let puzzleChart = null;

const auth = getAuth();
onAuthStateChanged(auth, async (user) => {
    if (user) {
        let userID = null;
        try {
            const emailDoc = await getDoc(doc(db, 'emails', user.email));
            if (emailDoc.exists()) {
                userID = emailDoc.data().userID;
            }
        } catch { }
        if (userID) {
            currentUser = { userID, email: user.email };
            localStorage.setItem('user', JSON.stringify({ userID, email: user.email }));
        } else {
            currentUser = null;
            localStorage.removeItem('user');
        }
    } else {
        currentUser = null;
        localStorage.removeItem('user');
    }
});

function getCurrentUser() {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.userID && userData.email) {
            return userData;
        }
    } catch { }
    return null;
}

function getpuzzleID(puzzle) {
    return puzzle.puzzleID || puzzle.id || puzzle.puzzleID || puzzle.slug || null;
}

function getUserDecision(user, puzzleID) {
    if (!user) return null;
    try {
        const userData = JSON.parse(localStorage.getItem('userDataCache_' + user.userID));
        if (userData && userData.decisions) {
            const decision = userData.decisions.find(d => d.puzzleID === puzzleID);
            return decision ? decision.decisionText : null;
        }
    } catch { }
    return null;
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
    toast.style.cursor = 'pointer';
    void toast.offsetWidth;

    const hideToast = () => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => {
            toast.style.display = 'none';
            toast.classList.remove('toast-fadeout');
        }, 300);
    };

    toast.onclick = hideToast;

    setTimeout(hideToast, duration);
}

function showConfirmModal(message, onConfirm) {
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
        btnYes.onclick = () => { document.body.removeChild(modal); onConfirm(); };
        const btnNo = document.createElement('button');
        btnNo.textContent = 'No';
        btnNo.className = 'modal-button reverse-button';
        btnNo.onclick = () => { document.body.removeChild(modal); };
        btns.appendChild(btnYes);
        btns.appendChild(btnNo);
        box.appendChild(title);
        box.appendChild(msg);
        box.appendChild(btns);
        modal.appendChild(box);
        document.body.appendChild(modal);
    }
}

function renderPuzzleChart(puzzle) {
    if (puzzleChart) {
        puzzleChart.destroy();
        puzzleChart = null;
    }

    const normalizedCategory = (puzzle.category || '').toLowerCase().replace(/\s+/g, '');

    if (normalizedCategory !== 'statement' && normalizedCategory !== 'wouldyourather') {
        return null;
    }

    const chartContainer = document.createElement('div');
    chartContainer.className = 'puzzle-chart-container';

    let chartData = {};
    let chartColors = [];

    if (normalizedCategory === 'statement') {
        const agreedCount = puzzle.agreedNumber || 0;
        const disagreedCount = puzzle.disagreedNumber || 0;
        const total = agreedCount + disagreedCount;

        chartData = {
            labels: ['I Agree', 'I Disagree'],
            datasets: [{
                data: [agreedCount, disagreedCount],
                backgroundColor: ['#456565', '#2BCBCB'],
                borderColor: ['#456565', '#2BCBCB'],
            }]
        };
        chartColors = ['#456565', '#2BCBCB'];
    } else if (normalizedCategory === 'wouldyourather') {
        const redCount = puzzle.optionRedNumber;
        const blueCount = puzzle.optionBlueNumber;

        const redLabel = puzzle.optionRed;
        const blueLabel = puzzle.optionBlue;

        chartData = {
            labels: [redLabel, blueLabel],
            datasets: [{
                data: [redCount, blueCount],
                backgroundColor: ['#456565', '#2BCBCB'],
                borderColor: ['#456565', '#2BCBCB'],
            }]
        };
        chartColors = ['#456565', '#2BCBCB'];
    }

    chartContainer.innerHTML = `
        <canvas class="puzzle-chart-canvas" id="puzzleChart"></canvas>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('puzzleChart');
        if (ctx) {
            puzzleChart = new Chart(ctx, {
                type: 'doughnut',
                data: chartData, options: {
                    maintainAspectRatio: true,
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    },

                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#D2DCDC',
                                font: {
                                    family: 'Lora',
                                    size: 14
                                },
                                padding: 20,
                                usePointStyle: false,
                                boxWidth: 12,
                                boxHeight: 12
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1B1E23',
                            titleColor: '#2BCBCB',
                            bodyColor: '#D2DCDC',
                            borderColor: '#2BCBCB',
                            borderWidth: 2,
                            displayColors: false,
                            callbacks: {
                                title: function (context) {
                                    const total = context[0].dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context[0].parsed / total) * 100).toFixed(1);
                                    return `${context[0].label}: ${context[0].parsed} (${percentage}%)`;
                                },
                                label: function (context) {
                                    return '';
                                }
                            }
                        }
                    },

                }
            });
        }
    }, 100);

    return chartContainer;
}

async function renderAnswersAndComments(puzzle) {
    const container = document.createElement('div');
    container.className = 'answers-comments-container';
    const user = getCurrentUser();
    if (Array.isArray(puzzle.answers) && puzzle.answers.length > 0) {
        const answersDiv = document.createElement('div');
        answersDiv.innerHTML = '<h3>Answers</h3>';
        puzzle.answers.forEach(answer => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-item';
            answerDiv.innerHTML = `
                <div class="answer-header">
                    <span class="answer-userid">${answer.userID || ''}</span>
                    <b class="answer-text">${answer.answerText}</b>
                </div>
                <span>Likes: <span class="answer-likes">${answer.likes || 0}</span></span>
            `;
            if (user) {
                const actionRow = document.createElement('div');
                actionRow.className = 'answer-action-row';
                const likedBy = answer.likedBy || [];
                const hasLiked = likedBy.includes(user.userID);
                const likeBtn = document.createElement('button');
                likeBtn.className = 'like-btn';
                likeBtn.innerHTML = hasLiked ? '<i class="fa-solid fa-thumbs-down"></i>' : '<i class="fa-solid fa-thumbs-up"></i>';
                likeBtn.onclick = async () => {
                    const puzzleRef = doc(db, 'puzzles', puzzle.puzzleID);
                    const puzzleSnap = await getDoc(puzzleRef);
                    let answersArr = puzzleSnap.data().answers || [];
                    answersArr = answersArr.map(a => {
                        if (a.answerID === answer.answerID) {
                            let likedByArr = a.likedBy || [];
                            if (hasLiked) {
                                a.likes = Math.max((a.likes || 1) - 1, 0);
                                likedByArr = likedByArr.filter(uid => uid !== user.userID);
                            } else {
                                a.likes = (a.likes || 0) + 1;
                                likedByArr.push(user.userID);
                            }
                            a.likedBy = likedByArr;
                        }
                        return a;
                    });
                    await updateDoc(puzzleRef, { answers: answersArr });
                    showToast(hasLiked ? 'You disliked this answer.' : 'You liked this answer.');
                    setTimeout(() => window.location.reload(), 1200);
                };
                actionRow.appendChild(likeBtn);

                if (answer.userID !== user.userID) {
                    const reportedBy = answer.reportedBy || [];
                    const hasReported = reportedBy.includes(user.userID);
                    if (!hasReported) {
                        const reportBtn = document.createElement('button');
                        reportBtn.className = 'like-btn';
                        reportBtn.title = 'Report';
                        reportBtn.innerHTML = '<i class="fa-solid fa-flag"></i>';
                        reportBtn.onclick = () => {
                            showConfirmModal('Are you sure you want to report this answer?', async () => {
                                await reportAnswer(user.userID, puzzle.puzzleID, answer);
                                showToast('Answer reported.');
                                setTimeout(() => window.location.reload(), 1200);
                            });
                        };
                        actionRow.appendChild(reportBtn);
                    }
                }

                if (answer.userID === user.userID) {
                    const delBtn = document.createElement('button');
                    delBtn.title = 'Delete';
                    delBtn.className = 'answer-delete-btn';
                    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    delBtn.onclick = () => {
                        showConfirmModal('Are you sure you want to delete this answer?', async () => {
                            await deleteAnswer(user.userID, puzzle.puzzleID, answer);
                            showToast('Answer deleted.');
                            setTimeout(() => window.location.reload(), 1200);
                        });
                    };
                    actionRow.appendChild(delBtn);
                }

                answerDiv.appendChild(actionRow);
            }
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-comments-btn';
            toggleBtn.innerHTML = ' Show Comments';
            toggleBtn.style.margin = '8px 0 0 0';
            let commentsVisible = false;
            let commentsDiv = null;
            let commentInput = null;
            let commentBtn = null;
            toggleBtn.onclick = () => {
                commentsVisible = !commentsVisible;
                if (commentsVisible) {
                    toggleBtn.innerHTML = 'Hide Comments';
                    if (!commentsDiv) {
                        commentsDiv = document.createElement('div');
                        commentsDiv.className = 'comments-list';
                        if (Array.isArray(answer.comments)) {
                            answer.comments.forEach(comment => {
                                const commentDiv = document.createElement('div');
                                commentDiv.className = 'comment-item';
                                commentDiv.innerHTML = `
                                    <span class="comment-userid">${comment.userID || ''}</span>
                                    <span class="comment-text">${comment.commentText}</span>
                                    <span>Likes: <span class="comment-likes">${comment.likes || 0}</span></span>
                                `;
                                if (user) {
                                    const commentActionRow = document.createElement('div');
                                    commentActionRow.className = 'comment-action-row';
                                    const likedBy = comment.likedBy || [];
                                    const hasLiked = likedBy.includes(user.userID);
                                    const likeCommentBtn = document.createElement('button');
                                    likeCommentBtn.className = 'like-btn';
                                    likeCommentBtn.innerHTML = hasLiked ? '<i class="fa-solid fa-thumbs-down"></i>' : '<i class="fa-solid fa-thumbs-up"></i>';
                                    likeCommentBtn.onclick = async () => {
                                        const puzzleRef = doc(db, 'puzzles', puzzle.puzzleID);
                                        const puzzleSnap = await getDoc(puzzleRef);
                                        let answersArr = puzzleSnap.data().answers || [];
                                        answersArr = answersArr.map(a => {
                                            if (a.answerID === answer.answerID) {
                                                a.comments = (a.comments || []).map(c => {
                                                    if (c.commentID === comment.commentID) {
                                                        let likedByArr = c.likedBy || [];
                                                        if (hasLiked) {
                                                            c.likes = Math.max((c.likes || 1) - 1, 0);
                                                            likedByArr = likedByArr.filter(uid => uid !== user.userID);
                                                        } else {
                                                            c.likes = (c.likes || 0) + 1;
                                                            likedByArr.push(user.userID);
                                                        }
                                                        c.likedBy = likedByArr;
                                                    }
                                                    return c;
                                                });
                                            }
                                            return a;
                                        });
                                        await updateDoc(puzzleRef, { answers: answersArr });
                                        showToast(hasLiked ? 'You disliked this comment.' : 'You liked this comment.');
                                        setTimeout(() => window.location.reload(), 1200);
                                    };
                                    commentActionRow.appendChild(likeCommentBtn);

                                    if (comment.userID !== user.userID) {
                                        const reportedBy = comment.reportedBy || [];
                                        const hasReported = reportedBy.includes(user.userID);
                                        if (!hasReported) {
                                            const reportCommentBtn = document.createElement('button');
                                            reportCommentBtn.className = 'like-btn';
                                            reportCommentBtn.title = 'Report';
                                            reportCommentBtn.innerHTML = '<i class="fa-solid fa-flag"></i>';
                                            reportCommentBtn.onclick = () => {
                                                showConfirmModal('Are you sure you want to report this comment?', async () => {
                                                    await reportComment(user.userID, puzzle.puzzleID, answer, comment);
                                                    showToast('Comment reported.');
                                                    setTimeout(() => window.location.reload(), 1200);
                                                });
                                            };
                                            commentActionRow.appendChild(reportCommentBtn);
                                        }
                                    }

                                    if (comment.userID === user.userID) {
                                        const delBtn = document.createElement('button');
                                        delBtn.title = 'Delete';
                                        delBtn.className = 'comment-delete-btn';
                                        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                                        delBtn.onclick = () => {
                                            showConfirmModal('Are you sure you want to delete this comment?', async () => {
                                                await deleteComment(user.userID, puzzle.puzzleID, answer, comment);
                                                showToast('Comment deleted.');
                                                setTimeout(() => window.location.reload(), 1200);
                                            });
                                        };
                                        commentActionRow.appendChild(delBtn);
                                    }
                                    commentDiv.appendChild(commentActionRow);
                                }
                                commentsDiv.appendChild(commentDiv);
                            });
                        }
                        if (user) {
                            const addCommentBox = document.createElement('div');
                            addCommentBox.className = 'add-comment-box';
                            addCommentBox.style.display = 'flex';
                            addCommentBox.style.flexDirection = 'column';
                            addCommentBox.style.gap = '8px';
                            commentInput = document.createElement('input');
                            commentInput.type = 'text';
                            commentInput.placeholder = 'Add a comment...';
                            commentInput.className = 'comment-input';
                            commentBtn = document.createElement('button');
                            commentBtn.className = 'comment-btn';
                            commentBtn.textContent = 'Submit Comment';
                            commentBtn.onclick = async () => {
                                const text = commentInput.value.trim();
                                if (!text) return showToast('Please enter a comment.');
                                await saveComment(user.userID, puzzle.puzzleID, answer, text);
                                showToast('Comment submitted!');
                                setTimeout(() => window.location.reload(), 1200);
                            };
                            addCommentBox.appendChild(commentInput);
                            addCommentBox.appendChild(commentBtn);
                            commentsDiv.appendChild(addCommentBox);
                        }
                        answerDiv.appendChild(commentsDiv);
                    } else {
                        commentsDiv.style.display = 'block';
                    }
                } else {
                    toggleBtn.innerHTML = 'Show Comments';
                    if (commentsDiv) commentsDiv.style.display = 'none';
                }
            };
            answerDiv.appendChild(toggleBtn);
            answersDiv.appendChild(answerDiv);
        });
        container.appendChild(answersDiv);
    }
    return container;
}

async function saveComment(userID, puzzleID, answerObj, commentText) {
    const commentObj = {
        commentID: 'comment' + Date.now(),
        likes: 0,
        puzzleID: puzzleID,
        commentText,
        reportCount: 0,
        reportedBy: [],
        userID: userID
    };
    const userRef = doc(db, 'users', userID);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    let userAnswers = userData.answers || [];
    userAnswers = userAnswers.map(ans => {
        if (ans.answerID === answerObj.answerID) {
            ans.comments = ans.comments || [];
            ans.comments.push(commentObj);
        }
        return ans;
    });
    await updateDoc(userRef, { answers: userAnswers });
    const puzzleRef = doc(db, 'puzzles', puzzleID);
    const puzzleSnap = await getDoc(puzzleRef);
    const puzzleData = puzzleSnap.data();
    let puzzleAnswers = puzzleData.answers || [];
    puzzleAnswers = puzzleAnswers.map(ans => {
        if (ans.answerID === answerObj.answerID) {
            ans.comments = ans.comments || [];
            ans.comments.push(commentObj);
        }
        return ans;
    });
    await updateDoc(puzzleRef, { answers: puzzleAnswers });
}

async function deleteComment(userID, puzzleID, answerObj, commentObj) {
    const userRef = doc(db, 'users', userID);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    let userAnswers = userData.answers || [];
    userAnswers = userAnswers.map(ans => {
        if (ans.answerID === answerObj.answerID) {
            ans.comments = (ans.comments || []).filter(c => c.commentID !== commentObj.commentID);
        }
        return ans;
    });
    await updateDoc(userRef, { answers: userAnswers });
    const puzzleRef = doc(db, 'puzzles', puzzleID);
    const puzzleSnap = await getDoc(puzzleRef);
    const puzzleData = puzzleSnap.data();
    let puzzleAnswers = puzzleData.answers || [];
    puzzleAnswers = puzzleAnswers.map(ans => {
        if (ans.answerID === answerObj.answerID) {
            ans.comments = (ans.comments || []).filter(c => c.commentID !== commentObj.commentID);
        }
        return ans;
    });
    await updateDoc(puzzleRef, { answers: puzzleAnswers });
}

async function renderPuzzle(puzzle) {
    const container = document.body;

    if (puzzleChart) {
        puzzleChart.destroy();
        puzzleChart = null;
    }

    Array.from(document.querySelectorAll('.puzzle-container, .answers-comments-container, .puzzle-chart-container')).forEach(e => e.remove());

    const puzzleDiv = document.createElement('div');
    puzzleDiv.className = `puzzle-container ${puzzle.category}`;

    puzzleDiv.innerHTML = `
        <h2 class="puzzle-title">${puzzle.puzzleTitle}</h2>
        <p class="puzzle-text">${puzzle.puzzleText}</p>
        <div class="puzzle-catdate">
            <strong>${puzzle.createdAt ? puzzle.createdAt.split('T')[0] : ''}</strong>
        </div>
    `;

    const normalizedCategory = (puzzle.category || '').toLowerCase().replace(/\s+/g, '');

    container.appendChild(puzzleDiv); const user = getCurrentUser();
    const puzzleID = getpuzzleID(puzzle);
    let userHasDecided = false;
    let userHasAnswered = false;
    let userDecision = null;

    if (user) {
        try {
            const userRef = doc(db, 'users', user.userID);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                userHasDecided = (userData.decisions || []).some(d => d.puzzleID === puzzleID);
                userHasAnswered = (userData.answers || []).some(a => a.puzzleID === puzzleID);

                if (userHasDecided) {
                    const decision = (userData.decisions || []).find(d => d.puzzleID === puzzleID);
                    userDecision = decision ? decision.decisionText : null;
                }
            }
        } catch (error) {
            console.error('Error checking user decisions:', error);
        }
    }

    if (normalizedCategory === 'statement') {
        puzzleDiv.innerHTML += `
            <p class="statement-question">Do you agree with the statement above?</p>
            <div class="puzzle-options">
                <button class="option-button agree-button" id="puzzleAgreeButton">I agree.</button>
                <button class="option-button agree-button" id="puzzleDisagreeButton">I disagree.</button>
            </div>
        `;
    } else if (normalizedCategory === 'wouldyourather') {
        puzzleDiv.innerHTML += `
            <div class="puzzle-wouldyourather-question">
                <p>Would you rather</p>
                <div class="puzzle-options">
                    <button class="option-button" id="optionRed">${puzzle.optionRed || 'Option Red'}</button>
                    <span>OR</span>
                    <button class="option-button" id="optionBlue">${puzzle.optionBlue || 'Option Blue'}</button>
                </div>
            </div>
        `;
    }

    puzzleDiv.innerHTML += `
        <div class="answer-input">
            <label for="puzzleAnswerInput">Your opinion:</label>
            <textarea id="puzzleAnswerInput" placeholder="You can type your thoughts here." rows="4" class="form-control"></textarea>
        </div>
        <button id="puzzleAnswerSubmit">Submit</button>    `; container.appendChild(puzzleDiv);

    if (userHasDecided) {
        const decisionDiv = document.createElement('div');
        decisionDiv.className = 'user-decision-display';
        decisionDiv.innerHTML = `
            <h3>Your Decision:</h3>
            <p class="user-decision-text">${userDecision}</p>
        `;
        container.appendChild(decisionDiv);

        const chartDiv = renderPuzzleChart(puzzle);
        if (chartDiv) {
            container.appendChild(chartDiv);
        }
    }

    if (Array.isArray(puzzle.answers) && puzzle.answers.length > 0) {
        const answersDiv = await renderAnswersAndComments(puzzle);
        container.appendChild(answersDiv);
    }


    if (document.getElementById('puzzleAgreeButton')) {
        document.getElementById('puzzleAgreeButton').onclick = async () => {
            if (!user) return showToast('Login required!');
            const ok = await saveDecision(user.userID, puzzleID, puzzle.puzzleTitle, 'agree');
            if (ok) {
                const puzzleRef = doc(db, 'puzzles', puzzleID);
                await updateDoc(puzzleRef, { agreedNumber: (puzzle.agreedNumber || 0) + 1 });
                showToast('Decision submitted!');
                setTimeout(() => window.location.reload(), 1200);
            }
        };
    }
    if (document.getElementById('puzzleDisagreeButton')) {
        document.getElementById('puzzleDisagreeButton').onclick = async () => {
            if (!user) return showToast('Login required!');
            const ok = await saveDecision(user.userID, puzzleID, puzzle.puzzleTitle, 'disagree');
            if (ok) {
                const puzzleRef = doc(db, 'puzzles', puzzleID);
                await updateDoc(puzzleRef, { disagreedNumber: (puzzle.disagreedNumber || 0) + 1 });
                showToast('Decision submitted!');
                setTimeout(() => window.location.reload(), 1200);
            }
        };
    }
    if (document.getElementById('optionRed')) {
        document.getElementById('optionRed').onclick = async () => {
            if (!user) return showToast('Login required!');
            const decisionText = document.getElementById('optionRed').textContent;
            const ok = await saveDecision(user.userID, puzzleID, puzzle.puzzleTitle, decisionText);
            if (ok) {
                const puzzleRef = doc(db, 'puzzles', puzzleID);
                await updateDoc(puzzleRef, { optionRedNumber: (puzzle.optionRedNumber || 0) + 1 });
                showToast('Decision submitted!');
                setTimeout(() => window.location.reload(), 1200);
            }
        };
    }
    if (document.getElementById('optionBlue')) {
        document.getElementById('optionBlue').onclick = async () => {
            if (!user) return showToast('Login required!');
            const decisionText = document.getElementById('optionBlue').textContent;
            const ok = await saveDecision(user.userID, puzzleID, puzzle.puzzleTitle, decisionText);
            if (ok) {
                const puzzleRef = doc(db, 'puzzles', puzzleID);
                await updateDoc(puzzleRef, { optionBlueNumber: (puzzle.optionBlueNumber || 0) + 1 });
                showToast('Decision submitted!');
                setTimeout(() => window.location.reload(), 1200);
            }
        };
    }
    if (document.getElementById('puzzleAnswerSubmit')) {
        document.getElementById('puzzleAnswerSubmit').onclick = async () => {
            if (!user) return showToast('Login required!');
            const answerText = document.getElementById('puzzleAnswerInput').value.trim();
            if (!answerText) return showToast('Please enter your answer.');
            await saveAnswer(user.userID, puzzleID, answerText);
            showToast('Answer submitted!');
            setTimeout(() => window.location.reload(), 1200);
        };
    }
}

function handleRouting() {
    const path = window.location.pathname;
    const puzzle = puzzlesBySlug[path];
    if (puzzle) {
        renderPuzzle(puzzle);
    } else {
        document.body.innerHTML = '<h2>Puzzle not found.</h2>';
    }
}

export async function saveDecision(userID, puzzleID, puzzleTitle, decisionText) {
    const userRef = doc(db, 'users', userID);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    if (!userData) {
        showToast('User profile not found. Please contact support or re-register.');
        return false;
    }
    const alreadyDecided = (userData.decisions || []).some(d => d.puzzleID === puzzleID);
    if (alreadyDecided) {
        showToast('You have already made a choice for this puzzle.');
        return false;
    }
    const puzzleURL = window.location.origin + window.location.pathname;
    await updateDoc(userRef, {
        decisions: arrayUnion({
            decisionID: 'decision' + Date.now(),
            decisionText,
            puzzleID: puzzleID,
            puzzleTitle,
            puzzleURL
        })
    });
    return true;
}

export async function saveAnswer(userID, puzzleID, answerText) {
    const userRef = doc(db, 'users', userID);
    const puzzleRef = doc(db, 'puzzles', puzzleID);
    let puzzleTitle = '';
    let puzzleURL = '';
    try {
        const puzzleSnap = await getDoc(puzzleRef);
        if (puzzleSnap.exists()) {
            puzzleTitle = puzzleSnap.data().puzzleTitle || '';
            const puzzleData = puzzleSnap.data();
            const category = (puzzleData.category || '').toLowerCase().replace(/\s+/g, '');
            const title = (puzzleData.puzzleTitle || '').replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().split(' ').filter(Boolean).join('-');
            const tags = (puzzleData.tags || []).map(tag => tag.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase()).join('-');
            let slug = `/puzzle/${category}/${title}`;
            if (tags) slug += `-${tags}`;
            puzzleURL = window.location.origin + slug;
        }
    } catch { }
    const answerObj = {
        answerID: 'answer' + Date.now(),
        likes: 0,
        puzzleID: puzzleID,
        puzzleTitle: puzzleTitle,
        puzzleURL: puzzleURL,
        answerText,
        reportCount: 0,
        reportedBy: [],
        userID: userID,
        comments: []
    };
    await updateDoc(userRef, {
        answers: arrayUnion(answerObj)
    });
    await updateDoc(puzzleRef, {
        answers: arrayUnion(answerObj)
    });
}

export async function deleteAnswer(userID, puzzleID, answerObj) {
    const userRef = doc(db, 'users', userID);
    const puzzleRef = doc(db, 'puzzles', puzzleID);
    await updateDoc(userRef, {
        answers: arrayRemove(answerObj)
    });
    await updateDoc(puzzleRef, {
        answers: arrayRemove(answerObj)
    });
}

async function init() {
    const querySnapshot = await getDocs(collection(db, 'puzzles'));
    querySnapshot.forEach(docSnap => {
        const puzzle = docSnap.data();
        puzzle.puzzleID = docSnap.id;
        const slug = createSlug(puzzle);
        puzzlesBySlug[slug] = puzzle;
    });

    window.addEventListener('popstate', handleRouting);

    if (window.location.pathname === '/puzzle' || window.location.pathname === '/puzzle/') {
        const listDiv = document.createElement('div');
        listDiv.innerHTML = '<h2>All Puzzles</h2>';
        Object.entries(puzzlesBySlug).forEach(([slug, puzzle]) => {
            const a = document.createElement('a');
            a.href = slug;
            a.textContent = `${puzzle.puzzleTitle} (${puzzle.category})`;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', slug);
                handleRouting();
            });
            listDiv.appendChild(a);
            listDiv.appendChild(document.createElement('br'));
        });
        document.body.appendChild(listDiv);
    } else {
        handleRouting();
    }
}

init();

async function reportAnswer(userID, puzzleID, answerObj) {
    const puzzleRef = doc(db, 'puzzles', puzzleID);
    const puzzleSnap = await getDoc(puzzleRef);
    let answersArr = puzzleSnap.data().answers || [];

    answersArr = answersArr.map(a => {
        if (a.answerID === answerObj.answerID) {
            let reportedByArr = a.reportedBy || [];
            if (!reportedByArr.includes(userID)) {
                a.reportCount = (a.reportCount || 0) + 1;
                reportedByArr.push(userID);
                a.reportedBy = reportedByArr;
            }
        }
        return a;
    });

    await updateDoc(puzzleRef, { answers: answersArr });
}

async function reportComment(userID, puzzleID, answerObj, commentObj) {
    const puzzleRef = doc(db, 'puzzles', puzzleID);
    const puzzleSnap = await getDoc(puzzleRef);
    let answersArr = puzzleSnap.data().answers || [];

    answersArr = answersArr.map(a => {
        if (a.answerID === answerObj.answerID) {
            a.comments = (a.comments || []).map(c => {
                if (c.commentID === commentObj.commentID) {
                    let reportedByArr = c.reportedBy || [];
                    if (!reportedByArr.includes(userID)) {
                        c.reportCount = (c.reportCount || 0) + 1;
                        reportedByArr.push(userID);
                        c.reportedBy = reportedByArr;
                    }
                }
                return c;
            });
        }
        return a;
    });

    await updateDoc(puzzleRef, { answers: answersArr });

    const userRef = doc(db, 'users', userID);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    let userAnswers = userData.answers || [];

    userAnswers = userAnswers.map(ans => {
        if (ans.answerID === answerObj.answerID) {
            ans.comments = (ans.comments || []).map(c => {
                if (c.commentID === commentObj.commentID) {
                    let reportedByArr = c.reportedBy || [];
                    if (!reportedByArr.includes(userID)) {
                        c.reportCount = (c.reportCount || 0) + 1;
                        reportedByArr.push(userID);
                        c.reportedBy = reportedByArr;
                    }
                }
                return c;
            });
        }
        return ans;
    });

    await updateDoc(userRef, { answers: userAnswers });
}