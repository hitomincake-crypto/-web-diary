import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, getDocs
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

const loginArea = document.getElementById("loginArea");
const appArea = document.getElementById("app");

let currentDate = new Date();
let selectedDateStr = "";

// ログイン
window.login = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  await signInWithEmailAndPassword(auth, email, password);
};

// ログイン状態
onAuthStateChanged(auth, user => {
  if (user) {
    loginArea.style.display = "none";
    appArea.style.display = "block";
    showView("calendarView");
    renderCalendar();
  }
});

// 画面切り替え
window.showView = (viewId) => {
  document.getElementById("calendarView").style.display = "none";
  document.getElementById("dayView").style.display = "none";
  document.getElementById("editorView").style.display = "none";
  document.getElementById(viewId).style.display = "block";
};

// カレンダー描画
async function renderCalendar() {
  const calendar = document.getElementById("calendar");
  const monthLabel = document.getElementById("monthLabel");

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthLabel.textContent = `${year}年 ${month + 1}月`;

  const q = query(
    collection(db, "diaries"),
    where("userId", "==", auth.currentUser.uid),
    where("isDeleted", "==", false)
  );

  const snap = await getDocs(q);

  const dateMap = {};
  snap.forEach(d => {
    const data = d.data();
    if (!data.createdAt) return;

    const date = new Date(data.createdAt.seconds * 1000);
    const key = date.toISOString().split("T")[0];
    dateMap[key] = true;
  });

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= lastDate; d++) {
    const div = document.createElement("div");
    div.className = "day";

    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    if (dateMap[dateStr]) {
      div.classList.add("has-post");
    }

    div.textContent = d;
    div.onclick = () => openDay(dateStr);

    calendar.appendChild(div);
  }
}

// 月移動
window.prevMonth = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

window.nextMonth = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

// 日クリック
window.openDay = async (dateStr) => {
  selectedDateStr = dateStr;
  showView("dayView");

  document.getElementById("selectedDate").textContent = dateStr;

  const q = query(
    collection(db, "diaries"),
    where("userId", "==", auth.currentUser.uid),
    where("isDeleted", "==", false)
  );

  const snap = await getDocs(q);

  const list = document.getElementById("dailyList");
  list.innerHTML = "";

  snap.forEach(d => {
    const data = d.data();
    if (!data.createdAt) return;

    const date = new Date(data.createdAt.seconds * 1000);
    const key = date.toISOString().split("T")[0];

    if (key === dateStr) {
      const div = document.createElement("div");
      div.innerHTML = `<h4>${data.title || "(無題)"}</h4><p>${data.content}</p>`;
      list.appendChild(div);
    }
  });
};

// 投稿画面
window.openEditor = () => {
  showView("editorView");
};

// 保存（←ここが重要修正）
window.saveDiary = async () => {
  // selectedDateStr を Date に変換
  const selectedDate = new Date(selectedDateStr + "T12:00:00");

  await addDoc(collection(db, "diaries"), {
    userId: auth.currentUser.uid,
    title: document.getElementById("title").value,
    content: document.getElementById("content").value,

    // 👇 ここがポイント
    createdAt: selectedDate,

    isDeleted: false
  });

  showView("calendarView");
  renderCalendar();
};