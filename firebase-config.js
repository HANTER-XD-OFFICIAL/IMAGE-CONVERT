// === firebase-config.js ===
// Replace these values if you want to use a different Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyDVEwu9dMrF4MVElT-1ZJFn5Taas7fe-Q8",
  authDomain: "coffee-spark-ai-barista-958e7.firebaseapp.com",
  projectId: "coffee-spark-ai-barista-958e7",
  storageBucket: "coffee-spark-ai-barista-958e7.appspot.com",
  messagingSenderId: "1011498496803",
  appId: "1:1011498496803:web:cc0dcaae81deba6cce9296"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();