#!/usr/bin/env node

/**
 * Commit 시간대를 4구간으로 집계해 README의 지정 블록을 갱신합니다.
 * 구간 정의 (원하는 대로 바꿔도 됨):
 * - Night:   00:00–05:59
 * - Morning: 06:00–11:59
 * - Daytime: 12:00–17:59
 * - Evening: 18:00–23:59
 *
 * 타임존: 기본 Asia/Seoul(UTC+9). 다른 지역이면 TZ_OFFSET을 바꾸세요.
 */

const fs = require('fs');
const { execSync } = require('child_process');

const README = 'README.md';
const START = '<!--commit-times:start-->';
const END = '<!--commit-times:end-->';

// ❗ 지역 타임존 오프셋 (시간)
const TZ_OFFSET = 9; // KST = UTC+9

// Git 로그에서 ISO8601 작성일 가져오기 (머지커밋 포함/제외는 취향대로)
const raw = execSync('git log --pretty=%aI', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

// 시간대 버킷
const buckets = {
  Night:   { label: '🌙 Night',    count: 0 },
  Morning: { label: '🦁 Morning',  count: 0 },
  Daytime: { label: '🌆 Daytime',  count: 0 },
  Evening: { label: '🌃 Evening',  count: 0 },
};

for (const iso of raw) {
  const d = new Date(iso);
  // UTC 시각 기준에 오프셋 적용
  let h = (d.getUTCHours() + TZ_OFFSET + 24) % 24;

  if (h < 6) buckets.Night.count++;
  else if (h < 12) buckets.Morning.count++;
  else if (h < 18) buckets.Daytime.count++;
  else buckets.Evening.count++;
}

// 정렬: 많은 순
const entries = Object.values(buckets).sort((a, b) => b.count - a.count);
const total = entries.reduce((s, e) => s + e.count, 0) || 1;

// 텍스트 막대 만들기 (칸 개수 30칸)
function bar(pct, width = 30) {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// 표 본문 생성
const lines = entries.map((e, i) => {
  const pct = +( (e.count / total) * 100 ).toFixed(1);
  const b = bar(pct);
  const rank = String(i + 1).padStart(2, ' ');
  const commits = `${e.count} commit${e.count === 1 ? '' : 's'}`;
  // 깃허브에서 예쁘게 보이는 한 줄 레이아웃
  return `${rank}. ${e.label}  ${commits}   \`${b}\`  **${pct}%**`;
});

// 헤더 + 본문
const block = [
  '### I\'m an early 🐣',
  '',
  ...lines,
  ''
].join('\n');

// README 갱신
const md = fs.readFileSync(README, 'utf8');
const start = md.indexOf(START);
const end = md.indexOf(END);

if (start === -1 || end === -1 || end < start) {
  console.error('README에 마커가 없습니다. <!--commit-times:start--> ~ <!--commit-times:end--> 를 추가하세요.');
  process.exit(1);
}

const before = md.slice(0, start + START.length);
const after  = md.slice(end);
const next = `${before}\n${block}\n${END}${after}`;
fs.writeFileSync(README, next, 'utf8');

console.log('✅ Commit 시간대 통계를 README에 반영했습니다.');
