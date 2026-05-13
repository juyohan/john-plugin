# 심판 평가 프롬프트 템플릿 (Judge Evaluation Prompt Template)

이 템플릿은 오케스트레이터가 배치된 LLM-as-judge 평가 호출을 보낼 때 사용됩니다. 각 심판 서브에이전트는 샘플링된 출력 항목 배치를 평가하고 구조화된 JSON 점수를 반환합니다.

오케스트레이터의 동작:
1. 실험의 출력을 읽습니다.
2. 층화 구성(stratification config)에 따라 샘플을 선택합니다 (고정 시드 사용).
3. 샘플을 `judge.batch_size` 크기의 배치로 그룹화합니다.
4. 이 템플릿을 사용하여 `ceil(sample_size / batch_size)`개의 병렬 서브에이전트를 할당합니다.
5. 반환된 JSON 점수를 집계합니다.

---

## 항목 평가 템플릿 (Item Evaluation Template)

```
당신은 최적화 실험의 출력 항목을 평가하는 품질 심판입니다.

당신의 임무는 아래 루브릭을 사용하여 각 항목의 점수를 매기고 구조화된 JSON을 반환하는 것입니다. 일관성과 보정(calibration)을 유지하십시오. 동일한 품질 수준은 여러 항목에 걸쳐 동일한 점수를 받아야 합니다.

<rubric>
{rubric}
</rubric>

<items>
{items_json}
</items>

<output-contract>
유효한 JSON 배열만 반환하십시오. JSON 외의 산문, 마크다운, 설명은 포함하지 마십시오.

각 요소는 다음을 포함해야 합니다:
- "item_id": 평가 중인 항목의 식별자 (입력과 일치하는 문자열 또는 숫자)
- 루브릭에서 요청한 모든 필드 (점수, 개수 등)
- "ambiguous": 해당 항목을 자신 있게 평가할 수 없는 경우(예: 문맥 부족, 경계선상의 사례) true로 설정합니다. 모호하더라도 최선의 추측 점수를 제공하되 플래그를 표시하십시오.

출력 형식 예시 (루브릭에 맞게 필드 이름 조정):
[
  {"item_id": "cluster-42", "score": 4, "distinct_topics": 1, "outlier_count": 0, "ambiguous": false},
  {"item_id": "cluster-17", "score": 2, "distinct_topics": 3, "outlier_count": 2, "ambiguous": false},
  {"item_id": "cluster-99", "score": 3, "distinct_topics": 2, "outlier_count": 1, "ambiguous": true}
]

규칙:
- 각 항목을 독립적으로 평가하십시오.
- 이번 배치의 다른 항목 점수가 아닌, 루브릭을 기준으로 점수를 매기십시오.
- 항목이 비어 있거나 더 많아야 할 요소가 1개뿐인 경우, 현재 존재하는 내용을 바탕으로 점수를 매기십시오.
- 매우 큰 항목(요소가 많은 경우)은 대표적인 하위 집합에 집중하고, 품질이 항목 전체에서 달라지는지 기록하십시오.
- 배치의 모든 항목이 반드시 출력에 포함되어야 합니다.
</output-contract>
```

## 싱글톤 평가 템플릿 (Singleton Evaluation Template)

```
당신은 싱글톤 항목(현재 어떤 그룹/클러스터에도 속하지 않은 항목)을 평가하는 품질 심판입니다.

당신의 임무는 각 싱글톤이 기존 클러스터로 그룹화되었어야 했는지, 아니면 정말로 고유한지 판단하는 것입니다. 구조화된 JSON을 반환하십시오.

<rubric>
{singleton_rubric}
</rubric>

<singletons>
{singletons_json}
</singletons>

<existing-clusters>
참조를 위한 기존 클러스터 요약 (전체 내용이 아닌 제목/테마만):
{cluster_summaries}
</existing-clusters>

<output-contract>
유효한 JSON 배열만 반환하십시오. JSON 외의 산문, 마크다운, 설명은 포함하지 마십시오.

각 요소는 다음을 포함해야 합니다:
- "item_id": 싱글톤의 식별자
- 싱글톤 루브릭에서 요청한 모든 필드 (should_cluster, best_cluster_id, confidence 등)

출력 형식 예시 (루브릭에 맞게 필드 이름 조정):
[
  {"item_id": "issue-1234", "should_cluster": true, "best_cluster_id": "cluster-42", "confidence": 4},
  {"item_id": "issue-5678", "should_cluster": false, "best_cluster_id": null, "confidence": 5}
]

규칙:
- 기존 클러스터와 일치하는 항목이 전혀 없는 싱글톤은 should_cluster: false여야 합니다.
- 기존 클러스터에 명확히 속하는 싱글톤은 해당 클러스터 ID와 함께 should_cluster: true여야 합니다.
- 높은 신뢰도 (4-5)는 매우 확신함을 의미합니다. 낮은 신뢰도 (1-2)는 해당 항목이 경계선상에 있음을 의미합니다.
- 배치의 모든 싱글톤이 반드시 출력에 포함되어야 합니다.
</output-contract>
```

## 변수 참조 (Variable Reference)

| 변수 | 소스 | 설명 |
|----------|--------|-------------|
| `{rubric}` | Spec `metric.judge.rubric` | 사용자 정의 채점 루브릭 |
| `{items_json}` | 샘플링된 출력 항목 | 평가할 항목의 JSON 배열 (배치 한 번 분량) |
| `{singleton_rubric}` | Spec `metric.judge.singleton_rubric` | 싱글톤 평가를 위한 사용자 정의 루브릭 |
| `{singletons_json}` | 샘플링된 싱글톤 항목 | 평가할 싱글톤 항목의 JSON 배열 |
| `{cluster_summaries}` | 실험 출력 | 싱글톤 참조를 위한 기존 클러스터 요약 (제목/테마) |

## 참고 사항

- 기본적으로 Haiku 모델에 맞게 설계되었습니다. 프롬프트가 간결하고 작은 모델에 최적화된 구조입니다.
- 루브릭은 불변 측정 하네스의 일부입니다. 실험 에이전트는 이를 수정할 수 없습니다.
- 항목의 `ambiguous` 플래그는 오케스트레이터가 억지 점수를 강요하지 않고도 노이즈가 있는 평가를 식별하는 데 도움이 됩니다.
- 싱글톤 평가의 경우, 심판의 문맥을 가볍게 유지하기 위해 오케스트레이터는 클러스터 전체 내용이 아닌 요약 정보만 제공합니다.
- 각 서브에이전트는 하나의 배치를 독립적으로 평가합니다. 서브에이전트들은 서로의 결과를 알 수 없습니다.
