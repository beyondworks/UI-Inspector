import { useState, useEffect, useCallback, useRef } from "react";
import { wsClient } from "./ws-client";

export interface ElementInfo {
  tag: string;
  className: string;
  textContent: string;
  boundingRect: DOMRect;
  computedStyles: Record<string, string>;
  sourceLocation: { file: string; line: number; column: number } | null;
  parentChain: string[];
  innerHTML: string;
  uiTerm: string;
  uiDescription: string;
}

/* ── Design Glossary ─────────────────────────────────────────────── */

const UI_GLOSSARY: Record<string, string> = {
  // Structure
  "Header":            "페이지 최상단 영역. 브랜드 로고, 내비게이션, 검색, 사용자 메뉴 등 전역 요소를 배치",
  "Footer":            "페이지 최하단 영역. 저작권, 부가 링크, 연락처 등 보조 정보를 제공",
  "Main Content":      "페이지의 핵심 콘텐츠가 위치하는 주 영역. 보조 요소와 구분되어 사용자 시선을 집중시킴",
  "Sidebar":           "메인 콘텐츠 옆의 보조 영역. 필터, 서브 메뉴, 관련 콘텐츠 등을 배치하여 탐색을 지원",
  "Section":           "주제별로 구분된 콘텐츠 블록. 시각적 구분과 의미적 그룹핑에 사용",
  "Article":           "독립적으로 완결된 콘텐츠 단위. 블로그 포스트, 뉴스 기사, 댓글 등 재사용 가능한 단위",
  "Divider":           "콘텐츠 간 시각적 경계를 만드는 구분선. 정보 계층 구조를 명확히 전달",

  // Navigation
  "Navigation":        "사이트 주요 페이지로 이동하는 탐색 영역. 정보 구조(IA)를 사용자에게 노출",
  "Navigation Bar":    "화면 상단/측면에 고정된 주 내비게이션. 로고, 메뉴 항목, 글로벌 액션을 포함",
  "Sticky Header":     "스크롤해도 상단에 고정되는 헤더. 항상 접근 가능한 탐색 경험을 제공 (position: sticky/fixed)",
  "Breadcrumb":        "현재 페이지의 위치를 계층적 경로로 표시. '홈 > 카테고리 > 현재 페이지' 형태로 방향 감각 제공",
  "Tabs":              "같은 영역에서 여러 콘텐츠 뷰를 전환하는 인터페이스. 관련 정보를 공간 효율적으로 구성",
  "Tab List":          "탭 버튼들이 나열된 컨테이너. 현재 선택된 탭을 시각적으로 강조하여 위치 인지 지원",
  "Tab Panel":         "탭 선택에 따라 표시되는 콘텐츠 영역. 한 번에 하나의 패널만 활성화",
  "Pagination":        "대량의 콘텐츠를 페이지 단위로 나누어 탐색. 사용자가 데이터 양을 예측할 수 있게 돕는 패턴",
  "Menu":              "실행 가능한 옵션 목록. 클릭하면 해당 액션이 수행되거나 하위 메뉴가 펼쳐짐",
  "Menu Bar":          "수평으로 나열된 최상위 메뉴. 데스크톱 앱 스타일의 계층적 명령 접근 구조",

  // Content Containers
  "Card":              "관련 정보를 시각적으로 그룹화하는 컨테이너. 둥근 모서리와 그림자(elevation)로 표면을 분리하여 스캔 용이성 제공",
  "Hero Section":      "페이지 첫 화면의 주목도 높은 대형 영역. 핵심 메시지, 비주얼, CTA를 배치하여 첫인상을 결정",
  "Panel":             "특정 기능이나 정보를 담는 구획된 영역. 접거나 펼칠 수 있는 보조 콘텐츠 패널",
  "Widget":            "독립적인 기능 단위의 작은 UI 모듈. 대시보드에서 KPI, 차트, 알림 등을 모듈식으로 배치",
  "Dashboard":         "여러 위젯과 데이터를 한 화면에 종합한 대시보드. 핵심 지표를 한눈에 파악할 수 있는 개요 화면",
  "Metric Card":       "KPI나 주요 수치를 강조 표시하는 카드. 숫자, 레이블, 변화량(delta)을 간결하게 전달",

  // Interactive
  "Button":            "클릭/탭으로 액션을 실행하는 인터랙티브 요소. 시각적 어포던스(누를 수 있음을 암시)를 제공",
  "Call to Action":    "사용자의 핵심 행동을 유도하는 강조된 버튼이나 링크. 색상, 크기, 위치로 시각적 우선순위를 부여 (CTA)",
  "Link":              "다른 페이지나 리소스로 이동하는 텍스트 기반 내비게이션. 밑줄, 색상으로 클릭 가능함을 표현",
  "Dropdown":          "클릭 시 옵션 목록이 펼쳐지는 선택 메뉴. 공간을 절약하면서 다수의 옵션을 제공",
  "Toggle Switch":     "켜기/끄기 두 상태를 전환하는 스위치. 설정 변경이 즉시 적용됨을 암시하는 패턴",
  "Checkbox":          "여러 옵션 중 복수 선택이 가능한 컨트롤. 독립적인 on/off 상태를 가짐",
  "Radio Button":      "상호 배타적인 옵션 중 하나만 선택하는 컨트롤. 같은 그룹 내 다른 선택지와 연동",
  "Slider":            "드래그로 범위 내 값을 선택하는 컨트롤. 볼륨, 밝기, 가격 범위 등 연속 값에 적합",
  "Search":            "키워드로 콘텐츠를 찾는 검색 인터페이스. 자동완성, 필터, 결과 미리보기와 연동 가능",
  "Filter":            "조건을 설정하여 콘텐츠를 걸러내는 컨트롤. 사용자가 원하는 데이터에 빠르게 접근하도록 지원",

  // Form
  "Form":              "사용자 입력을 수집하는 양식. 레이블, 필드, 유효성 검증, 제출 버튼으로 구성된 데이터 수집 패턴",
  "Input Field":       "텍스트, 숫자 등 단일 값을 입력받는 필드. 플레이스홀더와 레이블로 기대 입력을 안내",
  "Text Area":         "여러 줄의 텍스트를 입력받는 확장 필드. 댓글, 설명 등 장문 입력에 사용",
  "Select Dropdown":   "미리 정의된 옵션 중 하나를 선택하는 드롭다운. 5개 이상의 옵션이 있을 때 라디오보다 효율적",
  "Search Input":      "검색어 입력 전용 필드. 돋보기 아이콘, 자동완성, 검색 기록 등 탐색 특화 기능 포함",
  "Password Field":    "비밀번호 입력 필드. 입력 내용을 마스킹하고 보기/숨기기 토글을 제공",
  "Email Field":       "이메일 주소 입력 필드. 모바일에서 @ 키보드 레이아웃을 자동 표시",
  "Number Field":      "숫자 값 입력 필드. 증감 버튼(stepper)과 범위 제한을 제공",
  "Date Picker":       "날짜를 선택하는 캘린더 기반 컨트롤. 직접 입력보다 오류율이 낮은 날짜 입력 패턴",
  "Color Picker":      "색상을 시각적으로 선택하는 컨트롤. 팔레트, 스펙트럼, 코드 입력을 결합",
  "File Upload":       "파일을 선택하거나 드래그&드롭으로 업로드하는 영역",
  "Submit Button":     "양식 데이터를 서버에 전송하는 제출 버튼. 폼의 최종 액션",
  "Reset Button":      "양식 입력을 초기 상태로 되돌리는 버튼. 파괴적 액션이므로 신중하게 배치",
  "Label":             "입력 필드의 목적을 설명하는 텍스트. 접근성(a11y)을 위해 필드와 반드시 연결",

  // Data Display
  "Data Table":        "구조화된 데이터를 행과 열로 정리하여 표시. 정렬, 필터, 페이지네이션과 함께 사용",
  "Table Header":      "테이블 열의 제목 행. 데이터 유형을 명시하고 정렬 기능의 진입점 역할",
  "Table Body":        "테이블의 데이터 행 영역. 각 행은 하나의 데이터 레코드를 표현",
  "Table Row":         "테이블의 한 행. 하나의 레코드나 항목의 속성들을 가로로 나열",
  "Column Header":     "테이블 열의 제목 셀. 해당 열 데이터의 의미를 정의",
  "Table Cell":        "테이블의 개별 데이터 셀. 행(레코드)과 열(속성)의 교차점",
  "Chart":             "데이터를 시각적 그래프로 변환하여 추세, 비교, 분포를 직관적으로 전달",
  "Badge":             "상태, 카운트, 카테고리를 작은 라벨로 표시하는 보조 인디케이터. 주로 아이콘이나 텍스트 옆에 부착",
  "Progress Bar":      "작업 진행률을 시각적으로 표현하는 바. 확정적(deterministic) 또는 불확정적(indeterminate) 형태",
  "Status Indicator":  "시스템이나 항목의 현재 상태를 표시하는 인디케이터. 색상 코드로 상태를 즉시 전달",
  "Chip":              "필터 조건, 태그, 선택 항목을 작은 알약 형태로 표시. 추가/제거가 가능한 인터랙티브 라벨",

  // Overlay & Feedback
  "Modal":             "현재 화면 위에 떠서 사용자 주의를 집중시키는 대화 상자. 백드롭으로 배경을 비활성화하여 포커스 트랩 생성",
  "Dialog":            "사용자 확인이나 추가 입력을 요청하는 팝업 창. 모달과 유사하나 더 간결한 의사결정 UI",
  "Toast":             "화면 모서리에 잠시 나타났다 사라지는 알림. 비파괴적(non-blocking)이며 자동 소멸",
  "Alert":             "중요한 정보나 경고를 눈에 띄게 전달하는 인라인 배너. 색상으로 심각도(info/warning/error)를 구분",
  "Popover":           "특정 요소를 클릭하면 근처에 나타나는 보조 정보 풍선. 툴팁보다 풍부한 콘텐츠를 담을 수 있음",
  "Tooltip":           "마우스 호버 시 나타나는 짧은 설명 텍스트. 아이콘이나 축약 UI의 의미를 보충 설명",
  "Drawer":            "화면 가장자리에서 슬라이드 인되는 패널. 내비게이션이나 상세 정보를 임시로 표시하고 닫을 수 있음",
  "Overlay":           "배경을 반투명하게 덮어 뒤 콘텐츠와 시각적으로 분리. 모달, 드로어의 백드롭 역할",
  "Loader":            "콘텐츠 로딩 중임을 시각적으로 알리는 표시. 스피너, 프로그레스 바, 스켈레톤 등 다양한 형태",
  "Skeleton Loader":   "콘텐츠 로딩 중 실제 레이아웃과 유사한 회색 뼈대를 표시. 체감 로딩 시간을 줄이는 지각적 성능 패턴",

  // Media & Visual
  "Image":             "시각적 콘텐츠를 표시하는 요소. alt 텍스트로 접근성을 보장하고, 지연 로딩으로 성능을 최적화",
  "Icon":              "의미를 함축적으로 전달하는 작은 심볼 그래픽. 텍스트 레이블과 함께 사용하면 인지 속도를 높임",
  "Avatar":            "사용자나 엔티티를 대표하는 프로필 이미지. 이미지 없으면 이니셜이나 기본 아이콘으로 폴백",
  "Logo":              "브랜드 아이덴티티를 대표하는 심볼이나 워드마크. 보통 좌상단에 위치하며 홈 링크 역할 겸용",
  "Carousel":          "좌우 슬라이드로 여러 콘텐츠를 순환 표시하는 회전 UI. 자동 재생, 인디케이터, 내비게이션 화살표 포함",
  "Video Player":      "영상 콘텐츠를 재생하는 미디어 플레이어. 재생/일시정지, 볼륨, 전체화면 컨트롤을 제공",
  "Canvas":            "프로그래밍으로 그래픽을 렌더링하는 영역. 차트, 게임, 이미지 편집기 등에 사용",
  "Embedded Frame":    "외부 콘텐츠를 현재 페이지 안에 삽입하는 프레임. 지도, 비디오, 외부 위젯 등을 임베드",

  // Typography
  "Heading 1":         "페이지의 최상위 제목 (h1). 한 페이지에 하나만 사용하며 콘텐츠 주제를 명확히 선언",
  "Heading 2":         "주요 섹션 제목 (h2). 콘텐츠를 큰 단위로 구분하는 2단계 계층",
  "Heading 3":         "하위 섹션 제목 (h3). h2 아래의 세부 주제를 구분하는 3단계 계층",
  "Heading 4":         "세부 항목 제목 (h4). 상세 내용의 소제목으로 깊은 계층 구조를 표현",
  "Heading 5":         "보조 제목 (h5). 드물게 사용되며 매우 세분화된 콘텐츠 구조에서 활용",
  "Heading 6":         "최하위 제목 (h6). 가장 작은 단위의 콘텐츠 그룹핑에 사용",
  "Paragraph":         "본문 텍스트 블록. 적절한 줄 간격(line-height 1.5~1.75)과 문단 간격으로 가독성 확보",
  "Text Block":        "독립적인 텍스트 콘텐츠 영역. 레이블, 설명, 캡션 등 다양한 텍스트 역할 수행",

  // List
  "Unordered List":    "순서 없는 항목 나열. 불릿 포인트로 동등한 수준의 항목들을 구분",
  "Ordered List":      "순서가 있는 항목 나열. 번호를 매겨 단계, 순위, 절차를 표현",
  "List":              "항목을 세로로 나열하는 목록. 일관된 레이아웃으로 스캔 효율성을 높임",
  "List Item":         "목록의 개별 항목. 텍스트, 아이콘, 액션 버튼 등을 조합하여 구성",
  "Feed":              "시간순으로 업데이트되는 콘텐츠 스트림. 소셜 피드, 뉴스 피드 등 무한 스크롤과 결합",

  // Layout
  "Container":         "자식 요소들을 감싸는 레이아웃 박스. 최대 너비, 정렬, 패딩으로 콘텐츠 흐름을 제어",
  "Grid Layout":       "2차원 격자 기반 레이아웃 (CSS Grid). 행과 열을 동시에 제어하여 복잡한 배치를 구현",
  "Flex Container":    "1차원 유연 레이아웃 (Flexbox). 자식 요소를 가로/세로 축으로 정렬, 간격, 비율 조절",
  "Stack Layout":      "수직으로 쌓이는 레이아웃 (flex-direction: column). 요소 간 일정한 gap을 유지",
  "Scrollable Area":   "고정 높이/너비 안에서 스크롤로 콘텐츠를 탐색하는 영역 (overflow: auto/scroll)",
  "Block":             "기본 블록 레벨 요소. 새 줄에서 시작하며 가용 너비를 차지",
  "Wrapper":           "단일 자식을 감싸는 중간 요소. 스타일링이나 이벤트 핸들링을 위한 구조적 래퍼",

  // Misc
  "Accordion":         "클릭으로 콘텐츠를 펼치거나 접는 섹션. 점진적 공개(progressive disclosure)로 정보 과부하를 방지",
  "Accordion Trigger": "아코디언을 열고 닫는 클릭 가능한 헤더. 화살표 아이콘으로 펼침 상태를 표시",
  "Timeline":          "시간 순서로 이벤트를 시각적으로 나열. 활동 내역, 프로젝트 진행 상황 표시에 활용",
  "Stepper":           "다단계 프로세스의 진행 상태를 단계별로 표시. 현재 위치와 남은 단계를 한눈에 파악",
  "Toolbar":           "관련 액션 버튼들을 모은 가로 바. 에디터, 뷰어 등에서 빠른 도구 접근 제공",
  "Banner":            "페이지 상단에 위치하는 전폭(full-width) 알림 영역. 공지, 프로모션, 시스템 메시지 전달",
  "Profile":           "사용자 정보를 표시하는 영역. 아바타, 이름, 역할, 액션 버튼 등을 조합",
  "Grid":              "ARIA grid 역할. 키보드 내비게이션이 가능한 2차원 인터랙티브 데이터 격자",
  "Tree View":         "계층적 데이터를 트리 구조로 표시. 폴더/파일, 조직도, 카테고리 탐색에 사용",
  "Listbox":           "키보드 탐색이 가능한 선택 목록. 드롭다운 내부나 독립 컴포넌트로 사용",
};

