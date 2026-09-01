# Chapter 4 — 콜백 기반 비동기 제어 흐름

콜백만으로 순차/병렬/제한된 병렬 실행을 구현하는 방법을 웹 스파이더(재귀적으로
링크를 따라가며 페이지를 다운로드하는 프로그램) 예제로 단계별로 발전시킨다.

| 디렉토리 | 내용 |
|---|---|
| `webspider/` | spider1(순차 실행) → spider2(무제한 병렬) → spider3(제한된 병렬, `QueueLimit`) → spider4(자체 `TaskQueue` 구현)로 이어지는 4단계 진화. 자체 `package.json` 보유 |
| `exercise/` | 연습문제 4종 — `BrokenLinkCheck04`(깨진 링크 찾기), `fileConcatenation01`(파일 순차 병합), `listFileRecursively02`(재귀적 파일 목록), `recursiveFind03`(키워드로 파일 재귀 검색). 각 폴더의 `idea.md`에 문제 정의와 설계 스케치가 있다 |

`exercise/` 하위 각 폴더는 보통 `idea.md`(문제 정의/설계) → 여러 버전의 `.mjs`
구현(V2, V3 등 점진적 개선)으로 구성된다.
