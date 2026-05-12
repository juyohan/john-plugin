# Git 워크플로우

## 커밋 메시지 형식
```
<type>: <description>

<optional body>
```

종류(Types): feat, fix, refactor, docs, test, chore, perf, ci

참고: 작성자 정보(Attribution)는 `~/.claude/settings.json`을 통해 전역적으로 비활성화되어 있습니다.

## 풀 리퀘스트(PR) 워크플로우

PR을 생성할 때:
1. 최신 커밋뿐만 아니라 전체 커밋 히스토리를 분석하십시오.
2. `git diff [base-branch]...HEAD`를 실행하여 모든 변경 사항을 확인하십시오.
3. 포괄적인 PR 요약을 작성하십시오.
4. 할 일(TODO) 목록이 포함된 테스트 계획을 포함하십시오.
5. 새 브랜치인 경우 `-u` 플래그와 함께 푸시하십시오.

> Git 작업 전의 전체 개발 프로세스(기획, TDD, 코드 리뷰)에 대해서는
> [development-workflow.md](./development-workflow.md)를 참조하십시오.
