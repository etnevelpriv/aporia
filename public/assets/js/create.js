import { db } from './firebase_init.js';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

let currentUser = null;
let tags = [];

const auth = getAuth();
onAuthStateChanged(auth, async (user) => {
    if (user) {
        let userID = null;
        try {
            const emailDoc = await getDoc(doc(db, 'emails', user.email));
            if (emailDoc.exists()) {
                userID = emailDoc.data().userID;
            }
        } catch (error) {
            console.error('Error fetching user ID:', error);
        }
        
        if (userID) {
            currentUser = { userID, email: user.email };
            localStorage.setItem('user', JSON.stringify({ userID, email: user.email }));
        } else {
            currentUser = null;
            localStorage.removeItem('user');
            redirectToLogin();
        }
    } else {
        currentUser = null;
        localStorage.removeItem('user');
        redirectToLogin();
    }
});

function getCurrentUser() {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.userID && userData.email) {
            return userData;
        }
    } catch (error) {
        console.error('Error getting current user:', error);
    }
    return null;
}

function redirectToLogin() {
    showToast('Please login to create puzzles.', 3000);
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 2000);
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

function showLoadingOverlay(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function handleCategoryChange() {
    const category = document.getElementById('puzzleCategory').value;
    const wouldYouRatherOptions = document.getElementById('wouldYouRatherOptions');
    const optionRed = document.getElementById('optionRed');
    const optionBlue = document.getElementById('optionBlue');
    
    if (category === 'wouldyourather') {
        wouldYouRatherOptions.style.display = 'block';
        optionRed.required = true;
        optionBlue.required = true;
    } else {
        wouldYouRatherOptions.style.display = 'none';
        optionRed.required = false;
        optionBlue.required = false;
        optionRed.value = '';
        optionBlue.value = '';
    }
}

function addTag(tagText) {
    const cleanedTag = tagText.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    if (!cleanedTag) {
        showToast('Please enter a valid tag with letters or numbers.');
        return false;
    }
    
    if (cleanedTag.length > 30) {
        showToast('Tags must be 30 characters or less.');
        return false;
    }
    
    if (tags.includes(cleanedTag)) {
        showToast('This tag has already been added.');
        return false;
    }
    
    if (tags.length >= 10) {
        showToast('Maximum 10 tags allowed.');
        return false;
    }
    
    tags.push(cleanedTag);
    renderTags();
    return true;
}

function removeTag(index) {
    tags.splice(index, 1);
    renderTags();
}

function renderTags() {
    const tagsDisplay = document.getElementById('tagsDisplay');
    tagsDisplay.innerHTML = '';
    
    tags.forEach((tag, index) => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-item';
        tagElement.innerHTML = `
            ${tag}
            <button type="button" class="tag-remove" onclick="removeTagByIndex(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        tagsDisplay.appendChild(tagElement);
    });
}

window.removeTagByIndex = function(index) {
    removeTag(index);
};

function handleTagInput(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const tagInput = event.target;
        const tagText = tagInput.value;
        
        if (addTag(tagText)) {
            tagInput.value = '';
        }
    }
}

function createSlug(puzzle) {
    const category = (puzzle.category || '').toLowerCase().replace(/\s+/g, '');
    const title = puzzle.puzzleTitle.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().split(' ').filter(Boolean).join('-');
    const tags = (puzzle.tags || []).map(tag => tag.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase()).join('-');
    let slug = `/puzzle/${category}/${title}`;
    if (tags) slug += `-${tags}`;
    return slug;
}

function generatePuzzleID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 4; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function validateForm() {
    const category = document.getElementById('puzzleCategory').value;
    const title = document.getElementById('puzzleTitle').value.trim();
    const text = document.getElementById('puzzleText').value.trim();
    const optionRed = document.getElementById('optionRed').value.trim();
    const optionBlue = document.getElementById('optionBlue').value.trim();
    
    if (!category) {
        showToast('Please select a category.');
        return false;
    }
    
    if (!title) {
        showToast('Please enter a puzzle title.');
        return false;
    }
    
    if (title.length < 5) {
        showToast('Puzzle title must be at least 5 characters long.');
        return false;
    }
    
    if (!text) {
        showToast('Please enter a puzzle description.');
        return false;
    }
    
    if (text.length < 20) {
        showToast('Puzzle description must be at least 20 characters long.');
        return false;
    }
    
    if (category === 'wouldyourather') {
        if (!optionRed || !optionBlue) {
            showToast('Please enter both options for "Would you rather" puzzles.');
            return false;
        }
        
        if (optionRed.length < 3 || optionBlue.length < 3) {
            showToast('Each option must be at least 3 characters long.');
            return false;
        }
    }
    
    if (tags.length < 2) {
        showToast('Please add at least 2 tags.');
        return false;
    }
    
    return true;
}

async function createPuzzleObject() {
    const category = document.getElementById('puzzleCategory').value;
    const title = document.getElementById('puzzleTitle').value.trim();
    const text = document.getElementById('puzzleText').value.trim();
    const optionRed = document.getElementById('optionRed').value.trim();
    const optionBlue = document.getElementById('optionBlue').value.trim();
    
    let puzzleID = '';
    let exists = true;
    while (exists) {
        puzzleID = generatePuzzleID();
        const docSnap = await getDoc(doc(db, 'puzzles', puzzleID));
        exists = docSnap.exists();
    }
    
    const createdAt = new Date().toISOString();
    
    const puzzleObj = {
        puzzleID: puzzleID,
        puzzleTitle: title,
        puzzleText: text,
        category: category,
        tags: [...tags],
        createdAt: createdAt,
        answers: [],
        reportCount: 0,
        reportedBy: []
    };
    
    if (category === 'wouldyourather') {
        puzzleObj.optionRed = optionRed;
        puzzleObj.optionBlue = optionBlue;
        puzzleObj.optionRedNumber = 0;
        puzzleObj.optionBlueNumber = 0;
    } else if (category === 'statement') {
        puzzleObj.agreedNumber = 0;
        puzzleObj.disagreedNumber = 0;
    }
    
    puzzleObj.slug = createSlug(puzzleObj);
    
    return puzzleObj;
}

async function savePuzzle(puzzleObj) {
    try {
        const puzzleRef = doc(db, 'puzzles', puzzleObj.puzzleID);
        await setDoc(puzzleRef, puzzleObj);
        
        const userRef = doc(db, 'users', currentUser.userID);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            await updateDoc(userRef, {
                myPuzzles: arrayUnion({
                    puzzleID: puzzleObj.puzzleID,
                    puzzleTitle: puzzleObj.puzzleTitle,
                    category: puzzleObj.category,
                    createdAt: puzzleObj.createdAt,
                    slug: puzzleObj.slug
                })
            });
        } else {
            await setDoc(userRef, {
                userID: currentUser.userID,
                email: currentUser.email,
                myPuzzles: [{
                    puzzleID: puzzleObj.puzzleID,
                    puzzleTitle: puzzleObj.puzzleTitle,
                    category: puzzleObj.category,
                    createdAt: puzzleObj.createdAt,
                    slug: puzzleObj.slug
                }],
                decisions: [],
                answers: []
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error saving puzzle:', error);
        showToast('Error creating puzzle. Please try again.');
        return false;
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!currentUser) {
        redirectToLogin();
        return;
    }
    
    if (!validateForm()) {
        return;
    }
    
    showLoadingOverlay(true);
      try {
        const puzzleObj = await createPuzzleObject();
        const success = await savePuzzle(puzzleObj);
        
        if (success) {
            showToast('Puzzle created successfully!', 3000);
            
            document.getElementById('createPuzzleForm').reset();
            tags = [];
            renderTags();
            handleCategoryChange();
            
            setTimeout(() => {
                window.location.href = puzzleObj.slug;
            }, 2000);
        }
    } catch (error) {
        console.error('Error in form submission:', error);
        showToast('An unexpected error occurred. Please try again.');
    } finally {
        showLoadingOverlay(false);
    }
}

function initializePage() {
    document.getElementById('puzzleCategory').addEventListener('change', handleCategoryChange);
    
    document.getElementById('tagInput').addEventListener('keypress', handleTagInput);
    
    document.getElementById('createPuzzleForm').addEventListener('submit', handleFormSubmit);
    
    const titleInput = document.getElementById('puzzleTitle');
    const textInput = document.getElementById('puzzleText');
    
    titleInput.addEventListener('input', () => {
        const remaining = 200 - titleInput.value.length;
        const helpText = titleInput.nextElementSibling;
        helpText.textContent = `${titleInput.value.length}/200 characters`;
        if (remaining < 20) {
            helpText.style.color = remaining < 0 ? '#dc3545' : '#ffc107';
        } else {
            helpText.style.color = '#6c757d';
        }
    });
    
    textInput.addEventListener('input', () => {
        const remaining = 2000 - textInput.value.length;
        const helpText = textInput.nextElementSibling;
        helpText.textContent = `${textInput.value.length}/2000 characters`;
        if (remaining < 100) {
            helpText.style.color = remaining < 0 ? '#dc3545' : '#ffc107';
        } else {
            helpText.style.color = '#6c757d';
        }
    });
    
    const optionRedInput = document.getElementById('optionRed');
    const optionBlueInput = document.getElementById('optionBlue');
    
    optionRedInput.addEventListener('input', () => {
        const remaining = 200 - optionRedInput.value.length;
        const helpText = optionRedInput.nextElementSibling;
        helpText.textContent = `${optionRedInput.value.length}/200 characters`;
        if (remaining < 20) {
            helpText.style.color = remaining < 0 ? '#dc3545' : '#ffc107';
        } else {
            helpText.style.color = '#6c757d';
        }
    });
    
    optionBlueInput.addEventListener('input', () => {
        const remaining = 200 - optionBlueInput.value.length;
        const helpText = optionBlueInput.nextElementSibling;
        helpText.textContent = `${optionBlueInput.value.length}/200 characters`;
        if (remaining < 20) {
            helpText.style.color = remaining < 0 ? '#dc3545' : '#ffc107';
        } else {
            helpText.style.color = '#6c757d';
        }
    });
    
    const existingUser = getCurrentUser();
    if (existingUser) {
        currentUser = existingUser;
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
