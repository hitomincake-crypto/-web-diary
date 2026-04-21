import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, doc,
  setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { firebaseConfig } from "./firebaseConfig.js";
import { githubConfig } from "./githubConfig.js";

import {
  toDate, toDateKey, formatTime,
  getDayRange, getMonthRange
} from "./utils.js";

import { setDeployInfo } from "./github.js";
import { diaryItemTemplate } from "./template.js";

// 🔥 追加（Firestore分離）
import {
  fetchDiariesByMonth,
  fetchDiariesByDay
} from "./firestore.js";

initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();

document.addEventListener("DOMContentLoaded", () => {
  setDeployInfo(githubConfig.owner, githubConfig.repo);
});

let selectedDateStr = "";
let nickname = "";
let editingId = null;
let currentDate = new Date();
const monthCache = {};

// =============================
// ログイン（変更なし）
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
// カレンダー
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

    const { start, end } = getMonthRange(y, m);

    // 🔥 変更：Firestore関数使用
    snap = await fetchDiariesByMonth(db, start, end);

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
// 日表示
// =============================
window.openDay = async (dateStr)=>{
  selectedDateStr = dateStr;

  showView("dayView");

  selectedDate.textContent = dateStr;
  dailyList.innerHTML = "";

  const { start, end } = getDayRange(dateStr);

  // 🔥 変更：Firestore関数使用
  const snap = await fetchDiariesByDay(db, start, end);

  snap.forEach(d=>{
    const data = d.data();
    if (data.isDeleted) return;

    const div = document.createElement("div");
    div.className = "diary-card";

    div.innerHTML = diaryItemTemplate(d, data, formatTime);

    dailyList.appendChild(div);
  });
};

// =============================
// 以下完全変更なし
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