/* ── Term Inference ──────────────────────────────────────────────── */

const TAG_TERMS: Record<string, string> = {
  nav: "Navigation", header: "Header", footer: "Footer", main: "Main Content",
  aside: "Sidebar", section: "Section", article: "Article", form: "Form",
  table: "Data Table", thead: "Table Header", tbody: "Table Body",
  tr: "Table Row", th: "Column Header", td: "Table Cell",
  button: "Button", a: "Link", img: "Image", svg: "Icon",
  video: "Video Player", canvas: "Canvas", iframe: "Embedded Frame",
  ul: "Unordered List", ol: "Ordered List", li: "List Item",
  h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
  h4: "Heading 4", h5: "Heading 5", h6: "Heading 6",
  p: "Paragraph", label: "Label", dialog: "Dialog",
  details: "Accordion", summary: "Accordion Trigger",
  progress: "Progress Bar", select: "Select Dropdown",
  textarea: "Text Area", input: "Input Field",
};

const ROLE_TERMS: Record<string, string> = {
  navigation: "Navigation", banner: "Banner", search: "Search",
  dialog: "Dialog", alert: "Alert", tablist: "Tab List", tab: "Tabs",
  tabpanel: "Tab Panel", menu: "Menu", menubar: "Menu Bar",
  toolbar: "Toolbar", tooltip: "Tooltip", progressbar: "Progress Bar",
  slider: "Slider", switch: "Toggle Switch", checkbox: "Checkbox",
  radio: "Radio Button", grid: "Grid", tree: "Tree View",
  status: "Status Indicator", feed: "Feed", listbox: "Listbox",
};

