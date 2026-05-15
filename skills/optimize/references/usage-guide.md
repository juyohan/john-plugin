# `/genie:optimize` 사용 가이드

## 이 스킬의 목적

`/genie:optimize`는 다음과 같은 어려운 엔지니어링 문제를 위해 설계되었습니다:

1. 여러 코드 또는 설정 변형(variant)을 시도할 수 있는 경우.
2. 각 변형에 대해 동일한 평가를 실행할 수 있는 경우.
3. 좋은 변형은 유지하고 나쁜 변형은 거부하려는 경우.

이 스킬은 단발성 구현 작업보다는 "탐색 공간을 검색하고 결과의 점수를 매기는" 작업에 가장 적합합니다.

## 사용 시기

문제가 다음과 같을 때 `/genie:optimize`를 사용하십시오:

- "RAM 낭비 없이 OOM 크래시를 멈추는 가장 작은 메모리 제한 찾기."
- "모든 것을 하나의 쓰레기 클러스터로 뭉개지 않고 클러스터링 파라미터 튜닝하기."
- "비용은 더 저렴하지만 후속 클러스터링에 충분히 좋은 요약을 생성하는 프롬프트 찾기."
- "동일한 하네스에서 여러 랭킹, 검색, 배치 또는 임계값 전략 비교하기."

성공 여부가 객관적이고 측정이 저렴할 때는 `type: hard`를 선택하십시오:

- 메모리 사용량
- 레이턴시 (Latency)
- 처리량 (Throughput)
- 테스트 통과율
- 빌드 시간

숫자 지표가 조작될 수 있거나 인간에게 유용한지가 중요할 때는 `type: judge`를 선택하십시오:

- 클러스터 일관성 (Coherence)
- 검색 관련성 (Relevance)
- 요약 품질
- 프롬프트 품질
- 의미론적 예외 사례가 포함된 분류 품질

## 사용하지 않아야 할 시기

다음과 같은 경우 `/genie:optimize`는 적절한 도구가 아닙니다:

- 수정 사항이 명확하여 실험이 필요 없는 경우
- 반복 가능한 측정 하네스가 없는 경우
- 탐색 공간이 가짜이고 타당한 답이 하나뿐인 경우
- 변형 평가 비용이 너무 높아 여러 번 실행할 가치가 없는 경우

## 생각하는 방식

패턴은 다음과 같습니다:

1. 목표(target)를 정의합니다.
2. 측정 하네스를 먼저 구축하거나 검증합니다.
3. 여러 개의 타당한 변형을 생성합니다.
4. 각 변형에 대해 동일한 평가 루프를 실행합니다.
5. 가이드레일을 위반하지 않으면서 목표를 개선하는 변형을 유지합니다.

핵심 규칙은 간단합니다:

- 정량적 지표(hard metric)가 "더 나음"을 정확히 포착한다면 정량적 지표를 최적화하십시오.
- 정량적 지표가 조작될 수 있다면 LLM-as-judge를 추가하십시오.

예: 클러스터링 임계값을 낮추면 클러스터 커버리지가 증가할 수 있습니다. 수치상으로는 좋아 보이지만 결과적으로 모든 것이 하나의 거대한 클러스터로 뭉쳐질 수 있습니다. 정량적 지표는 "개선됨"이라고 말하겠지만, 실제 클러스터를 샘플링하는 LLM 심판은 "이것은 쓰레기입니다"라고 말할 수 있습니다.

## 첫 실행 조언

첫 실행 시:

- `execution.mode: serial`을 선호하십시오.
- `execution.max_concurrent: 1`로 설정하십시오.
- `stopping.max_iterations`를 작게 유지하십시오.
- `stopping.max_hours`를 짧게 유지하십시오.
- 기준 지표(baseline)가 신뢰할 수 있을 때까지 새로운 종속성을 피하십시오.
- 심판 모드(judge mode)에서는 작은 샘플과 낮은 비용 상한선을 사용하십시오.

첫 실행의 목표는 즉시 최적화에서 승리하는 것이 아니라 하네스를 검증하는 것입니다.

## 예시 프롬프트

### 1. 메모리 튜닝 (Memory Tuning)

```text
Use /genie:optimize to find the smallest memory setting that keeps this service stable under our load test.

The current container limit is 512 MB and the app sometimes OOM-crashes. Do not just jump to 8 GB. Try a small set of realistic memory limits, run the same load test for each one, and score the results using:
- did the process OOM
- did tail latency spike badly
- did GC pauses become excessive

Prefer the smallest memory limit that passes the guard rails.
```

### 2. 클러스터링 품질 (Clustering Quality)

```text
Use /genie:optimize to improve issue and PR clustering quality.

We have about 18k open issues and PRs. We want to test changes that improve clustering quality, reduce singleton clusters, and improve match quality within each cluster.

Do not mutate the shared default database. Copy it for the run, then use per-experiment copies when needed.

Do not optimize only for coverage. Use LLM-as-judge to sample clusters and confirm they still preserve real semantic similarity instead of collapsing into giant low-quality clusters.
```

### 3. 프롬프트 최적화 (Prompt Optimization)

```text
Use /genie:optimize to create a summarization prompt for issues and PRs that minimizes token spend while still producing summaries that are good enough for downstream clustering.

I want the loop to compare prompt variants, measure token cost, and judge whether the summaries preserve the distinctions needed to cluster related issues together without merging unrelated ones.
```

## 정량적 지표(Hard Metrics)와 심판 모드(Judge Mode) 사이의 선택

다음과 같은 경우 정량적 지표만 사용하십시오:

- 숫자로 "더 나음"이 명확히 드러날 때.

다음과 같은 경우 심판 모드를 추가하십시오:

- 수치는 개선되는데 실제 출력 품질은 나빠질 수 있을 때.

일반적인 패턴:

- 정량적 게이트(hard gate)가 망가진 출력을 거부합니다.
- 심판 모드가 살아남은 후보들의 실제 유용성 점수를 매깁니다.

이러한 하이브리드 설정은 랭킹, 클러스터링 및 프롬프트 작업에서 가장 권장되는 기본값입니다.
