# 🌟 텐 메이커 (Make 10) - 교수 학습 웹 애플리케이션

초등학교 및 유치원 수학 기초 연산인 **'10 만들기(10의 보수 연산)'**를 흥미로운 미니게임과 100 Gold 보스전 타임어택으로 학습하는 웹 애플리케이션입니다.

---

## ✨ 핵심 기능

1. **미니게임 3종 (각 25~30초)**:
   - **10 보수 버블 팝**: 타깃 수와 합해서 10이 되는 수 버블 터뜨리기
   - **10 스피드 카드**: 합이 10이 되는 카드 2장 짝지어 지우기
   - **10 드롭 포토리스**: 상단에서 떨어지는 수에 맞추어 보수 숫자 발사
   - 클리어 시 **골드(Gold) 획득** 및 **미니게임 클리어 횟수** 누적!

2. **👹 100 Gold 보스 던전 타임어택**:
   - 모은 **100 Gold**를 지불하고 보스에게 도전!
   - 10개의 10보수 퀴즈를 연속 출제 (텐-프레임 visual hint 지원).
   - 정답을 맞출 때마다 보스 HP 차감, 완료 시 정밀 소요시간(초, ms) 및 정답 수 기록.

3. **🏆 명예의 전당 (Hall of Fame) & Firebase Firestore**:
   - **우선 정렬 규칙**:
     1. **1순위**: 맞춘 문제 수 (10/10 정답 > 9/10 정답 ...)
     2. **2순위**: 보스 클리어 소요 시간 (시간이 짧을수록 상위 랭킹)
     3. **3순위**: 모은 골드 및 미니게임 클리어 횟수
   - Firebase Firestore 연동으로 실시간 리더보드 동기화 + LocalStorage 백업.

4. **🔑 인증 (Google 로그인 & 익명 로그인)**:
   - Firebase Authentication 연동으로 Google 계정 로그인 또는 게스트(익명) 로그인 지원.

---

## 🛠️ GitHub 및 Vercel 배포 방법 Guide

### 1. GitHub에 업로드하기
이 프로젝트 폴더에서 git 터미널을 열고 다음 명령어를 실행하세요:

```bash
git init
git add .
git commit -m "Initial commit - Ten Maker Web App"
git branch -M main
git remote add origin https://github.com/사용자아이디/ten-maker.git
git push -u origin main
```

### 2. Vercel로 클릭 한 번으로 배포하기
1. [Vercel 공식 사이트](https://vercel.com)에 로그인합니다.
2. **Import Project**에서 위에서 올린 GitHub 레포지토리(`ten-maker`)를 선택합니다.
3. Framework Preset을 **Other** 또는 **Vite**로 두고 **Deploy** 버튼을 누릅니다!
4. 단 몇 초 만에 무료 HTTPS 웹 사이트 주소(`https://ten-maker.vercel.app`)가 생성됩니다.

---

## 🔥 Firebase 설정 안내 (선택사항)

프로젝트 내 `firebase-config.js` 파일에서 본인의 Firebase 콘솔 설정(apiKey, projectId 등)을 입력하면 Firestore 및 Google 로그인 서비스가 완전히 활성화됩니다! (설정이 없어도 기본 익명 샌드박스로 완벽 구동됩니다.)
