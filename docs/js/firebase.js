// === PART 1: Your Firebase Configuration ===
const firebaseConfig = {
  apiKey: "AIzaSyALIDeLjFZFlECt1wEWboCHazV58p7BT9k",
  authDomain: "jp-test-355015.firebaseapp.com",
  projectId: "jp-test-355015",
  storageBucket: "jp-test-355015.firebasestorage.app",
  messagingSenderId: "87829320244",
  appId: "1:87829320244:web:2fdce0e2f48cb2c0283061"
};

// === PART 2: Firebase Initialization and Logic ===
//
// Initialize Firebase and Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const counterRef = db.collection('counters').doc('kraken_releases');

function setupKrakenCounterListener() {
    counterRef.onSnapshot((doc) => {
        try {
            if (doc.exists) {
                const currentCount = doc.data().count || 0;
                document.getElementById('kraken-count').textContent = currentCount.toLocaleString();
            } else {
                  console.log("Document not found, creating with count: 0");
                counterRef.set({ count: 0 });
                document.getElementById('kraken-count').textContent = '0';
            }
        } catch (error) {
            console.error('Error in counter listener:', error);
            document.getElementById('kraken-count').textContent = 'Error';
        }
    }, (error) => {
        console.error('Firestore listener failed:', error);
    });
}

// Increment counter - this is the function your button will call.
async function incrementKrakenCount() {
    try {
        const increment = firebase.firestore.FieldValue.increment(1);
        await counterRef.update({ count: increment });
    } catch (error) {
        console.error('Error incrementing count:', error);
    }
}

// Load count listener when the page's DOM is ready.
document.addEventListener('DOMContentLoaded', setupKrakenCounterListener);