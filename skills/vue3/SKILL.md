---
name: vue3
description: 사용자가 UI 스크린샷 또는 디자인 내보내기 파일을 Vue 3 컴포넌트로 일괄 변환해야 할 때 사용합니다. 특히 Vant, Element Plus, Ant Design Vue와 함께 사용.
origin: community
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# UI to Vue

UI 디자인 스크린샷을 Vue 3 Composition API 컴포넌트 코드로 일괄 변환합니다.

## 사용 시점

- 사용자가 디자인 스크린샷 또는 디자인 내보내기 이미지가 있는 디렉토리를 제공하는 경우
- 대상 애플리케이션이 Vue 3인 경우
- 사용자가 페이지 컴포넌트, 공유 컴포넌트, 라우터 연결에 대한 1차 초안을 원하는 경우
- 사용자가 Vant, Element Plus, 또는 Ant Design Vue를 컴포넌트 라이브러리로 지정한 경우

## 사용하지 않아야 할 때

- 사용자에게 스크린샷이 하나뿐이고 맞춤형 컴포넌트를 원하는 경우
- 대상 프로젝트가 Vue가 아닌 경우
- 디자인에 세부적인 인터랙션 로직, 데이터 흐름, 또는 접근성 검토가 필요한 경우
- 스크린샷에 외부 모델 API로 전송할 수 없는 개인 고객 데이터가 포함된 경우

## 입력값

모듈과 페이지 상태별로 스크린샷을 그룹화한 입력 디렉토리를 사용하십시오:

```text
screenshots/
|-- HomePage/
|   |-- List/
|   |   |-- HomePage-List-Default@3x.png
|   |   `-- cut-images/
|   |-- cut-images/
|   `-- HomePage-Default@3x.png
`-- cut-images/
```

지원되는 컷 이미지 디렉토리 이름: `assets`, `icons`, `sprites`, `cut`, `images`, `cut-images`.

## 변환 모델

- 페이지 그룹화: 목록, 상세, 폼(form), 로딩, 빈 상태를 나타내는 관련 스크린샷은 하나의 페이지 컴포넌트로 결합합니다.
- UI 라이브러리 매핑: 실용적인 경우 기본 시각적 요소를 Vant, Element Plus, 또는 Ant Design Vue 컴포넌트로 매핑합니다.
- 컷 이미지 우선순위: 페이지 수준 에셋 → 모듈 수준 에셋 → 전역 공유 에셋 순으로 사용합니다.
- 컴포넌트 추출: UI 영역이 두 번 이상 나타나는 경우 공유 컴포넌트로 추출합니다.

## CLI 사용법

문서화된 명령어가 전역 바이너리 없이도 작동하도록 `npx`를 사용하십시오:

```bash
export DASHSCOPE_API_KEY=your_key
npx ui-to-vue-converter@1.0.2 --input ./screenshots --ui vant --output ./src
```

데스크탑 UI 라이브러리의 경우:

```bash
npx ui-to-vue-converter@1.0.2 --input ./designs --ui element-plus --output ./src
npx ui-to-vue-converter@1.0.2 --input ./designs --ui antd-vue --output ./src
```

패키지가 전역으로 설치된 경우 `ui-to-vue` 바이너리를 직접 사용할 수 있습니다:

```bash
npm install -g ui-to-vue-converter@1.0.2
ui-to-vue --input ./screenshots --ui vant --output ./src
```

## 옵션

| 옵션 | 설명 | 기본값 |
| --- | --- | --- |
| `--input` | 디자인 이미지 디렉토리 | `./screenshots` |
| `--ui` | UI 라이브러리: `vant`, `element-plus`, 또는 `antd-vue` | `vant` |
| `--output` | 출력 디렉토리 | `./src` |
| `--config` | 설정 파일 경로 | `./.ui-to-vue.config.json` |

## API 키 처리

변환기는 설정 파일 또는 환경 변수에서 DashScope 자격 증명을 읽을 수 있습니다. 저장소에서는 환경 변수를 선호하십시오:

```bash
export DASHSCOPE_API_KEY=your_key
```

로컬 설정 파일이 필요한 경우 버전 관리에 포함하지 마십시오:

```json
{
  "apiKey": "your_dashscope_key",
  "input": "./designs",
  "ui": "vant",
  "output": "./src"
}
```

```gitignore
.ui-to-vue.config.json
```

## 보안 및 프라이버시

- 디자인 스크린샷은 외부 모델 API로 전송될 수 있는 소스 자료로 취급하십시오.
- 허락 없이 개인 고객 디자인에 이 플로우를 실행하지 마십시오.
- 반복 가능한 워크플로우에서는 `@latest` 대신 변환기 버전을 고정하십시오.
- 커밋 전에 생성된 Vue 코드를 검토하십시오.
- `.ui-to-vue.config.json`, API 키, 생성된 시크릿, 또는 고객 스크린샷은 커밋하지 마십시오.

## 출력 검토 체크리스트

- [ ] 페이지 컴포넌트가 `views/` 또는 선택한 출력 디렉토리 아래에 생성되었는가
- [ ] 재사용이 명확한 경우에만 반복 UI 영역이 `components/`로 추출되었는가
- [ ] 라우터 출력이 대상 프로젝트의 라우터 스타일과 호환되는가
- [ ] 생성된 컴포넌트가 요청된 UI 라이브러리를 일관되게 사용하는가
- [ ] 생성된 CSS 단위가 디자인 기준선과 일치하는가
- [ ] 코드가 프로젝트의 포매터, 린터, 타입 체커, 빌드를 통과하는가
- [ ] 플레이스홀더 텍스트, 목 데이터, 생성된 에셋이 커밋 전에 검토되었는가

## 문제 해결

| 문제 | 확인 사항 |
| --- | --- |
| `401` 또는 인증 오류 | 명령어를 실행하는 셸에 `DASHSCOPE_API_KEY`가 설정되어 있는지 확인하십시오. |
| `command not found: ui-to-vue` | `npx ui-to-vue-converter@1.0.2` 형식을 사용하거나 패키지를 전역으로 설치하십시오. |
| 컷 이미지가 무시됨 | 에셋 디렉토리 이름이 지원되는 이름이고 해당 페이지 또는 모듈 아래에 중첩되어 있는지 확인하십시오. |
| 컴포넌트가 요청된 UI 라이브러리를 무시함 | 명시적인 `--ui` 값으로 다시 실행하고 생성된 임포트를 검사하십시오. |
| 생성된 레이아웃 크기가 잘못됨 | 스크린샷 내보내기 너비가 대상 라이브러리 기준선과 일치하는지 확인하십시오. |

## 참고

- npm 패키지: `ui-to-vue-converter`
