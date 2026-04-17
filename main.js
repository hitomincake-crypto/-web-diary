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
let editingId = null;

// ログイン
window.login = async () => {
  await signInWithEmailAndPassword(
    auth,
    document.getElementById("email").value,
    document.getElementById("password").value
  );
};

// ログイン後
onAuthStateChanged(auth, user => {
  if (user) {
    loginArea.style.display = "none";
    appArea.style.display = "block";
    showView("calendarView");
    renderCalendar();
  }
});

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

  document.getElementById("monthLabel").textContent = `${y}年 ${m+1}月`;

  const snap = await getDocs(query(
    collection(db,"diaries"),
    where("userId","==",auth.currentUser.uid)
  ));

  const map = {};

  snap.forEach(d=>{
    const data = d.data();

    // 👇ここが重要
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

// 月移動
window.prevMonth=()=>{currentDate.setMonth(currentDate.getMonth()-1);renderCalendar();}
window.nextMonth=()=>{currentDate.setMonth(currentDate.getMonth()+1);renderCalendar();}

// 日表示
window.openDay=async(dateStr)=>{
  selectedDateStr=dateStr;
  showView("dayView");

  document.getElementById("selectedDate").textContent=dateStr;

  const list=document.getElementById("dailyList");
  list.innerHTML="";

  const snap=await getDocs(query(
    collection(db,"diaries"),
    where("userId","==",auth.currentUser.uid)
  ));

  snap.forEach(d=>{
    const data=d.data();

    // 👇ここが重要
    if(data.isDeleted) return;
    if(!data.createdAt) return;

    const key=new Date(data.createdAt.seconds*1000).toISOString().split("T")[0];

    if(key===dateStr){
      const div=document.createElement("div");
      div.className="diary-card";

      div.innerHTML=`
        <h4>${data.title||"(無題)"}</h4>
        <p>${data.content}</p>
        <div>
          <button onclick="editDiary('${d.id}')">編集</button>
          <button onclick="deleteDiary('${d.id}')">削除</button>
        </div>
      `;

      list.appendChild(div);
    }
  });
};

// 編集
window.editDiary=async(id)=>{
  editingId=id;

  const snap=await getDocs(collection(db,"diaries"));
  snap.forEach(d=>{
    if(d.id===id){
      const data=d.data();
      document.getElementById("title").value=data.title;
      document.getElementById("content").value=data.content;
    }
  });

  showView("editorView");
};

// 保存
window.saveDiary=async()=>{
  const selectedDate=new Date(selectedDateStr+"T12:00:00");

  const data={
    userId:auth.currentUser.uid,
    title:document.getElementById("title").value,
    content:document.getElementById("content").value,
    createdAt:selectedDate,
    isDeleted:false
  };

  if(editingId){
    await updateDoc(doc(db,"diaries",editingId),data);
    editingId=null;
  }else{
    await addDoc(collection(db,"diaries"),data);
  }

  showView("dayView");
  openDay(selectedDateStr);
};

// 削除
window.deleteDiary=async(id)=>{
  await updateDoc(doc(db,"diaries",id),{isDeleted:true});
  openDay(selectedDateStr);
};