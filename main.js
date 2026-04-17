import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, doc, setDoc, getDoc,
  query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const firebaseConfig = {

  apiKey: "AIzaSyB4qmFiq6cmSpCM3Vh1Ad5DfaJv4WN9hlQ",

  authDomain: "webdiaryapp.firebaseapp.com",

  projectId: "webdiaryapp",

  storageBucket: "webdiaryapp.firebasestorage.app",

  messagingSenderId: "491505252180",

  appId: "1:491505252180:web:05b6c590d7d33e4e8f3ac1",

  measurementId: "G-YKP0L7E2V3"

};

initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

let currentDate = new Date();
let selectedDateStr = "";
let editingId = null;
let nickname = "";

// ログイン
window.login = async () => {
  await signInWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );
};

// ログイン後
onAuthStateChanged(auth, async user => {
  if (!user) return;

  loginArea.style.display = "none";

  const userDoc = await getDoc(doc(db, "users", user.uid));

  if (!userDoc.exists()) {
    nicknameArea.style.display = "block";
  } else {
    nickname = userDoc.data().nickname;
    app.style.display = "block";
    showView("calendarView");
    renderCalendar();
  }
});

// ニックネーム保存
window.saveNickname = async () => {
  const user = auth.currentUser;
  nickname = nicknameInput.value;

  await setDoc(doc(db, "users", user.uid), {
    nickname: nickname
  });

  nicknameArea.style.display = "none";
  app.style.display = "block";
  renderCalendar();
};

// 画面切り替え
window.showView = (id) => {
  ["calendarView","dayView","editorView"].forEach(v=>{
    document.getElementById(v).style.display="none";
  });
  document.getElementById(id).style.display="block";
};

// カレンダー
async function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();

  monthLabel.textContent = `${y}年 ${m+1}月`;

  const snap = await getDocs(collection(db,"diaries"));

  const map = {};
  snap.forEach(d=>{
    const data = d.data();
    if(data.isDeleted) return;
    if(!data.createdAt) return;

    const key = new Date(data.createdAt.seconds*1000).toISOString().split("T")[0];
    map[key]=true;
  });

  const first = new Date(y,m,1).getDay();
  const last = new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++) calendar.appendChild(document.createElement("div"));

  for(let d=1;d<=last;d++){
    const div=document.createElement("div");
    const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    div.className="day";
    if(map[ds]) div.classList.add("has-post");

    div.textContent=d;
    div.onclick=()=>openDay(ds);

    calendar.appendChild(div);
  }
}

// 日表示
window.openDay = async (dateStr) => {
  selectedDateStr = dateStr;
  showView("dayView");

  selectedDate.textContent = dateStr;
  dailyList.innerHTML = "";

  const snap = await getDocs(collection(db,"diaries"));

  snap.forEach(d=>{
    const data = d.data();
    if(data.isDeleted) return;

    const key = new Date(data.createdAt.seconds*1000).toISOString().split("T")[0];

    if(key === dateStr){
      const div = document.createElement("div");
      div.className="diary-card";

      div.innerHTML = `
        <div class="nickname">${data.nickname || "不明"}</div>
        <h4>${data.title}</h4>
        <p>${data.content}</p>
        <button onclick="deleteDiary('${d.id}')">削除</button>
      `;

      dailyList.appendChild(div);
    }
  });
};

// 投稿
window.openEditor = () => showView("editorView");

window.saveDiary = async () => {
  const selectedDate = new Date(selectedDateStr+"T12:00:00");

  await addDoc(collection(db,"diaries"), {
    userId: auth.currentUser.uid,
    nickname: nickname,
    title: title.value,
    content: content.value,
    createdAt: selectedDate,
    isDeleted: false
  });

  showView("dayView");
  openDay(selectedDateStr);
};

// 削除
window.deleteDiary = async (id) => {
  await updateDoc(doc(db,"diaries",id),{
    isDeleted:true
  });
  openDay(selectedDateStr);
};