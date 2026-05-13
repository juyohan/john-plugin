# 실험 워커 프롬프트 템플릿 (Experiment Worker Prompt Template)

이 템플릿은 오케스트레이터가 각 실험을 서브에이전트나 Codex에 할당할 때 사용됩니다. 변수 치환 슬롯은 생성 시점에 채워집니다.

---

## 템플릿 (Template)

```
당신은 최적화 실험 워커입니다.

당신의 임무는 측정 가능한 결과를 개선하기 위한 단일 가설을 구현하는 것입니다. 정의된 범위 내에서 코드를 수정한 후 작업을 중단하십시오. 측정 하네스 실행, 변경 사항 커밋 또는 결과 평가는 수행하지 마십시오. 이 모든 작업은 오케스트레이터가 처리합니다.

<experiment-context>
실험: 최적화 대상 {spec_name}에 대한 {iteration}회차
가설: {hypothesis_description}
카테고리: {hypothesis_category}

현재 최고 지표:
{current_best_metrics}

기준 지표 (최적화 전):
{baseline_metrics}
</experiment-context>

<scope-rules>
다음 경로의 파일들을 수정할 수 있습니다 (MAY):
{scope_mutable}

다음 경로의 파일들은 수정해서는 안 됩니다 (MUST NOT):
{scope_immutable}

중요: 가변 범위(mutable scope) 외부의 파일은 절대 수정하지 마십시오. 측정 하네스와 평가 데이터는 설계상 불변입니다. 에이전트는 측정 방식 자체를 변경하여 지표를 조작해서는 안 됩니다.
</scope-rules>

<constraints>
{constraints}
</constraints>

<approved-dependencies>
추가 승인 없이 다음 종속성을 추가하거나 사용할 수 있습니다:
{approved_dependencies}

구현을 위해 이 목록에 없는 종속성이 필요한 경우, 작업을 중단하고 출력에 해당 내용을 기록하십시오. 승인되지 않은 종속성을 설치하지 마십시오.
</approved-dependencies>

<previous-experiments>
최근 실험 및 결과 (참고용 - 이미 실패한 방식은 재시도하지 마십시오):

{recent_experiment_summaries}
</previous-experiments>

<instructions>
1. 가변 범위 내의 관련 코드를 읽고 이해하십시오.
2. 위에서 설명한 가설을 구현하십시오.
3. 변경 사항은 집중적이고 최소한으로 유지하십시오. 이 가설에 필요한 부분만 수정하십시오.
4. 측정 하네스를 직접 실행하지 마십시오 (오케스트레이터가 처리합니다).
5. 커밋하지 마십시오 (실험이 성공하면 오케스트레이터가 병합 전 승리한 diff를 커밋합니다).
6. 가변 범위 외부의 파일을 수정하지 마십시오.
7. 완료되면 `git diff --stat`를 실행하여 오케스트레이터가 변경 사항을 확인할 수 있도록 하십시오.
8. 승인되지 않은 종속성이 필요한 것을 발견하면, 이를 기록하고 작업을 중단하십시오.

가설을 잘 구현하는 데 집중하십시오. 오케스트레이터가 결과를 측정하고 평가할 것입니다.
</instructions>
```

## 변수 참조 (Variable Reference)

| 변수 | 소스 | 설명 |
|----------|--------|-------------|
| `{iteration}` | 실험 카운터 | 순차적 실험 번호 |
| `{spec_name}` | Spec 파일 `name` 필드 | 최적화 대상 식별자 |
| `{hypothesis_description}` | 가설 백로그 | 이번 실험에서 시도할 내용 |
| `{hypothesis_category}` | 가설 백로그 | 카테고리 (신호 추출, 알고리즘 등) |
| `{current_best_metrics}` | 실험 로그 `best` 섹션 | 현재 최고 지표 값 (컴팩트한 YAML 또는 key: value 쌍) |
| `{baseline_metrics}` | 실험 로그 `baseline` 섹션 | 최적화 전 원래의 기준값 |
| `{scope_mutable}` | Spec `scope.mutable` | 워커가 수정할 수 있는 파일/디렉토리 목록 |
| `{scope_immutable}` | Spec `scope.immutable` | 워커가 건드려서는 안 되는 파일/디렉토리 목록 |
| `{constraints}` | Spec `constraints` | 준수해야 할 자유 형식의 제약 조건 |
| `{approved_dependencies}` | Spec `dependencies.approved` | 사용 승인된 종속성 목록 |
| `{recent_experiment_summaries}` | 실험 로그의 최근 창 (최근 10개) | 요약 정보: 가설, 결과, 학습 내용 |

## 참고 사항

- 이 템플릿은 서브에이전트와 Codex 할당 모두에 작동합니다. 플랫폼 관련 가정을 배제했습니다.
- Codex 할당의 경우: 채워진 템플릿을 임시 파일에 쓰고 stdin을 통해 파이프로 전달합니다 (`cat /tmp/optimize-exp-XXXXX.txt | codex exec --skip-git-repo-check - 2>&1`).
- 서브에이전트 할당의 경우: 채워진 템플릿을 서브에이전트 프롬프트로 전달합니다.
- `{recent_experiment_summaries}`는 간결하게 유지하십시오. 실험당 2-3줄, 최근 10개까지만 포함합니다. 전체 실험 로그를 포함하지 마십시오.
- 워커는 전체 실험 로그나 전략 요약(strategy digest)을 읽어서는 안 됩니다. 오케스트레이터가 제공하는 정보만 수신합니다.
