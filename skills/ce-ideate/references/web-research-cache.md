# 웹 리서치 캐시 (V15) (Web Research Cache)

`web-researcher`를 파견하기 전에 V15 캐시를 확인하거나, 파견 후 새로운 리서치 결과를 캐시에 추가할 때 이 파일을 읽으십시오. 여기서 설명하는 동작은 조건부입니다 — 대부분의 호출은 캐시를 확인하거나 캐시에 한 번 작성한 후 다음 단계로 넘어갑니다.

## 캐시 파일 형태 (Cache file shape)

```json
[
  {
    "key": {
      "mode": "repo|elsewhere-software|elsewhere-non-software",
      "focus_hint_normalized": "<소문자 변환 및 공백 제거된 포커스 힌트 또는 빈 문자열>",
      "topic_surface_hash": "<사용자가 제공한 주제(topic surface)의 짧은 해시값>"
    },
    "result": "<웹 리서처 출력 결과물 (일반 텍스트)>",
    "ts": "<iso8601>"
  }
]
```

파일은 `<scratch-dir>/web-research-cache.json`에 위치하며, 여기서 `<scratch-dir>`은 SKILL.md Phase 1에서 한 번 결정된 `/tmp/compound-engineering/ce-ideate/<run-id>`입니다.

## 재사용 확인 (Reuse check)

`web-researcher`를 파견하기 전에, bash에서 스크래치 루트(scratch root, `<scratch-dir>`의 상위 디렉토리)를 확인하고 형제 run-id 디렉토리들을 나열하십시오 — 세션 내의 정교화 루프는 run-id가 아닌 주제별로 다른 실행의 캐시를 재사용할 수 있습니다:

```bash
SCRATCH_ROOT="/tmp/compound-engineering/ce-ideate"
find "$SCRATCH_ROOT" -maxdepth 2 -name 'web-research-cache.json' -type f 2>/dev/null
```

캐시 파일이 존재하지 않는 경우 `find`는 빈 출력을 내보내며 종료 코드 0을 반환하므로, 첫 실행 시에도 재사용 확인 단계가 중단되지 않습니다.

일치하는 각 파일을 읽으십시오. 어떤 항목의 `key`가 현재 실행과 일치하면 (동일한 모드 변종 — `repo`, `elsewhere-software`, 또는 `elsewhere-non-software` — 및 대소문자 구분 없이 정규화된 동일한 포커스 힌트, 그리고 동일한 주제 해시), 파견을 건너뛰고 캐시된 `result`를 통합 근거 요약(grounding summary)으로 전달하십시오. 모드 변종은 정확히 일치해야 합니다: `elsewhere-software`와 `elsewhere-non-software`는 서로 다른 도메인이므로 상호 재사용해서는 안 됩니다. 요약에 다음과 같이 기록하십시오: "이 세션의 이전 웹 리서치 결과를 재사용합니다 — 새로 고침하려면 're-research'라고 말씀해 주세요."

사용자가 `re-research`로 오버라이드하면 일치하는 항목을 삭제하고 새로 리서치를 수행하십시오.

## 새로운 리서치 수행 후 추가 (Append after fresh dispatch)

새로운 리서치를 수행한 후, Phase 1에서 얻은 절대 경로를 사용하여 결과를 현재 실행의 캐시 파일인 `<scratch-dir>/web-research-cache.json`에 추가하십시오 (필요한 경우 디렉토리와 파일을 생성하십시오). 세션의 다음 호출에서는 위의 `find` 명령어를 통해 이를 재사용할 수 있습니다.

## 주제 해시 (Topic surface hash)

주제(topic surface)는 웹 리서치의 근거가 되는 사용자가 제공한 콘텐츠입니다:
- **기타 모드 (`elsewhere-software`, `elsewhere-non-software`):** 사용자의 주제 프롬프트와 Phase 0.4 인테이크 답변의 조합(에이전트가 실제로 조사 중인 대상). 두 하위 모드는 별도로 키잉됩니다 — 리서치 도메인이 다르기 때문에 동일한 주제 해시라도 소프트웨어와 비소프트웨어 간에 모드 재분류가 발생하면 새로운 리서치를 수행해야 합니다.
- **리포지토리 모드 (Repo mode):** 포커스 힌트와 고정된 리포지토리 식별자(discriminator)의 조합입니다. 이는 포커스가 비어 있을 때도 캐시 키를 의미 있게 유지합니다 — 동일한 리포지토리에서 프롬프트 없이 두 번 호출하면 리서치를 공유하지만, 키는 여전히 리포지토리를 구분합니다. 모든 리포지토리의 실행 결과 캐시 파일이 공유된 OS 임시 루트 아래에 위치하므로, `app`이나 `frontend`와 같은 단순한 기본 이름은 서로 무관한 리포지토리 간에 충돌을 일으킬 수 있습니다. 다음 폴백 체인을 통해 식별자를 결정하고 결과의 해시를 구하십시오 (sha256의 앞 8자리 16진수 문자로 충분함):
    1. `git remote get-url origin` — 머신 간에 안정적이며 동일한 원격 저장소의 협업자들에게 정확합니다.
    2. `git rev-parse --show-toplevel` — 리포지토리 절대 경로; 머신 로컬이지만 git 체크아웃 환경에서는 항상 사용 가능합니다.
    3. 현재 작업 디렉토리의 절대 경로 — git 리포지토리가 아닐 때 사용하는 최후의 수단입니다.

해싱 전 정규화: 소문자 변환, 공백 제거. (리포지토리 식별자 해시는 원본 명령어 출력을 바탕으로 계산되며, 포커스 힌트와 주제 텍스트만 정규화됩니다.)

## 성능 저하 (Degradation)

현재 플랫폼에서 호출 간 캐시 파일 접근이 불가능한 경우 (파일 시스템 격리, 샌드박싱, 휘발성 작업 디렉토리 등), "재사용 없음, 매번 새로 수행" 방식으로 성능을 낮추십시오. 통합 근거 요약에 이러한 제한 사항을 노출하고, 플랫폼이 지원하지 않는 기능을 억지로 구현하려 하기보다 재사용 없이 진행하십시오.
