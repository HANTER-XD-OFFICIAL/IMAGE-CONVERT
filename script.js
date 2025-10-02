const upload = document.getElementById("upload");
const resolution = document.getElementById("resolution");
const convertBtn = document.getElementById("convert");
const downloadBtn = document.getElementById("download");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const enhancedPreview = document.getElementById("enhancedPreview");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const historyContainer = document.getElementById("historyContainer");

let imgData = null;

// Upload
upload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      imgData = img;
      convertBtn.disabled = false;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// Enhance & Convert
convertBtn.addEventListener("click", async () => {
  if (!imgData) return alert("No image selected!");

  convertBtn.disabled = true;
  downloadBtn.disabled = true;

  let [targetWidth, targetHeight] = resolution.value.split("x").map(Number);
  const ratio = imgData.width / imgData.height;
  if (targetWidth / targetHeight > ratio) {
    targetWidth = targetHeight * ratio;
  } else {
    targetHeight = targetWidth / ratio;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(imgData, 0, 0, targetWidth, targetHeight);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(data[i] * 1.08, 255);
    data[i + 1] = Math.min(data[i + 1] * 1.08, 255);
    data[i + 2] = Math.min(data[i + 2] * 1.08, 255);
  }
  ctx.putImageData(imageData, 0, 0);

  ctx.filter = "contrast(1.1) brightness(1.05)";
  ctx.drawImage(canvas, 0, 0);

  let progress = 0;
  const interval = setInterval(() => {
    progress += 20;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      enhancedPreview.src = canvas.toDataURL("image/png");
      downloadBtn.disabled = false;
      convertBtn.disabled = false;
    }
    progressBar.style.width = progress + "%";
    progressText.textContent = progress + "%";
  }, 200);

  if (auth.currentUser) {
    const userId = auth.currentUser.uid;
    const imgBlob = await (await fetch(canvas.toDataURL("image/png"))).blob();
    const storageRef = storage.ref().child(`enhanced/${userId}_${Date.now()}.png`);
    await storageRef.put(imgBlob);
    const url = await storageRef.getDownloadURL();

    await db.collection('user_images').add({
      uid: userId,
      enhanced: url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    loadUserHistory();
  }
});

// Download
downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "RASEL_ENHANCED.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// History
async function loadUserHistory() {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const snapshot = await db.collection('user_images')
    .where('uid', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  historyContainer.innerHTML = '';
  snapshot.forEach(doc => {
    const d = doc.data();
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `<img src="${d.enhanced}" style="max-width:150px;border-radius:8px;"><p>${d.createdAt?.toDate().toLocaleString() || ''}</p>`;
    historyContainer.appendChild(div);
  });
}

// Auth Functions
async function signupEmail(){
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    document.getElementById("authStatus").textContent = "Signup successful ✅";
    loadUserHistory();
  } catch(err){ alert(err.message); }
}
async function loginEmail(){
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    document.getElementById("authStatus").textContent = "Login successful ✅";
    loadUserHistory();
  } catch(err){ alert(err.message); }
}
function loginGoogle(){
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
  .then(res=>{
    document.getElementById("authStatus").textContent = "Google login successful ✅";
    loadUserHistory();
  })
  .catch(err=>alert(err.message));
}

auth.onAuthStateChanged(user => { if (user) loadUserHistory(); });