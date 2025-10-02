// ====== DOM refs ======
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

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const googleBtn = document.getElementById("googleBtn");
const authStatus = document.getElementById("authStatus");

// contact form
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

// dynamic theme by time (simple)
(function setTimeTheme(){
  const h = new Date().getHours();
  let theme;
  if(h>=6 && h<12) theme = "linear-gradient(135deg,#ffd89b,#19547b)"; // morning
  else if(h>=12 && h<18) theme = "linear-gradient(135deg,#1e3c72,#2a5298)"; // day
  else if(h>=18 && h<21) theme = "linear-gradient(135deg,#ff512f,#dd2476)"; // evening
  else theme = "linear-gradient(135deg,#0f2027,#203a43,#2c5364)"; // night
  document.body.style.background = theme;
})();

// ====== APP LOGIC ======
let imgData = null;

// Upload: do NOT show before. only enable convert.
upload.addEventListener("change", e=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    const img = new Image();
    img.onload = ()=>{
      imgData = img;
      convertBtn.disabled = false;
      // Clear previous after-preview until conversion done:
      enhancedPreview.src = "";
      progressBar.style.width = "0%";
      progressText.textContent = "0%";
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// Enhancement algorithm (visible)
function truncate(v){ return Math.min(255, Math.max(0, v)); }

convertBtn.addEventListener("click", async ()=>{
  if(!imgData) return alert("Please upload an image first.");
  convertBtn.disabled = true;
  downloadBtn.disabled = true;

  // resolution choose; but maintain aspect ratio of uploaded image and do NOT downscale below original
  let [tW,tH] = resolution.value.split("x").map(Number);
  const origW = imgData.width, origH = imgData.height;
  const origRatio = origW / origH;
  // Fit to target while preserving ratio
  if(tW / tH > origRatio){
    tW = Math.round(tH * origRatio);
  } else {
    tH = Math.round(tW / origRatio);
  }

  // Prevent upscaling beyond selected but allow large outputs as user selected.
  canvas.width = tW;
  canvas.height = tH;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(imgData,0,0,tW,tH);

  // Get image data
  try {
    const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const data = imageData.data;
    // Brightness + mild contrast + sharpen-like effect placeholder
    // First pass: brightness/contrast
    const contrastFactor = (259 * (128 + 20)) / (255 * (259 - 20)); // small contrast boost
    for(let i=0;i<data.length;i+=4){
      data[i]   = truncate(contrastFactor * (data[i]*1.06 - 128) + 128);     // R
      data[i+1] = truncate(contrastFactor * (data[i+1]*1.06 - 128) + 128);   // G
      data[i+2] = truncate(contrastFactor * (data[i+2]*1.06 - 128) + 128);   // B
    }
    ctx.putImageData(imageData,0,0);

    // Mild smoothing: draw small transparent blur overlay (light)
    ctx.globalAlpha = 0.98;
    ctx.filter = "blur(0.25px) contrast(1.03) brightness(1.02)";
    ctx.drawImage(canvas,0,0);
    ctx.filter = "none";
    ctx.globalAlpha = 1.0;
  } catch(err){
    console.warn("Image processing failed:", err);
  }

  // Progress simulation
  let p = 0;
  const inter = setInterval(()=>{
    p += 20;
    if(p >= 100){ p = 100; clearInterval(inter); }
    progressBar.style.width = p + "%";
    progressText.textContent = p + "%";
    if(p === 100){
      // show AFTER only
      enhancedPreview.src = canvas.toDataURL("image/png");
      downloadBtn.disabled = false;
      convertBtn.disabled = false;
    }
  },200);

  // Save to Firebase only if logged-in
  if(auth.currentUser){
    try {
      const blob = await (await fetch(canvas.toDataURL("image/png"))).blob();
      const path = `enhanced/${auth.currentUser.uid}_${Date.now()}.png`;
      const storageRef = storage.ref().child(path);
      await storageRef.put(blob);
      const url = await storageRef.getDownloadURL();
      await db.collection("user_images").add({
        uid: auth.currentUser.uid,
        enhanced: url,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      loadUserHistory();
    } catch(e) {
      console.warn("Save to firebase failed:", e);
    }
  }
});

// Download button
downloadBtn.addEventListener("click", ()=>{
  if(!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "RASEL_ENHANCED.png";
  a.click();
});

// Load user history
async function loadUserHistory(){
  if(!auth.currentUser) return;
  historyContainer.innerHTML = "";
  try {
    const q = await db.collection("user_images")
      .where("uid","==",auth.currentUser.uid)
      .orderBy("createdAt","desc")
      .limit(50)
      .get();
    q.forEach(doc=>{
      const d = doc.data();
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `<img src="${d.enhanced}" alt="enhanced"/><div style="font-size:12px;color:rgba(255,255,255,0.8)">${d.createdAt ? d.createdAt.toDate().toLocaleString() : ""}</div>`;
      historyContainer.appendChild(div);
    });
  } catch(e){
    console.warn("Load history error:", e);
  }
}

// ===== Auth handlers =====
signupBtn.addEventListener("click", async ()=>{
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  if(!email || !pass) return authStatus.textContent = "Enter email & password";
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    authStatus.textContent = "Signup successful ✅";
  } catch(err){
    authStatus.textContent = err.message;
  }
});

loginBtn.addEventListener("click", async ()=>{
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  if(!email || !pass) return authStatus.textContent = "Enter email & password";
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    authStatus.textContent = "Login successful ✅";
    loadUserHistory();
  } catch(err){
    authStatus.textContent = err.message;
  }
});

googleBtn.addEventListener("click", async ()=>{
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    authStatus.textContent = "Google login successful ✅";
    loadUserHistory();
  } catch(err){
    authStatus.textContent = err.message;
  }
});

// Auth state listener
auth.onAuthStateChanged(user=>{
  if(user){
    authStatus.textContent = `Logged in: ${user.email}`;
    loadUserHistory();
  } else {
    authStatus.textContent = `Not logged in (use optional account to save history)`;
  }
});

// ===== Contact form (EmailJS) =====
if(contactForm){
  contactForm.addEventListener("submit", function(e){
    e.preventDefault();
    // REQUIRED: replace these with your EmailJS service/template ids
    const SERVICE_ID = "service_jcczpsg";
    const TEMPLATE_ID = "template_6hagzbs";

    const params = {
      from_name: document.getElementById("contact_name").value,
      from_email: document.getElementById("contact_email").value,
      message: document.getElementById("contact_message").value
    };

    if(!window.emailjs){ formStatus.textContent = "Email service not initialized."; return; }

    emailjs.send(SERVICE_ID, TEMPLATE_ID, params)
      .then(res=>{
        formStatus.textContent = "✅ Message sent — we'll contact you soon.";
        contactForm.reset();
      })
      .catch(err=>{
        formStatus.textContent = "❌ Send failed — try again later.";
        console.error("EmailJS error", err);
      });
  });
}