const CLASS_PATTERNS: [RegExp, string][] = [
  [/\bhero\b/, "Hero Section"], [/\bcard\b/, "Card"], [/\bmodal\b/, "Modal"],
  [/\bdrawer\b/, "Drawer"], [/\bsidebar\b/, "Sidebar"], [/\btoolbar\b/, "Toolbar"],
  [/\bbadge\b/, "Badge"], [/\bavatar\b/, "Avatar"], [/\bchip\b/, "Chip"],
  [/\bbreadcrumb\b/, "Breadcrumb"], [/\bpagination\b/, "Pagination"],
  [/\balert\b/, "Alert"], [/\btoast\b/, "Toast"], [/\bspinner\b|\bloading\b/, "Loader"],
  [/\baccordion\b/, "Accordion"], [/\btabs?\b/, "Tabs"],
  [/\bdropdown\b/, "Dropdown"], [/\bpopover\b/, "Popover"], [/\btooltip\b/, "Tooltip"],
  [/\bcarousel\b|\bswiper\b/, "Carousel"], [/\bnav\b|\bnavbar\b/, "Navigation Bar"],
  [/\bcta\b/, "Call to Action"], [/\bicon\b/, "Icon"],
  [/\bbtn\b/, "Button"], [/\bgrid\b/, "Grid Layout"],
  [/\bstat\b|\bmetric\b|\bkpi\b/, "Metric Card"], [/\bchart\b|\bgraph\b/, "Chart"],
  [/\bsearch\b/, "Search"], [/\bfilter\b/, "Filter"],
  [/\bpanel\b/, "Panel"], [/\bwidget\b/, "Widget"],
  [/\bdashboard\b/, "Dashboard"], [/\blogo\b/, "Logo"],
  [/\bprofile\b/, "Profile"], [/\bskeleton\b/, "Skeleton Loader"],
  [/\boverlay\b/, "Overlay"], [/\bdivider\b|\bseparator\b/, "Divider"],
  [/\bstepper\b/, "Stepper"], [/\btimeline\b/, "Timeline"],
  [/\bmenu\b/, "Menu"], [/\blist\b/, "List"],
];

