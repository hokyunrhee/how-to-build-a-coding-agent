# 블로그 글 정리: 코딩 에이전트 만들기 무료 워크샵

> **원문:** Geoffrey Huntley, [“how to build a coding agent: free workshop”](https://ghuntley.com/agent/), 2025년 8월 24일
>
> 이 문서는 원문을 그대로 옮긴 번역이 아닙니다. 원문의 저작권은 저자에게 있으므로, 글의 흐름을 따라 내용을 한국어로 정리하고 짧은 문구만 인용했습니다. 정확한 문장, 슬라이드, 데모 영상은 원문에서 확인하세요.
>
> 원문은 Go로 작성된 [ghuntley/how-to-build-a-coding-agent](https://github.com/ghuntley/how-to-build-a-coding-agent)를 사용합니다. 아래에서는 원문의 `go run <파일>.go`를 이 저장소의 `npx tsx <파일>.ts`로 바꿔 적었습니다.

---

## 1. 들어가며: 에이전트는 생각보다 단순하다

이 글은 컨퍼런스에서 두 번 진행한 워크샵을 글로 옮긴 것입니다. 저자는 요즘 누구나 “에이전트”라는 말을 쓰지만, 코딩 에이전트가 안에서 어떻게 돌아가는지 아는 사람은 많지 않다고 말합니다. 그래서 내부를 열어 보여 주고, 특별한 비결이 없다는 것(“there is no moat”)을 증명하겠다고 합니다.

글 전체를 관통하는 주장은 이것입니다.

- 코딩 에이전트를 만드는 일은 어렵지 않다.
- 코딩 에이전트는 **“300 lines of code running in a loop with LLM tokens”**, 즉 LLM 토큰을 쓰면서 루프를 도는 300줄 정도의 코드다.
- 루프에 토큰을 계속 넣어 주면 그것이 곧 에이전트다.

저자는 발표하는 동안 에이전트에게 에이전트를 만들라고 시켜 두고, 그사이 강연을 진행합니다. 사람이 다른 일을 하는 동안 AI가 동시에 작업하는 방식이 이미 일상이 되었다는 것을 보여 주려는 연출입니다. 회의에 들어가 있는 동안에도 에이전트가 일을 할 수 있다는 것이죠.

저자가 직접 만들어 보라고 권하는 이유는, 그 과정에서 AI를 **소비하는 사람**에서 AI로 일을 자동화하는 **만드는 사람**으로 바뀌기 때문입니다.

## 2. 왜 지금 배워야 하나

저자는 기술 업계를 계속 움직이는 컨베이어 벨트에 비유합니다. 개발자라면 기본 키(primary key)가 무엇인지 아는 것이 당연하듯, 2025년에는 에이전트의 루프가 무엇이고 어떻게 만드는지가 기본 지식이 되었다고 말합니다. 예로 Canva가 기술 면접에서 AI 사용을 허용하고 오히려 요구하게 된 사례를 듭니다.

슬라이드에는 절벽 그림이 나옵니다. 왼쪽에는 “증명해 봐”, “과장 아니야?”, “아직 부족해”라며 머무는 사람들이 있고, 오른쪽에는 이미 자기 업무를 자동화한 사람들이 있습니다. 저자의 견해는 이렇습니다. AI 때문에 생기는 일자리 문제는 AI 자체보다 자기 계발을 하지 않은 데서 온다. 동료들이 여러 에이전트를 동시에 돌리고 회의 중에도 백그라운드에서 일을 시키는데 나만 하지 않는다면 뒤처질 수밖에 없다.

저자는 Canva에서 개발 생산성 테크 리드로 일했고, 글을 쓸 무렵에는 Sourcegraph에서 코딩 에이전트 Amp를 만드는 작은 팀에 있었습니다.

이어서 Cursor, Windsurf, Claude Code, GitHub Copilot, Amp 같은 도구들도 결국 LLM 토큰으로 루프를 도는 적은 양의 코드일 뿐이라고 강조합니다. 무거운 일은 전부 **모델**이 합니다. 그러니 여러 제품을 비교 평가하느라 시간을 쓰기보다 직접 만들어 보라고 권합니다.

## 3. 핵심 개념 ①: 모든 LLM이 에이전트형은 아니다

자동차에도 험로용 오프로드 차와 사람을 태우는 승합차가 따로 있듯, LLM도 용도가 다릅니다. 저자는 모델의 성향을 네 칸짜리 사분면으로 나눕니다.

| 구분 | 설명 | 글에 나온 예 |
| --- | --- | --- |
| 낮은 안전성(low safety) | 보안 연구처럼 제약이 적어야 하는 일 | Grok |
| 높은 안전성(high safety) | 윤리 정렬을 중시 | Anthropic, OpenAI |
| 오라클(oracle) | 요약이나 깊은 사고가 필요한 일. 에이전트형의 정반대 | — |
| 에이전트형(agentic) | 도구 호출을 즐겨 하고 행동을 우선함 | Claude Sonnet, Kimi K2 |

저자는 Claude Sonnet을 “디지털 다람쥐”라고 부릅니다. 다람쥐가 도토리를 쫓듯 Sonnet은 도구 호출을 쫓습니다. 한 턴에 몇 분씩 고민하기보다 일단 행동하고, 조금씩 성공을 쌓아 가는 쪽으로 치우쳐 있습니다. 이 성향이 에이전트형 모델의 특징입니다.

많은 사람이 모델을 컨텍스트 윈도우 크기와 가격 두 가지로만 비교합니다. 저자는 이것이 차가 오프로드용인지 승합차인지는 보지 않고 문이 몇 개인지만 따지는 것과 같다고 말합니다.

그래서 **에이전트를 만드는 첫 단계는 에이전트 성향이 강한 모델을 고르는 것**입니다. 더 깊은 추론이나 작업 검토가 필요하다면, 다른 LLM을 에이전트형 LLM의 **도구로 연결**하면 됩니다. Amp의 “Oracle”은 GPT를 도구로 등록해 두고 Claude Sonnet이 조언, 진행 상황 점검, 조사와 계획이 필요할 때 호출하는 방식입니다.

## 4. 핵심 개념 ②: 컨텍스트 윈도우는 작다

**하나의 컨텍스트 윈도우는 하나의 작업에만 쓰세요.** 작업이 끝나면 컨텍스트를 비워야 합니다. 같은 세션에서 백엔드 API 컨트롤러를 만들고, 미어캣에 대해 조사하고, 이어서 웹사이트를 다시 디자인해 달라고 하면 웹사이트에 API나 미어캣 이야기가 섞여 들어가도 이상하지 않습니다. LLM의 결과물은 결국 그때까지 컨텍스트에 쌓아 둔 것 안에서 나오기 때문입니다.

저자는 컨텍스트 윈도우를 메모리가 적은 Commodore 64처럼 다루라고 합니다. **많이 할당할수록 결과와 성능이 나빠집니다.**

- 당시 Sonnet의 컨텍스트 윈도우는 200k로 알려져 있었지만, 모델의 시스템 프롬프트와 하네스(Cursor, Windsurf, Claude Code, Amp 등)가 먼저 일부를 차지하기 때문에 실제로 쓸 수 있는 양은 약 176k였습니다. (원문 주석에 따르면 그 뒤 Sonnet의 컨텍스트 윈도우는 1M으로 늘었습니다.)
- MCP(Model Context Protocol)는 “어떻게 호출하는지 설명이 붙은 함수”가 컨텍스트 윈도우에 할당되는 것이라고 생각하면 쉽습니다.
- 흔한 실수는 MCP 서버를 너무 많이 설치하거나, 서버 하나가 노출하는 도구 수와 전체 도구가 차지하는 양을 따져 보지 않는 것입니다. MCP 도구에만 76k 토큰을 쓰면 남는 것은 100k뿐입니다.

정리하면 “Less is more”, 적을수록 좋습니다.

## 5. 추론 루프

다시 백그라운드에서 만들어지고 있던 에이전트를 확인하면, 루프와 도구 호출이 보입니다. 원리는 다음과 같습니다.

> 사용자 입력이나 도구 실행 결과를 대화에 추가하고, 그 대화를 추론(inference)에 보낸다. 이것을 반복한다.

원문은 도구를 등록하기 전의 추론 루프를 시퀀스 다이어그램으로 보여 줍니다. 이 저장소에서는 `chat.ts`의 `Agent.run()`과 `runInference()`가 이 루프이고, [README.md](README.md)의 “동작 방식” 다이어그램이 같은 흐름을 그린 것입니다.

## 6. 1단계 `chat.ts`: 도구 없이 도구 흉내 내기

```bash
npx tsx chat.ts
```

먼저 도구가 하나도 없는 기본 채팅 프로그램을 실행합니다. 그리고 [`prompts/00-weather.md`](prompts/00-weather.md)의 문장을 입력해, 모델에게 날씨 전문가 역할을 맡깁니다. 내용은 “날씨를 물으면 `get_weather(<지역 이름>)` 형태로 답하라. 그러면 내가 날씨를 알려 주겠다”입니다.

그다음 멜버른의 날씨를 물으면 모델은 `get_weather(Melbourne, Australia)`라고만 답합니다. 아직 아무 일도 하지 않는 가짜 도구지만, 모델이 질문에서 매개변수를 뽑아 함수 호출 모양으로 내놓는다는 것을 확인할 수 있습니다.

여기서 저자는 두 가지를 설명합니다.

- **에이전트형이란** 도구를 호출하도록, 즉 보상 함수가 도구 호출을 향하도록 훈련된 모델을 뜻합니다. 다람쥐가 도토리를 쫓듯, 이런 모델은 도구를 쫓습니다.
- **도구(또는 MCP)란** 결국 LLM의 잠재 공간(latent space)을 건드려 그 함수를 호출하게 만드는 “광고판을 단 함수(a function with a billboard on top)”입니다. 도구를 등록하고 호출 방법을 설명해 두면 그냥 동작합니다.

이제 가짜 도구를 진짜로 바꿀 차례입니다. 추론 루프를 고쳐서 ① 모델이 도구를 실행하려는지 확인하고, ② 그렇다면 도구를 실행하고, ③ 그 결과를 다시 대화에 추가해 추론을 이어 가게 합니다. 원문은 도구가 등록된 뒤의 시퀀스 다이어그램을 보여 주며, 이것이 **UI를 뺀 가장 순수한 형태의 코딩 에이전트**라고 말합니다. 이 저장소에서는 `read.ts`부터 `runInference()`에 `tools`를 넘기고, `run()` 안의 내부 루프가 `tool_use` 블록을 처리합니다.

날씨 앱을 만드는 것은 아니니, 이제부터 코딩 에이전트의 기본 요소(primitive)를 하나씩 만듭니다.

## 7. 기본 요소 ① `read_file` — `read.ts`

모든 코딩 에이전트에는 파일을 읽어 컨텍스트 윈도우에 넣는 도구가 있습니다. 큰 파일은 여러 조각으로 나눠 읽기도 합니다.

도구 정의는 이름, 설명, 입력 스키마, 함수로 이뤄집니다. 원문은 Go 구조체를 보여 주지만, 이 저장소에서는 `read.ts`의 `ReadFileDefinition`이 같은 역할을 하고 설명 문구도 원문과 같습니다.

```bash
npx tsx read.ts
```

실습에는 저장소에 들어 있는 [`riddle.txt`](riddle.txt)(답이 “말”인 수수께끼)와 [`prompts/01-read_file.md`](prompts/01-read_file.md)의 질문을 씁니다. 모델은 스스로 `read_file`을 호출해 파일을 읽은 뒤 수수께끼를 풀고, 단서 하나하나가 왜 말을 가리키는지 설명합니다. 터미널에는 대략 이런 줄이 찍힙니다.

```text
tool: read_file({"path":"riddle.txt"})
Reading file: riddle.txt
Successfully read file riddle.txt (175 bytes)
result: (riddle.txt 내용)
```

## 8. 기본 요소 ② `list_files` — `list_files.ts`

모든 코딩 에이전트에는 주어진 경로의 파일과 디렉터리를 나열하는 도구도 있습니다.

```bash
npx tsx list_files.ts
```

[`prompts/02-list_files.md`](prompts/02-list_files.md)처럼 “이 폴더에 어떤 파일이 있는지”와 “`riddle.txt`의 내용”을 한 번에 물으면, 모델은 먼저 `list_files`를 호출해 목록을 확인하고 이어서 `read_file`로 파일을 읽습니다.

```text
tool: list_files({})
Listing files in directory: .
Successfully listed N items in .
```

이 단계의 핵심은 **하나의 프롬프트에서 여러 도구가 이어서 호출된다**는 점입니다.

## 9. 기본 요소 ③ `bash` — `bash_tool.ts`

세 번째 기본 요소는 이름 그대로 LLM이 컴퓨터에서 명령을 실행하게 해 주는 bash 도구입니다.

```bash
npx tsx bash_tool.ts
```

[`prompts/03-bash_tool.md`](prompts/03-bash_tool.md)처럼 실행 중인 프로세스를 요약해 달라고 하면, 모델은 `ps aux`를 실행하고 그 출력을 바탕으로 CPU 수, init 시스템, 가동 시간 같은 시스템 요약을 내놓습니다.

```text
tool: bash({"command":"ps aux"})
Executing bash command: ps aux
Bash command succeeded: ps aux (output: N bytes)
```

## 10. 기본 요소 ④ `edit_file` — `edit_tool.ts`

네 번째 기본 요소는 추론 결과를 받아 파일에 편집을 적용하는 편집 도구입니다. (원문 본문에는 `go run edit_file.go`라고 적혀 있지만, 실제 파일 이름은 `edit_tool.go`이고 이 저장소에서는 `edit_tool.ts`입니다.)

```bash
npx tsx edit_tool.ts
```

[`prompts/04-edit_tool.md`](prompts/04-edit_tool.md)처럼 Node.js로 실행할 수 있는 `fizzbuzz.js`를 만들고 실행까지 해 달라고 하면, 모델은 다음 순서로 일합니다.

1. `edit_file`에 `old_str`을 빈 문자열로, `new_str`에 파일 전체 내용을 넣어 호출합니다. 파일이 없으므로 새로 만들어집니다.
2. `read_file`로 파일이 제대로 만들어졌는지 확인합니다.
3. `bash`로 `node fizzbuzz.js`를 실행해 결과를 확인합니다.
4. 3과 5의 배수가 Fizz, Buzz, FizzBuzz로 바뀌었는지 설명합니다.

```text
Editing file: fizzbuzz.js (replacing 0 chars with N chars)
File does not exist, creating new file: fizzbuzz.js
Creating new file: fizzbuzz.js (N bytes)
Successfully created file fizzbuzz.js
...
Executing bash command: node fizzbuzz.js
Bash command executed successfully, output length: N chars
```

저자는 여기까지 오면 **코딩 에이전트가 완성된 것**이라고 말합니다. 이제 “FizzBuzz를 100까지 해 줘” 같은 다른 프롬프트를 넣어도 그냥 동작합니다.

## 11. 기본 요소 ⑤ `code_search` — `code_search_tool.ts`

다섯 번째이자 마지막 기본 요소는 검색 도구입니다. 저자는 소스 코드 인덱싱에 마법이나 특별한 지능은 없다고 말합니다. 지금 나와 있는 코딩 도구 대부분이 내부에서 오픈 소스 [`ripgrep`](https://github.com/BurntSushi/ripgrep) 바이너리를 쓴다는 것이죠. 근거로 저자가 Amazon Kiro 소스를 분석한 글 등을 소개합니다.

```bash
npx tsx code_search_tool.ts
```

원문의 실습 질문은 “소스 코드에서 수수께끼를 찾아 줘(Search the source code for a riddle)”입니다. 모델은 다음 순서로 도구를 씁니다.

1. `code_search`로 `riddle`을 검색해 README에서 `riddle.txt`에 대한 언급을 찾습니다.
2. `list_files`로 파일이 실제로 있는지 확인합니다.
3. `read_file`로 수수께끼를 읽습니다.

```text
tool: code_search({"pattern":"riddle"})
Searching for pattern: riddle
Found N matches for pattern: riddle
```

## 12. 그다음: 하네스 프롬프트

여기부터는 프롬프트를 다듬는 일만 남았다고 저자는 말합니다. 시간 관계상 워크샵에서는 **하네스 프롬프트(harness prompt)**를 다루지 않았습니다. 하네스 프롬프트에는 다음과 같은 내용이 들어갑니다.

- 도구 등록 정보
- 실행 중인 운영체제. 그래야 모델이 PowerShell(Windows)과 bash(Linux, macOS) 중 무엇을 쓸지 압니다.
- 에이전트가 어떻게 동작해야 하는지에 대한 지침

“해야 한다(should)”라고 쓰는 이유는 LLM이 비결정적이기 때문입니다. 지침은 어디까지나 지침입니다. 다만 프롬프트를 평가하고 다듬으며 모델의 습성을 익히다 보면 효과적인 프롬프트를 만들 수 있습니다. (이 워크샵의 코드에는 원본과 마찬가지로 시스템 프롬프트가 없습니다.)

더 살펴볼 자료로 저자는 다음을 소개합니다.

- 완성된 코딩 에이전트의 예: 저자의 Amazon Kiro 소스 분석 글
- 오픈 소스 코딩 에이전트: [sst/opencode](https://github.com/sst/opencode)
- 100줄짜리 에이전트로 SWE-bench에서 높은 점수를 낸 [SWE-agent/mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent)
- 여러 개발 도구의 하네스와 도구 프롬프트를 모아 둔 GitHub 저장소들

## 13. 정리

지금 만든 것은 코딩 에이전트입니다. 하지만 꼭 코딩 에이전트일 필요는 없습니다. 예를 들어 데이터 엔지니어라면, 매일 하는 일 가운데 이 기본 요소들로 자동화할 수 있는 것은 무엇인지, 그것이 회사에 어떤 가치가 있을지 생각해 보라고 저자는 권합니다.

저자의 마지막 메시지는 이렇습니다. 일자리를 가져가는 것은 AI가 아니라 AI를 쓰는 동료다. AI가 걱정된다면 답은 간단하다. 자신에게 투자하라. 그리고 “Go forward and build.”

---

## 부록: 원문과 이 저장소의 대응

| 원문 (Go) | 이 저장소 (TypeScript) | 다루는 개념 |
| --- | --- | --- |
| `go run chat.go` | `npx tsx chat.ts` | 추론 루프, 도구 없이 도구 흉내 (`prompts/00-weather.md`) |
| `go run read.go` | `npx tsx read.ts` | 기본 요소 ① `read_file` (`prompts/01-read_file.md`) |
| `go run list_files.go` | `npx tsx list_files.ts` | 기본 요소 ② `list_files`, 도구 연쇄 호출 (`prompts/02-list_files.md`) |
| `go run bash_tool.go` | `npx tsx bash_tool.ts` | 기본 요소 ③ `bash` (`prompts/03-bash_tool.md`) |
| `go run edit_file.go` (실제 파일은 `edit_tool.go`) | `npx tsx edit_tool.ts` | 기본 요소 ④ `edit_file` (`prompts/04-edit_tool.md`) |
| `go run code_search_tool.go` | `npx tsx code_search_tool.ts` | 기본 요소 ⑤ `code_search` (ripgrep) |
| Go 구조체로 입력 스키마 생성 | Zod 스키마로 입력 스키마 생성 | 도구 정의 = 이름 + 설명 + 스키마 + 함수 |

원문은 에이전트형 모델로 Claude Sonnet을 권합니다. 원본 저장소의 코드는 Claude Opus 4.6을 쓰고, 이 저장소는 `claude-opus-5-5`를 씁니다.
