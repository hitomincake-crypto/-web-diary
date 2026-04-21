import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, doc,
  setDoc, getDoc, getDocs, updateDoc,
  query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { firebaseConfig } from "./firebaseConfig.js";
import { githubConfig } from "./githubConfig.js";

initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();

// =============================
// GitHub 最終更新取得（変更なし）
// =============================
async function setDeployInfoFromGitHub() {
  const el = document.getElementById("deployInfo");
  if (!el) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/commits`);
    const data = await res.json();

    if (!data || !data[0]) {
      el.textContent = "最終更新: 取得失敗";
      return;
    }

    const iso = data[0].commit.committer.date;
    const d = new Date(iso);

    const formatted =
      d.getFullYear() + "-" +
      String(d.getMonth()+1).padStart(2,"0") + "-" +
      String(d.getDate()).padStart(2,"0") + " " +
      String(d.getHours()).padStart(2,"0") + ":" +
      String(d.getMinutes()).padStart(2,"0") + ":" +
      String(d.getSeconds()).padStart(2,"0");

    el.textContent = "最終更新: " + formatted;

  } catch (e) {
    el.textContent = "最終更新: 取得エラー";
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", setDeployInfoFromGitHub);

// =============================
// 状態
// =============================
let selectedDateStr = "";
let nickname = "";
let editingId = null;
let currentDate = new Date();

const monthCache = {};

// =============================
// ユーティリティ
// =============================
function toDate(createdAt) {
  if (!createdAt) return null;
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  const d = new Date(createdAt);
  if (isNaN(d)) return null;
  return d;
}

function toDateKey(createdAt) {
  const d = toDate(createdAt);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatTime(createdAt) {
  const d = toDate(createdAt);
  if (!d) return "";
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// =============================
// ログイン
// =============================
window.login = async () => {
  await signInWithEmailAndPassword(auth, email.value, password.value);
};

onAuthStateChanged(auth, async user => {
  if (!user) return;

  loginArea.style.display = "none";

  const userDoc = await getDoc(doc(db,"users",user.uid));

  if (!userDoc.exists()) {
    nicknameArea.style.display = "block";
  } else {
    nickname = userDoc.data().nickname;
    app.style.display = "block";
    renderCalendar();
  }
});

window.saveNickname = async () => {
  const user = auth.currentUser;

  await setDoc(doc(db,"users",user.uid),{
    nickname: nicknameInput.value
  });

  nickname = nicknameInput.value;

  nicknameArea.style.display="none";
  app.style.display="block";

  renderCalendar();
};

// =============================
// カレンダー（変更なし）
// =============================
async function renderCalendar(){
  const calendar = document.getElementById("calendar");
  calendar.innerHTML="";

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();

  const key = `${y}-${String(m+1).padStart(2,"0")}`;

  monthLabel.textContent = `${y}年 ${m+1}月`;

  let snap;

  if (monthCache[key]) {
    snap = monthCache[key];
  } else {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);

    const q = query(
      collection(db,"diaries"),
      where("createdAt", ">=", start),
      where("createdAt", "<", end)
    );

    snap = await getDocs(q);
    monthCache[key] = snap;
  }

  const map = {};

  snap.forEach(d=>{
    const data = d.data();
    if (data.isDeleted) return;

    const dateKey = toDateKey(data.createdAt);
    if (!dateKey) return;

    map[dateKey] = true;
  });

  const first = new Date(y,m,1).getDay();
  const last = new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++){
    calendar.appendChild(document.createElement("div"));
  }

  for(let d=1; d<=last; d++){
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    const cell = document.createElement("div");
    cell.className = "day";

    if (map[ds]) cell.classList.add("has-post");

    const todayKey = toDateKey(new Date());
    if (ds === todayKey) {
      cell.style.border = "2px solid black";
    }

    cell.textContent = d;
    cell.onclick = ()=>openDay(ds);

    calendar.appendChild(cell);
  }
}

// =============================
// 日表示（ここだけ変更）
// =============================
window.openDay = async (dateStr)=>{
  selectedDateStr = dateStr;

  showView("dayView");

  selectedDate.textContent = dateStr;
  dailyList.innerHTML = "";

  const start = new Date(dateStr + "T00:00:00");
  const end   = new Date(dateStr + "T23:59:59.999");

  const q = query(
    collection(db,"diaries"),
    where("createdAt", ">=", start),
    where("createdAt", "<=", end)
  );

  const snap = await getDocs(q);

  snap.forEach(d=>{
    const data = d.data();
    if (data.isDeleted) return;

    const div = document.createElement("div");
    div.className = "diary-card";

    const nick = data.nickname || "";
    const time = formatTime(data.createdAt);
    const titleText = data.title || "(無題)";

    div.innerHTML = `
      <div class="nickname">${nick}　${time}</div>
      <h4>${titleText}</h4>
      <div class="actions">
        <button onclick="viewDiary('${d.id}')">閲覧</button>
        <button onclick="editDiary('${d.id}')">編集</button>
        <button onclick="deleteDiary('${d.id}')">削除</button>
      </div>
    `;

    dailyList.appendChild(div);
  });
};

// =============================
// 閲覧（追加）
// =============================
window.viewDiary = async (id) => {
  const snap = await getDoc(doc(db, "diaries", id));
  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("viewTitle").textContent =
    data.title || "(無題)";

  document.getElementById("viewMeta").textContent =
    (data.nickname || "") + " " + formatTime(data.createdAt);

  document.getElementById("viewContent").textContent =
    data.content || "";

  showView("viewDiaryView");
};

// =============================
// 以下は変更なし
// =============================
window.editDiary = async (id)=>{
  editingId = id;

  const snap = await getDoc(doc(db,"diaries",id));
  if (snap.exists()){
    const data = snap.data();
    title.value = data.title;
    content.value = data.content;
  }

  showView("editorView");
};

window.saveDiary = async ()=>{
  const date = new Date();

  const data = {
    userId: auth.currentUser.uid,
    nickname: nickname,
    title: title.value,
    content: content.value,
    createdAt: date,
    isDeleted: false
  };

  if(editingId){
    await updateDoc(doc(db,"diaries",editingId), data);
    editingId = null;
  } else {
    await addDoc(collection(db,"diaries"), data);
  }

  showView("dayView");
  openDay(selectedDateStr);
};

window.deleteDiary = async (id)=>{
  if(!confirm("削除しますか？")) return;

  await updateDoc(doc(db,"diaries",id),{
    isDeleted: true
  });

  openDay(selectedDateStr);
};

window.showView = (id)=>{
  ["calendarView","dayView","editorView","viewDiaryView"].forEach(v=>{
    document.getElementById(v).style.display="none";
  });
  document.getElementById(id).style.display="block";
};

window.openEditor = ()=>{
  title.value="";
  content.value="";
  editingId=null;
  showView("editorView");
};