function inferUITerm(el: HTMLElement): { term: string; description: string } {
  const tag = el.tagName.toLowerCase();
  const cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
  const role = el.getAttribute("role") || "";

  const resolve = (term: string) => ({
    term,
    description: UI_GLOSSARY[term] ?? "",
  });

  // Input type specifics
  if (tag === "input") {
    const type = el.getAttribute("type") || "text";
    const inputTerms: Record<string, string> = {
      checkbox: "Checkbox", radio: "Radio Button", range: "Slider",
      file: "File Upload", search: "Search Input", password: "Password Field",
      email: "Email Field", number: "Number Field", date: "Date Picker",
      color: "Color Picker", submit: "Submit Button", reset: "Reset Button",
    };
    return resolve(inputTerms[type] || "Input Field");
  }

  // ARIA role
  if (role && ROLE_TERMS[role]) return resolve(ROLE_TERMS[role]);

  // Class name patterns
  for (const [pattern, term] of CLASS_PATTERNS) {
    if (pattern.test(cls)) return resolve(term);
  }

  // Semantic tags
  if (TAG_TERMS[tag] && tag !== "div" && tag !== "span") return resolve(TAG_TERMS[tag]);

  // Style-based inference for div/span
  if (tag === "div" || tag === "span") {
    const computed = window.getComputedStyle(el);
    const display = computed.display;
    const position = computed.position;
    const rect = el.getBoundingClientRect();
    const childCount = el.children.length;
    const borderRadius = parseFloat(computed.borderRadius) || 0;
    const boxShadow = computed.boxShadow;

    if ((position === "sticky" || position === "fixed") && rect.y < 100) return resolve("Sticky Header");
    if (borderRadius > 4 && boxShadow && boxShadow !== "none") return resolve("Card");
    if (display === "grid" && childCount > 1) return resolve("Grid Layout");
    if (display === "flex") {
      if (computed.flexDirection === "column" && childCount > 2) return resolve("Stack Layout");
      if (childCount > 2) return resolve("Flex Container");
    }
    if (computed.overflowY === "auto" || computed.overflowY === "scroll") return resolve("Scrollable Area");
    if (childCount === 0 && el.textContent?.trim()) return resolve("Text Block");
    if (childCount > 0) return resolve("Container");
    return resolve("Block");
  }

  return resolve(TAG_TERMS[tag] || tag.toUpperCase());
}

