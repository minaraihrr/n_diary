const template = document.getElementById('entry-template');
const container = document.getElementById('container');

//
// 日付フォーマット関連
//

// 日付入力欄フォーマット
// timestamp → YYYY-MM-DD
function formatDate(date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 日付表示欄フォーマット
// YYYY-MM-DD → YYYY/MM/DD(曜)
function formatToJP(dateStr) {
  const date = new Date(dateStr); // '2025-11-22'
  const months = ["日","月","火","水","木","金","土"];

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const week = months[date.getDay()];

  return `${y}/${m}/${d}(${week})`;
}

// 日付型登録フォーマット
// YYYY/MM/DD(曜) → YYYY-MM-DD
function jpDisplayToIso(dateStr) {
  return dateStr
    .replace(/\(.\)/, "")  // "(土)" を削除
    .replace(/\//g, "-");  // "/" を "-" に変換
}

//
// 画面操作
//

// 画面操作時日記データ取得
function loadDiaries(){
    let selectedYear = document.getElementById('year').value;
    let selectedDate = document.getElementById('date').value;
    getDiaries(selectedYear, selectedDate);
}

// 戻る・進む処理
function moveDate(diff){
    let objDate = document.getElementById('date');
    let date = new Date(objDate.value);
    date.setDate(date.getDate() + diff);
    objDate.value = formatDate(date);

}

// 編集モードに切り替え
function switchToEditMode(card){
  const p = card.querySelector('p');
  const ta = card.querySelector('textarea');

  // 表示 → 入力に内容を同期
  ta.value = p.textContent || '';

  // 表示制御
  p.classList.add('d-none');
  ta.classList.remove('d-none');  
  card.querySelector('button[data-action="edit"]').classList.add('d-none');
  card.querySelector('button[data-action="save"]').classList.remove('d-none');  
}

// 閲覧モードに切り替え
function switchToViewMode(card){
  const p = card.querySelector('p');
  const ta = card.querySelector('textarea');

  // 入力 → 表示に内容を同期
  p.textContent = ta.value || '';

  // 表示制御
  p.classList.remove('d-none');
  ta.classList.add('d-none');  
  card.querySelector('button[data-action="edit"]').classList.remove('d-none');
  card.querySelector('button[data-action="save"]').classList.add('d-none');  
}

//
// プルダウン生成
//
async function generateYearOptions(objYear, currentYear){
  // 最古年データ取得
  const res = await fetch('/api/diaries/years/min');
  const { min_year } = await res.json();
  let year = 1;

  // プルダウン生成
  for (let i = currentYear; i >= min_year; i--){
    const option = document.createElement('option');
    option.value = year;
    option.textContent = `${year}`;
    objYear.appendChild(option);
    year++;
  }

}


//
// 日記データ操作
//

// 年数分のテンプレート表示
function renderTemplates(year){
  container.innerHTML = '';
  for (let i = 0; i < year; i++) {
    const clone = template.content.cloneNode(true);
    clone.querySelector('div').dataset.id = i;
    container.appendChild(clone);
  }
}

// 日記データ取得・表示
async function getDiaries(year, date) {

  // 年数分のテンプレート表示
  renderTemplates(year);

  // APIから日記データ取得
  const res = await fetch(`/api/diaries?date=${date}&year=${year}`);
  if (!res.ok) { alert('読み込み失敗'); return; }
  const data = await res.json();

  // データ反映
  data.forEach((diary, index) => {
    const card = container.querySelector(`.card[data-id="${index}"]`);
    card.querySelector('span').textContent = formatToJP(diary.entry_date);
    card.querySelector('p').textContent = diary.content ?? '';
    card.querySelector('textarea').value = diary.content ?? '';
  });
  
}

// 日記データ登録
async function registDiaries(id) {
  // 登録データ取得
  const card = container.querySelector(`.card[data-id="${id}"]`);
  const date = jpDisplayToIso(card.querySelector('span').textContent);
  const content = card.querySelector('textarea').value;

  // 入力チェック
  if (content.length > 2000) {
    alert(`本文は2000文字以内で入力してください`);
    return;
  }

  // 登録
  const res = await fetch('/api/diaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: date,
      content: content
    })
  }); 
  if (!res.ok) { 
    alert('書き込み失敗'); 
    return; 
  }
  alert('保存しました'); 
}

//
// メイン処理
//

// テンプレート内イベント設定
function setupDiaryClickHandler(){
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return; // ボタン以外は無視

    const card = btn.closest('.card[data-id]');
    if (!card) return;

    if (btn.dataset.action === 'edit'){
        switchToEditMode(card);
    } else if (btn.dataset.action === 'save'){
        try {
          await registDiaries(card.dataset.id);
          switchToViewMode(card);
        } catch (err) {
          alert('保存に失敗しました');
        }
    }
  });
}

// メイン処理
async function main(){
  //
  // 初期設定
  //
  const date = formatDate(new Date());  // 今日の日付
  const year = 3;                       // 年数初期値

  // 日付初期値設定
  document.getElementById('date').value = date;

  // 年数初期値設定
  const objYear = document.getElementById('year');
  await generateYearOptions(objYear, date.substring(0,4));
  document.getElementById('year').value = year;

  //
  // イベント設定
  //

  // ヘッダーイベント設定
  document.getElementById('year').addEventListener('change', (e) => {
    loadDiaries();
  });
  document.getElementById('date').addEventListener('change', (e) => {
    loadDiaries();
  });
  document.getElementById('prev').addEventListener('click', (e) => {
    moveDate(-1);
    loadDiaries();
  });
  document.getElementById('next').addEventListener('click', (e) => {
    moveDate(1);
    loadDiaries();
  });

  // テンプレート内イベント設定
  setupDiaryClickHandler();

  //
  // 日記データ取得・表示
  //
  getDiaries(year, date);

}

//
// ロード時
//
main();

