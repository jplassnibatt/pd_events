// The entire script is wrapped in this listener to prevent any race conditions.
document.addEventListener('DOMContentLoaded', () => {

    // === PART 1: Your Firebase Configuration ===
    const firebaseConfig = {
      apiKey: "AIzaSyALIDeLjFZFlECt1wEWboCHazV58p7BT9k",
      authDomain: "jp-test-355015.firebaseapp.com",
      projectId: "jp-test-355015",
      storageBucket: "jp-test-355015.firebasestorage.app",
      messagingSenderId: "87829320244",
      appId: "1:87829320244:web:2fdce0e2f48cb2c0283061"
    };

    // === PART 2: Firebase Initialization ===
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // === PART 3: Display Logic (Safe, Read-Only) ===
    const counterRef = db.collection('counters').doc('kraken_releases');
    const countDisplay = document.getElementById('kraken-count');

    // This listener's ONLY job is to read data and update the display.
    // It will NEVER write or create data, which prevents the reset-to-zero bug.
    counterRef.onSnapshot((doc) => {
        if (doc.exists) {
            // If the document exists, show its count.
            const currentCount = doc.data().count || 0;
            countDisplay.textContent = currentCount.toLocaleString();
        } else {
            // If the document has been deleted, just show '0' on the page.
            // DO NOT create a new document here.
            countDisplay.textContent = '0';
        }
    });

    // === PART 4: Action Logic (Smart Increment) ===
    window.incrementKrakenCount = async function() {
        console.log("Button clicked. Attempting to increment counter...");
        try {
            // A transaction is the safest way to read and then write a value.
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(counterRef);

                if (!doc.exists) {
                    transaction.set(counterRef, { count: 1 });
                } else {
                    const newCount = (doc.data().count || 0) + 1;
                    transaction.update(counterRef, { count: newCount });
                }
            });
            console.log("Counter successfully updated!");
        } catch (error) {
            console.error("Error updating counter: ", error);
        }
    }

});