/* ── Component ───────────────────────────────────────────────────── */

interface InspectorOverlayProps {
  enabled?: boolean;
  onElementSelected?: (info: ElementInfo) => void;
}

export function InspectorOverlay({ enabled, onElementSelected }: InspectorOverlayProps) {
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedLoc, setSelectedLoc] = useState<{ file: string; line: number; rect: DOMRect; uiTerm: string } | null>(null);

  useEffect(() => {
    wsClient.connect();
  }, []);

  const getElementInfo = useCallback((target: HTMLElement): ElementInfo => {
    const dataAt = target.getAttribute("data-at");
    let sourceLocation = null;
    if (dataAt) {
      const [file, line, column] = dataAt.split(":");
      sourceLocation = { file, line: parseInt(line), column: parseInt(column) };
    }

    const computed = window.getComputedStyle(target);
    const styles: Record<string, string> = {};
    for (const prop of [
      "backgroundColor", "color", "fontSize", "fontWeight",
      "padding", "margin", "display", "position",
      "width", "height", "borderRadius", "gap",
    ]) {
      styles[prop] = computed.getPropertyValue(
        prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
      );
    }

    const parentChain: string[] = [];
    let el: HTMLElement | null = target.parentElement;
    while (el && el !== document.body) {
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(" ")[0]}` : "";
      parentChain.push(`${el.tagName.toLowerCase()}${id}${cls}`);
      el = el.parentElement;
    }

    const { term, description } = inferUITerm(target);

    return {
      tag: target.tagName.toLowerCase(),
      className: typeof target.className === 'string' ? target.className : '',
      textContent: target.textContent?.slice(0, 200) || "",
      boundingRect: target.getBoundingClientRect(),
      computedStyles: styles,
      sourceLocation,
      parentChain,
      innerHTML: target.innerHTML.slice(0, 500),
      uiTerm: term,
      uiDescription: description,
    };
  }, []);

  const isInPreview = useCallback((target: HTMLElement): boolean => {
    return !!target.closest("[data-preview-content]");
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      const target = e.target as HTMLElement;
      if (!isInPreview(target)) {
        setHoveredRect(null);
        return;
      }
      setHoveredRect(target.getBoundingClientRect());
    },
    [enabled, isInPreview]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      const target = e.target as HTMLElement;
      if (!isInPreview(target)) return;
      e.preventDefault();
      e.stopPropagation();

      const info = getElementInfo(target);
      setSelectedLoc({
        file: info.sourceLocation?.file || "",
        line: info.sourceLocation?.line || 0,
        rect: info.boundingRect,
        uiTerm: info.uiTerm,
      });

      onElementSelected?.(info);

      wsClient.send("element_selected", {
        tag: info.tag,
        className: info.className,
        textContent: info.textContent,
        boundingRect: {
          x: info.boundingRect.x, y: info.boundingRect.y,
          width: info.boundingRect.width, height: info.boundingRect.height,
        },
        computedStyles: info.computedStyles,
        sourceLocation: info.sourceLocation,
        parentChain: info.parentChain,
        uiTerm: info.uiTerm,
        uiDescription: info.uiDescription,
      });
    },
    [enabled, isInPreview, getElementInfo, onElementSelected]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("mousemove", handleMouseMove, true);
      document.addEventListener("click", handleClick, true);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [enabled, handleMouseMove, handleClick]);

  if (!enabled) return null;

  return (
    <div
      data-inspector-overlay=""
      ref={overlayRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99999 }}
    >
      {hoveredRect && (
        <div
          style={{
            position: "fixed",
            left: hoveredRect.x, top: hoveredRect.y,
            width: hoveredRect.width, height: hoveredRect.height,
            border: "2px solid #3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            pointerEvents: "none",
            transition: "all 0.1s ease",
          }}
        />
      )}
      {selectedLoc && (
        <div
          style={{
            position: "fixed",
            left: selectedLoc.rect.x,
            top: Math.max(0, selectedLoc.rect.y - 32),
            backgroundColor: "#1e293b",
            color: "#e2e8f0",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "monospace",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 100000,
          }}
        >
          <span style={{ color: "#60a5fa", marginRight: "6px" }}>{selectedLoc.uiTerm}</span>
          {selectedLoc.file && <span style={{ color: "#94a3b8" }}>{selectedLoc.file}:{selectedLoc.line}</span>}
        </div>
      )}
    </div>
  );
}
