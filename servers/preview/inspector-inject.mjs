/**
 * Standalone vanilla JS inspector script generator.
 * Ports the core logic from InspectorOverlay.tsx to framework-agnostic JS
 * that can be injected into any page via the inject proxy.
 *
 * @param {number} wsPort - WebSocket port for WSBridge communication
 * @returns {string} Self-executing IIFE script string
 */
export function generateInspectorScript(wsPort) {
  return `(function(){
"use strict";
var WS_PORT = ${wsPort};
var MARKER = "data-gemini-inspector";

/* ── Design tokens — monochrome editorial, red accent ─────────── */
var F_SANS = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif";
var F_MONO = "ui-monospace,'SF Mono',SFMono-Regular,Menlo,monospace";
var C_INK = "#161616";     /* capsule black */
var C_GROUND = "#0e0e0e";  /* panel ground */
var C_CARD = "#f4f4f0";    /* warm off-white ticket card */
var C_TXT = "#141414";     /* text on card */
var C_MUTE_D = "#9a9a94";  /* muted on dark */
var C_MUTE_L = "#6b6b66";  /* muted on card */
var C_WELL = "#eceae3";    /* inset well on card */
var C_RED = "#ff3000";     /* accent */

/* ── UI Glossary ─────────────────────────────────────────────── */
var UI_GLOSSARY = {
  "Header":"페이지 최상단 영역. 브랜드 로고, 내비게이션, 검색, 사용자 메뉴 등 전역 요소를 배치",
  "Footer":"페이지 최하단 영역. 저작권, 부가 링크, 연락처 등 보조 정보를 제공",
  "Main Content":"페이지의 핵심 콘텐츠가 위치하는 주 영역",
  "Sidebar":"메인 콘텐츠 옆의 보조 영역. 필터, 서브 메뉴, 관련 콘텐츠 등을 배치",
  "Section":"주제별로 구분된 콘텐츠 블록",
  "Article":"독립적으로 완결된 콘텐츠 단위. 블로그 포스트, 뉴스 기사 등",
  "Divider":"콘텐츠 간 시각적 경계를 만드는 구분선",
  "Navigation":"사이트 주요 페이지로 이동하는 탐색 영역",
  "Navigation Bar":"화면 상단/측면에 고정된 주 내비게이션",
  "Sticky Header":"스크롤해도 상단에 고정되는 헤더 (position: sticky/fixed)",
  "Breadcrumb":"현재 페이지의 위치를 계층적 경로로 표시",
  "Tabs":"같은 영역에서 여러 콘텐츠 뷰를 전환하는 인터페이스",
  "Tab List":"탭 버튼들이 나열된 컨테이너",
  "Tab Panel":"탭 선택에 따라 표시되는 콘텐츠 영역",
  "Pagination":"대량의 콘텐츠를 페이지 단위로 나누어 탐색",
  "Menu":"실행 가능한 옵션 목록",
  "Menu Bar":"수평으로 나열된 최상위 메뉴",
  "Card":"관련 정보를 시각적으로 그룹화하는 컨테이너. 둥근 모서리와 그림자로 표면 분리",
  "Hero Section":"페이지 첫 화면의 주목도 높은 대형 영역. 핵심 메시지, 비주얼, CTA 배치",
  "Panel":"특정 기능이나 정보를 담는 구획된 영역",
  "Widget":"독립적인 기능 단위의 작은 UI 모듈",
  "Dashboard":"여러 위젯과 데이터를 한 화면에 종합한 대시보드",
  "Metric Card":"KPI나 주요 수치를 강조 표시하는 카드",
  "Button":"클릭/탭으로 액션을 실행하는 인터랙티브 요소",
  "Call to Action":"사용자의 핵심 행동을 유도하는 강조된 버튼이나 링크 (CTA)",
  "Link":"다른 페이지나 리소스로 이동하는 텍스트 기반 내비게이션",
  "Dropdown":"클릭 시 옵션 목록이 펼쳐지는 선택 메뉴",
  "Toggle Switch":"켜기/끄기 두 상태를 전환하는 스위치",
  "Checkbox":"여러 옵션 중 복수 선택이 가능한 컨트롤",
  "Radio Button":"상호 배타적인 옵션 중 하나만 선택하는 컨트롤",
  "Slider":"드래그로 범위 내 값을 선택하는 컨트롤",
  "Search":"키워드로 콘텐츠를 찾는 검색 인터페이스",
  "Filter":"조건을 설정하여 콘텐츠를 걸러내는 컨트롤",
  "Form":"사용자 입력을 수집하는 양식",
  "Input Field":"텍스트, 숫자 등 단일 값을 입력받는 필드",
  "Text Area":"여러 줄의 텍스트를 입력받는 확장 필드",
  "Select Dropdown":"미리 정의된 옵션 중 하나를 선택하는 드롭다운",
  "Search Input":"검색어 입력 전용 필드",
  "Password Field":"비밀번호 입력 필드. 입력 내용을 마스킹",
  "Email Field":"이메일 주소 입력 필드",
  "Number Field":"숫자 값 입력 필드",
  "Date Picker":"날짜를 선택하는 캘린더 기반 컨트롤",
  "Color Picker":"색상을 시각적으로 선택하는 컨트롤",
  "File Upload":"파일을 선택하거나 드래그&드롭으로 업로드하는 영역",
  "Submit Button":"양식 데이터를 서버에 전송하는 제출 버튼",
  "Reset Button":"양식 입력을 초기 상태로 되돌리는 버튼",
  "Label":"입력 필드의 목적을 설명하는 텍스트",
  "Data Table":"구조화된 데이터를 행과 열로 정리하여 표시",
  "Table Header":"테이블 열의 제목 행",
  "Table Body":"테이블의 데이터 행 영역",
  "Table Row":"테이블의 한 행",
  "Column Header":"테이블 열의 제목 셀",
  "Table Cell":"테이블의 개별 데이터 셀",
  "Chart":"데이터를 시각적 그래프로 변환하여 추세, 비교, 분포를 전달",
  "Badge":"상태, 카운트, 카테고리를 작은 라벨로 표시하는 보조 인디케이터",
  "Progress Bar":"작업 진행률을 시각적으로 표현하는 바",
  "Status Indicator":"시스템이나 항목의 현재 상태를 표시하는 인디케이터",
  "Chip":"필터 조건, 태그, 선택 항목을 작은 알약 형태로 표시",
  "Modal":"현재 화면 위에 떠서 사용자 주의를 집중시키는 대화 상자",
  "Dialog":"사용자 확인이나 추가 입력을 요청하는 팝업 창",
  "Toast":"화면 모서리에 잠시 나타났다 사라지는 알림",
  "Alert":"중요한 정보나 경고를 눈에 띄게 전달하는 인라인 배너",
  "Popover":"특정 요소를 클릭하면 근처에 나타나는 보조 정보 풍선",
  "Tooltip":"마우스 호버 시 나타나는 짧은 설명 텍스트",
  "Drawer":"화면 가장자리에서 슬라이드 인되는 패널",
  "Overlay":"배경을 반투명하게 덮어 뒤 콘텐츠와 시각적으로 분리",
  "Loader":"콘텐츠 로딩 중임을 시각적으로 알리는 표시",
  "Skeleton Loader":"콘텐츠 로딩 중 실제 레이아웃과 유사한 회색 뼈대를 표시",
  "Image":"시각적 콘텐츠를 표시하는 요소",
  "Icon":"의미를 함축적으로 전달하는 작은 심볼 그래픽",
  "Avatar":"사용자나 엔티티를 대표하는 프로필 이미지",
  "Logo":"브랜드 아이덴티티를 대표하는 심볼이나 워드마크",
  "Carousel":"좌우 슬라이드로 여러 콘텐츠를 순환 표시하는 회전 UI",
  "Video Player":"영상 콘텐츠를 재생하는 미디어 플레이어",
  "Canvas":"프로그래밍으로 그래픽을 렌더링하는 영역",
  "Embedded Frame":"외부 콘텐츠를 현재 페이지 안에 삽입하는 프레임",
  "Heading 1":"페이지의 최상위 제목 (h1)",
  "Heading 2":"주요 섹션 제목 (h2)",
  "Heading 3":"하위 섹션 제목 (h3)",
  "Heading 4":"세부 항목 제목 (h4)",
  "Heading 5":"보조 제목 (h5)",
  "Heading 6":"최하위 제목 (h6)",
  "Paragraph":"본문 텍스트 블록",
  "Text Block":"독립적인 텍스트 콘텐츠 영역",
  "Unordered List":"순서 없는 항목 나열",
  "Ordered List":"순서가 있는 항목 나열",
  "List":"항목을 세로로 나열하는 목록",
  "List Item":"목록의 개별 항목",
  "Feed":"시간순으로 업데이트되는 콘텐츠 스트림",
  "Container":"자식 요소들을 감싸는 레이아웃 박스",
  "Grid Layout":"2차원 격자 기반 레이아웃 (CSS Grid)",
  "Flex Container":"1차원 유연 레이아웃 (Flexbox)",
  "Stack Layout":"수직으로 쌓이는 레이아웃 (flex-direction: column)",
  "Scrollable Area":"고정 높이/너비 안에서 스크롤로 콘텐츠를 탐색하는 영역",
  "Block":"기본 블록 레벨 요소",
  "Wrapper":"단일 자식을 감싸는 중간 요소",
  "Accordion":"클릭으로 콘텐츠를 펼치거나 접는 섹션",
  "Accordion Trigger":"아코디언을 열고 닫는 클릭 가능한 헤더",
  "Timeline":"시간 순서로 이벤트를 시각적으로 나열",
  "Stepper":"다단계 프로세스의 진행 상태를 단계별로 표시",
  "Toolbar":"관련 액션 버튼들을 모은 가로 바",
  "Banner":"페이지 상단에 위치하는 전폭 알림 영역",
  "Profile":"사용자 정보를 표시하는 영역",
  "Grid":"ARIA grid 역할. 키보드 내비게이션이 가능한 2차원 인터랙티브 데이터 격자",
  "Tree View":"계층적 데이터를 트리 구조로 표시",
  "Listbox":"키보드 탐색이 가능한 선택 목록"
};

/* ── Tag / Role / Class Mappings ──────────────────────────────── */
var TAG_TERMS = {
  nav:"Navigation",header:"Header",footer:"Footer",main:"Main Content",
  aside:"Sidebar",section:"Section",article:"Article",form:"Form",
  table:"Data Table",thead:"Table Header",tbody:"Table Body",
  tr:"Table Row",th:"Column Header",td:"Table Cell",
  button:"Button",a:"Link",img:"Image",svg:"Icon",
  video:"Video Player",canvas:"Canvas",iframe:"Embedded Frame",
  ul:"Unordered List",ol:"Ordered List",li:"List Item",
  h1:"Heading 1",h2:"Heading 2",h3:"Heading 3",
  h4:"Heading 4",h5:"Heading 5",h6:"Heading 6",
  p:"Paragraph",label:"Label",dialog:"Dialog",
  details:"Accordion",summary:"Accordion Trigger",
  progress:"Progress Bar",select:"Select Dropdown",
  textarea:"Text Area",input:"Input Field"
};

var ROLE_TERMS = {
  navigation:"Navigation",banner:"Banner",search:"Search",
  dialog:"Dialog",alert:"Alert",tablist:"Tab List",tab:"Tabs",
  tabpanel:"Tab Panel",menu:"Menu",menubar:"Menu Bar",
  toolbar:"Toolbar",tooltip:"Tooltip",progressbar:"Progress Bar",
  slider:"Slider","switch":"Toggle Switch",checkbox:"Checkbox",
  radio:"Radio Button",grid:"Grid",tree:"Tree View",
  status:"Status Indicator",feed:"Feed",listbox:"Listbox"
};

var CLASS_PATTERNS = [
  [/\\bhero\\b/,"Hero Section"],[/\\bcard\\b/,"Card"],[/\\bmodal\\b/,"Modal"],
  [/\\bdrawer\\b/,"Drawer"],[/\\bsidebar\\b/,"Sidebar"],[/\\btoolbar\\b/,"Toolbar"],
  [/\\bbadge\\b/,"Badge"],[/\\bavatar\\b/,"Avatar"],[/\\bchip\\b/,"Chip"],
  [/\\bbreadcrumb\\b/,"Breadcrumb"],[/\\bpagination\\b/,"Pagination"],
  [/\\balert\\b/,"Alert"],[/\\btoast\\b/,"Toast"],[/\\bspinner\\b|\\bloading\\b/,"Loader"],
  [/\\baccordion\\b/,"Accordion"],[/\\btabs?\\b/,"Tabs"],
  [/\\bdropdown\\b/,"Dropdown"],[/\\bpopover\\b/,"Popover"],[/\\btooltip\\b/,"Tooltip"],
  [/\\bcarousel\\b|\\bswiper\\b/,"Carousel"],[/\\bnav\\b|\\bnavbar\\b/,"Navigation Bar"],
  [/\\bcta\\b/,"Call to Action"],[/\\bicon\\b/,"Icon"],
  [/\\bbtn\\b/,"Button"],[/\\bgrid\\b/,"Grid Layout"],
  [/\\bstat\\b|\\bmetric\\b|\\bkpi\\b/,"Metric Card"],[/\\bchart\\b|\\bgraph\\b/,"Chart"],
  [/\\bsearch\\b/,"Search"],[/\\bfilter\\b/,"Filter"],
  [/\\bpanel\\b/,"Panel"],[/\\bwidget\\b/,"Widget"],
  [/\\bdashboard\\b/,"Dashboard"],[/\\blogo\\b/,"Logo"],
  [/\\bprofile\\b/,"Profile"],[/\\bskeleton\\b/,"Skeleton Loader"],
  [/\\boverlay\\b/,"Overlay"],[/\\bdivider\\b|\\bseparator\\b/,"Divider"],
  [/\\bstepper\\b/,"Stepper"],[/\\btimeline\\b/,"Timeline"],
  [/\\bmenu\\b/,"Menu"],[/\\blist\\b/,"List"]
];

var INPUT_TERMS = {
  checkbox:"Checkbox",radio:"Radio Button",range:"Slider",
  file:"File Upload",search:"Search Input",password:"Password Field",
  email:"Email Field",number:"Number Field",date:"Date Picker",
  color:"Color Picker",submit:"Submit Button",reset:"Reset Button"
};

/* ── inferUITerm ──────────────────────────────────────────────── */
function inferUITerm(el) {
  var tag = el.tagName.toLowerCase();
  var cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
  var role = el.getAttribute("role") || "";

  function resolve(term) {
    return { term: term, description: UI_GLOSSARY[term] || "" };
  }

  if (tag === "input") {
    var type = el.getAttribute("type") || "text";
    return resolve(INPUT_TERMS[type] || "Input Field");
  }
  if (role && ROLE_TERMS[role]) return resolve(ROLE_TERMS[role]);
  for (var i = 0; i < CLASS_PATTERNS.length; i++) {
    if (CLASS_PATTERNS[i][0].test(cls)) return resolve(CLASS_PATTERNS[i][1]);
  }
  if (TAG_TERMS[tag] && tag !== "div" && tag !== "span") return resolve(TAG_TERMS[tag]);

  if (tag === "div" || tag === "span") {
    var computed = window.getComputedStyle(el);
    var display = computed.display;
    var position = computed.position;
    var rect = el.getBoundingClientRect();
    var childCount = el.children.length;
    var borderRadius = parseFloat(computed.borderRadius) || 0;
    var boxShadow = computed.boxShadow;

    if ((position === "sticky" || position === "fixed") && rect.y < 100) return resolve("Sticky Header");
    if (borderRadius > 4 && boxShadow && boxShadow !== "none") return resolve("Card");
    if (display === "grid" && childCount > 1) return resolve("Grid Layout");
    if (display === "flex") {
      if (computed.flexDirection === "column" && childCount > 2) return resolve("Stack Layout");
      if (childCount > 2) return resolve("Flex Container");
    }
    if (computed.overflowY === "auto" || computed.overflowY === "scroll") return resolve("Scrollable Area");
    if (childCount === 0 && el.textContent && el.textContent.trim()) return resolve("Text Block");
    if (childCount > 0) return resolve("Container");
    return resolve("Block");
  }

  return resolve(TAG_TERMS[tag] || tag.toUpperCase());
}

/* ── inferElementName ─────────────────────────────────────────── */
function inferElementName(target, sourceLocation) {
  var componentName = "";
  if (sourceLocation && sourceLocation.file) {
    var fileMatch = sourceLocation.file.match(/([^\\/\\\\]+?)\\.(tsx?|jsx?|vue|svelte|astro|mjs|cjs)$/i);
    if (fileMatch) componentName = fileMatch[1];
  }

  var attr = function(n) { return (target.getAttribute(n) || "").trim(); };

  var idVal = (target.id || "").trim();
  var testId = attr("data-testid") || attr("data-test") || attr("data-cy") || attr("data-qa");
  var ariaLabel = attr("aria-label");
  var ariaLabelledBy = attr("aria-labelledby");
  var nameAttr = attr("name");
  var alt = attr("alt");
  var title = attr("title");
  var placeholder = attr("placeholder");
  var htmlFor = attr("for");
  var role = attr("role");
  var firstClass = "";
  if (typeof target.className === "string" && target.className.trim()) {
    firstClass = target.className.trim().split(/\\s+/)[0];
  }

  var ariaLabelledByText = "";
  if (ariaLabelledBy) {
    var refIds = ariaLabelledBy.split(/\\s+/);
    var parts = [];
    for (var r = 0; r < refIds.length; r++) {
      var refEl = document.getElementById(refIds[r]);
      if (refEl && refEl.textContent) parts.push(refEl.textContent.trim());
    }
    ariaLabelledByText = parts.join(" ").slice(0, 120);
  }

  var labelText = "";
  if (target.id) {
    var lbl = document.querySelector('label[for="' + target.id.replace(/"/g, '\\\\"') + '"]');
    if (lbl && lbl.textContent) labelText = lbl.textContent.trim().slice(0, 120);
  }

  /* primary: pick the single most authoritative identifier */
  var primary = "";
  var primarySource = "";
  if (idVal) { primary = "#" + idVal; primarySource = "id"; }
  else if (testId) { primary = testId; primarySource = "data-testid"; }
  else if (ariaLabel) { primary = ariaLabel; primarySource = "aria-label"; }
  else if (ariaLabelledByText) { primary = ariaLabelledByText; primarySource = "aria-labelledby"; }
  else if (labelText) { primary = labelText; primarySource = "label"; }
  else if (componentName) { primary = componentName; primarySource = "component"; }
  else if (nameAttr) { primary = nameAttr; primarySource = "name"; }
  else if (alt) { primary = alt; primarySource = "alt"; }
  else if (title) { primary = title; primarySource = "title"; }
  else if (placeholder) { primary = placeholder; primarySource = "placeholder"; }
  else if (firstClass) { primary = "." + firstClass; primarySource = "class"; }
  else { primary = target.tagName.toLowerCase(); primarySource = "tag"; }

  /* short CSS-like selector */
  var selectorParts = [target.tagName.toLowerCase()];
  if (idVal) selectorParts.push("#" + idVal);
  if (firstClass) selectorParts.push("." + firstClass);
  if (testId) selectorParts.push('[data-testid="' + testId + '"]');
  var selector = selectorParts.join("");

  return {
    primary: primary,
    primarySource: primarySource,
    componentName: componentName,
    id: idVal,
    testId: testId,
    ariaLabel: ariaLabel,
    ariaLabelledBy: ariaLabelledByText,
    labelText: labelText,
    nameAttr: nameAttr,
    alt: alt,
    title: title,
    placeholder: placeholder,
    htmlFor: htmlFor,
    role: role,
    selector: selector
  };
}

/* ── cssPath: robust short CSS path for re-anchoring ─────────── */
function cssPath(el) {
  var parts = [];
  var node = el;
  var depth = 0;
  while (node && node.nodeType === 1 && node !== document.documentElement && depth < 6) {
    var part = node.tagName.toLowerCase();
    if (node.id && /^[A-Za-z][\\w-]*$/.test(node.id)) {
      parts.unshift(part + "#" + node.id);
      break;
    }
    var cls = "";
    if (typeof node.className === "string") {
      var candidates = node.className.trim().split(/\\s+/);
      for (var i = 0; i < candidates.length; i++) {
        if (/^[A-Za-z][\\w-]*$/.test(candidates[i])) { cls = candidates[i]; break; }
      }
    }
    if (cls) part += "." + cls;
    var parent = node.parentElement;
    if (parent) {
      var sibs = parent.children;
      var sameTag = 0, idx = 0;
      for (var j = 0; j < sibs.length; j++) {
        if (sibs[j].tagName === node.tagName) {
          sameTag++;
          if (sibs[j] === node) idx = sameTag;
        }
      }
      if (sameTag > 1) part += ":nth-of-type(" + idx + ")";
    }
    parts.unshift(part);
    node = parent;
    depth++;
  }
  return parts.join(" > ");
}

/* ── getElementInfo ───────────────────────────────────────────── */
var STYLE_PROPS = [
  "backgroundColor","color","fontSize","fontWeight",
  "padding","margin","display","position",
  "width","height","borderRadius","gap"
];

function getElementInfo(target) {
  var dataAt = target.getAttribute("data-at");
  var sourceLocation = null;
  if (dataAt) {
    var parts = dataAt.split(":");
    sourceLocation = { file: parts[0], line: parseInt(parts[1]), column: parseInt(parts[2]) };
  }

  var computed = window.getComputedStyle(target);
  var styles = {};
  for (var i = 0; i < STYLE_PROPS.length; i++) {
    var prop = STYLE_PROPS[i];
    var cssProp = prop.replace(/[A-Z]/g, function(m) { return "-" + m.toLowerCase(); });
    styles[prop] = computed.getPropertyValue(cssProp);
  }

  var parentChain = [];
  var el = target.parentElement;
  while (el && el !== document.body) {
    var id = el.id ? "#" + el.id : "";
    var c = el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "";
    parentChain.push(el.tagName.toLowerCase() + id + c);
    el = el.parentElement;
  }

  var info = inferUITerm(target);
  var rect = target.getBoundingClientRect();
  var nameInfo = inferElementName(target, sourceLocation);

  var htmlSnippet = "";
  try {
    htmlSnippet = target.outerHTML || "";
    if (htmlSnippet.length > 400) htmlSnippet = htmlSnippet.slice(0, 400) + "\\u2026";
  } catch(e) {}

  var pathStr = "";
  try { pathStr = cssPath(target); } catch(e) {}

  return {
    tag: target.tagName.toLowerCase(),
    className: typeof target.className === "string" ? target.className : "",
    textContent: (target.textContent || "").slice(0, 200),
    boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    computedStyles: styles,
    sourceLocation: sourceLocation,
    parentChain: parentChain,
    uiTerm: info.term,
    uiDescription: info.description,
    elementName: nameInfo,
    cssPath: pathStr,
    htmlSnippet: htmlSnippet
  };
}

/* ── WebSocket Client ─────────────────────────────────────────── */
var ws = null;
var inspectorEnabled = false;
var annotateEnabled = false;
var annotations = [];
var reconnectAttempts = 0;
var maxReconnect = 10;
var reconnectTimer = null;

function connectWS() {
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  try {
    ws = new WebSocket("ws://localhost:" + WS_PORT);
  } catch(e) { return; }

  ws.onopen = function() {
    reconnectAttempts = 0;
    console.log("[Gemini Inspector] Connected to WSBridge on port " + WS_PORT);
  };

  ws.onmessage = function(event) {
    try {
      var msg = JSON.parse(event.data);
      if (msg.type === "inspector_state") {
        inspectorEnabled = !!msg.data && !!msg.data.enabled;
        if (inspectorEnabled) annotateEnabled = false;
        updateToolbarState();
        if (!inspectorEnabled) {
          hoverBox.style.display = "none";
          labelEl.style.display = "none";
        }
      } else if (msg.type === "annotations_state") {
        annotations = (msg.data && msg.data.annotations) || [];
        closePinPopup();
        renderPins();
      } else if (msg.type === "highlight_element") {
        flashHighlight(msg.data || {});
      }
    } catch(e) {}
  };

  ws.onclose = function() {
    ws = null;
    if (reconnectAttempts < maxReconnect) {
      var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      reconnectTimer = setTimeout(connectWS, delay);
    }
  };

  ws.onerror = function() {};
}

function wsSend(type, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: type, data: data }));
  }
}

/* ── Runtime Error Capture ────────────────────────────────────── */
window.addEventListener("error", function(e) {
  wsSend("runtime_error", {
    kind: "error",
    message: String(e.message || ""),
    source: (e.filename || "") + ":" + (e.lineno || 0),
    stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 1000) : ""
  });
});
window.addEventListener("unhandledrejection", function(e) {
  var r = e.reason;
  wsSend("runtime_error", {
    kind: "unhandledrejection",
    message: r && r.message ? String(r.message) : String(r),
    stack: r && r.stack ? String(r.stack).slice(0, 1000) : ""
  });
});
var origConsoleError = console.error;
console.error = function() {
  try {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      parts.push(typeof a === "string" ? a : (a && a.message) ? a.message : String(a));
    }
    var joined = parts.join(" ");
    if (joined.indexOf("[Gemini Inspector]") === -1) {
      wsSend("runtime_error", { kind: "console.error", message: joined.slice(0, 500) });
    }
  } catch(err) {}
  return origConsoleError.apply(console, arguments);
};

/* ── DOM: Overlay Elements ────────────────────────────────────── */
var overlay = document.createElement("div");
overlay.setAttribute(MARKER, "overlay");
overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;";
document.documentElement.appendChild(overlay);

var hoverBox = document.createElement("div");
hoverBox.setAttribute(MARKER, "hover");
hoverBox.style.cssText = "position:fixed;border:1.5px solid #141414;box-shadow:0 0 0 1.5px rgba(255,255,255,0.85);background:rgba(20,20,20,0.05);pointer-events:none;display:none;transition:all 0.1s ease;z-index:99999;border-radius:2px;";
overlay.appendChild(hoverBox);

var labelEl = document.createElement("div");
labelEl.setAttribute(MARKER, "label");
labelEl.style.cssText = "position:fixed;background:" + C_INK + ";color:#f4f4f0;padding:6px 13px;border-radius:999px;font:10px/1.4 " + F_MONO + ";letter-spacing:0.02em;pointer-events:none;white-space:nowrap;z-index:100000;display:none;box-shadow:0 4px 14px rgba(0,0,0,0.35);";
overlay.appendChild(labelEl);

/* ── Code Panel (Side Panel) ──────────────────────────────────── */
var panel = document.createElement("div");
panel.setAttribute(MARKER, "panel");
panel.style.cssText = "position:fixed;top:0;right:0;width:320px;height:100vh;background:" + C_GROUND + ";color:#e8e8e4;font-family:" + F_MONO + ";font-size:12px;z-index:100002;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);overflow-y:auto;border-left:1px solid #232320;box-shadow:-8px 0 32px rgba(0,0,0,0.45);pointer-events:auto;";

var panelHeader = document.createElement("div");
panelHeader.setAttribute(MARKER, "panel-header");
panelHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:18px 18px 14px;position:sticky;top:0;background:" + C_GROUND + ";z-index:1;";
var panelTitle = document.createElement("span");
panelTitle.style.cssText = "display:flex;align-items:center;gap:8px;font:700 10px " + F_MONO + ";color:#f4f4f0;text-transform:uppercase;letter-spacing:0.22em;";
var titleSq = document.createElement("span");
titleSq.style.cssText = "width:7px;height:7px;background:" + C_RED + ";display:inline-block;flex:none;";
panelTitle.appendChild(titleSq);
panelTitle.appendChild(document.createTextNode("Inspector"));
panelHeader.appendChild(panelTitle);
var closeBtn = document.createElement("button");
closeBtn.setAttribute(MARKER, "btn");
closeBtn.textContent = "\\u2715";
closeBtn.style.cssText = "background:none;border:1px solid #2e2e2a;color:" + C_MUTE_D + ";cursor:pointer;font-size:11px;width:26px;height:26px;line-height:1;border-radius:999px;transition:all 0.18s ease;";
closeBtn.onmouseenter = function() { closeBtn.style.color = "#f4f4f0"; closeBtn.style.borderColor = "#f4f4f0"; };
closeBtn.onmouseleave = function() { closeBtn.style.color = C_MUTE_D; closeBtn.style.borderColor = "#2e2e2a"; };
closeBtn.onclick = function() { hidePanel(); };
panelHeader.appendChild(closeBtn);
panel.appendChild(panelHeader);

var panelBody = document.createElement("div");
panelBody.setAttribute(MARKER, "panel-body");
panelBody.style.cssText = "padding:2px 14px 18px;display:flex;flex-direction:column;gap:10px;";
panel.appendChild(panelBody);
document.documentElement.appendChild(panel);

var panelVisible = false;

function ensureAttached(el) {
  if (!el.parentNode || !document.documentElement.contains(el)) {
    document.documentElement.appendChild(el);
  }
}

function showPanel() {
  ensureAttached(panel);
  panel.style.transform = "translateX(0)";
  panelVisible = true;
  /* slide the toolbar clear of the panel */
  toolbar.style.right = "338px";
  bulkMenu.style.right = "338px";
}
function hidePanel() {
  panel.style.transform = "translateX(100%)";
  panelVisible = false;
  toolbar.style.right = "18px";
  bulkMenu.style.right = "18px";
}

function createSectionLabel(text) {
  var el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;gap:6px;font:700 9px " + F_MONO + ";color:" + C_MUTE_L + ";text-transform:uppercase;letter-spacing:0.16em;margin-bottom:8px;";
  var sq = document.createElement("span");
  sq.style.cssText = "width:6px;height:6px;background:" + C_RED + ";display:inline-block;flex:none;";
  el.appendChild(sq);
  el.appendChild(document.createTextNode(text));
  return el;
}

/* ticket card: warm white surface with side notches (panel ground shows through) */
function createCard() {
  var card = document.createElement("div");
  card.style.cssText = "position:relative;background:" + C_CARD + ";border-radius:14px;padding:14px 18px;overflow:hidden;";
  var nL = document.createElement("span");
  nL.style.cssText = "position:absolute;left:-7px;top:20px;width:14px;height:14px;border-radius:50%;background:" + C_GROUND + ";";
  var nR = document.createElement("span");
  nR.style.cssText = "position:absolute;right:-7px;top:20px;width:14px;height:14px;border-radius:50%;background:" + C_GROUND + ";";
  card.appendChild(nL);
  card.appendChild(nR);
  return card;
}

function renderPanel(info) {
  while (panelBody.firstChild) panelBody.removeChild(panelBody.firstChild);

  /* Name (정확한 이름) */
  if (info.elementName) {
    var nm = info.elementName;
    var nameSection = createCard();
    nameSection.appendChild(createSectionLabel("Name"));

    var nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;";
    var primaryEl = document.createElement("div");
    primaryEl.style.cssText = "font:700 15px/1.3 " + F_MONO + ";color:" + C_TXT + ";word-break:break-all;";
    primaryEl.textContent = nm.primary;
    nameRow.appendChild(primaryEl);
    if (nm.primarySource) {
      var srcTag = document.createElement("span");
      srcTag.style.cssText = "font:700 8px " + F_MONO + ";color:#f4f4f0;background:" + C_INK + ";padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:0.1em;";
      srcTag.textContent = nm.primarySource;
      nameRow.appendChild(srcTag);
    }
    nameSection.appendChild(nameRow);

    var rows = [];
    if (nm.componentName && nm.primarySource !== "component") rows.push(["component", nm.componentName]);
    if (nm.id && nm.primarySource !== "id") rows.push(["id", "#" + nm.id]);
    if (nm.testId && nm.primarySource !== "data-testid") rows.push(["data-testid", nm.testId]);
    if (nm.ariaLabel && nm.primarySource !== "aria-label") rows.push(["aria-label", nm.ariaLabel]);
    if (nm.ariaLabelledBy && nm.primarySource !== "aria-labelledby") rows.push(["aria-labelledby", nm.ariaLabelledBy]);
    if (nm.labelText && nm.primarySource !== "label") rows.push(["label", nm.labelText]);
    if (nm.nameAttr && nm.primarySource !== "name") rows.push(["name", nm.nameAttr]);
    if (nm.alt && nm.primarySource !== "alt") rows.push(["alt", nm.alt]);
    if (nm.title && nm.primarySource !== "title") rows.push(["title", nm.title]);
    if (nm.placeholder && nm.primarySource !== "placeholder") rows.push(["placeholder", nm.placeholder]);
    if (nm.role) rows.push(["role", nm.role]);
    if (nm.htmlFor) rows.push(["for", nm.htmlFor]);

    if (rows.length > 0) {
      var detailGrid = document.createElement("div");
      detailGrid.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font:10px " + F_MONO + ";";
      for (var ri = 0; ri < rows.length; ri++) {
        var kSpan = document.createElement("span");
        kSpan.style.color = C_MUTE_L;
        kSpan.textContent = rows[ri][0];
        var vSpan = document.createElement("span");
        vSpan.style.cssText = "color:" + C_TXT + ";word-break:break-all;";
        vSpan.textContent = rows[ri][1];
        detailGrid.appendChild(kSpan);
        detailGrid.appendChild(vSpan);
      }
      nameSection.appendChild(detailGrid);
    }

    if (nm.selector) {
      var selEl = document.createElement("div");
      selEl.style.cssText = "margin-top:8px;font:10px " + F_MONO + ";color:#3d3d38;background:" + C_WELL + ";padding:6px 9px;border-radius:8px;word-break:break-all;";
      selEl.textContent = nm.selector;
      nameSection.appendChild(selEl);
    }

    panelBody.appendChild(nameSection);
  }

  /* Source */
  if (info.sourceLocation) {
    var srcSection = createCard();
    srcSection.appendChild(createSectionLabel("Source"));
    var srcVal = document.createElement("div");
    srcVal.style.cssText = "font:700 11px " + F_MONO + ";color:" + C_TXT + ";word-break:break-all;";
    srcVal.textContent = info.sourceLocation.file + ":" + info.sourceLocation.line;
    srcSection.appendChild(srcVal);
    panelBody.appendChild(srcSection);
  }

  /* Design Term */
  var termSection = createCard();
  termSection.appendChild(createSectionLabel("Design Term"));
  var badge = document.createElement("div");
  badge.style.cssText = "display:inline-block;padding:5px 12px;border-radius:999px;background:" + C_INK + ";color:#f4f4f0;font:700 10px " + F_MONO + ";text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;";
  badge.textContent = info.uiTerm;
  termSection.appendChild(badge);
  if (info.uiDescription) {
    var desc = document.createElement("div");
    desc.style.cssText = "font:10px/1.7 " + F_MONO + ";color:#55554f;padding:8px 10px;background:" + C_WELL + ";border-radius:8px;";
    desc.textContent = info.uiDescription;
    termSection.appendChild(desc);
  }
  panelBody.appendChild(termSection);

  /* Spec: element + computed styles + size in one card, hairline-separated */
  var specSection = createCard();
  specSection.appendChild(createSectionLabel("Spec"));

  var tagRow = document.createElement("div");
  tagRow.style.cssText = "display:flex;align-items:baseline;justify-content:space-between;gap:8px;";
  var tagEl = document.createElement("span");
  tagEl.style.cssText = "font:700 12px " + F_MONO + ";color:" + C_TXT + ";";
  tagEl.textContent = "<" + info.tag + ">";
  tagRow.appendChild(tagEl);
  var sizeVal = document.createElement("span");
  sizeVal.style.cssText = "font:700 11px " + F_MONO + ";color:" + C_TXT + ";white-space:nowrap;";
  sizeVal.textContent = Math.round(info.boundingRect.width) + " \\u00d7 " + Math.round(info.boundingRect.height) + "px";
  tagRow.appendChild(sizeVal);
  specSection.appendChild(tagRow);
  if (info.className) {
    var clsEl = document.createElement("div");
    clsEl.style.cssText = "color:" + C_MUTE_L + ";font:9px/1.6 " + F_MONO + ";margin-top:4px;word-break:break-all;max-height:44px;overflow:hidden;";
    clsEl.textContent = info.className;
    specSection.appendChild(clsEl);
  }

  var hr = document.createElement("div");
  hr.style.cssText = "height:1px;background:#e0ded6;margin:10px 0;";
  specSection.appendChild(hr);

  var grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font:10px " + F_MONO + ";";
  var keys = Object.keys(info.computedStyles);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = info.computedStyles[k];
    if (!v || v === "normal" || v === "static" || v === "none" || v === "0px" || v === "auto") continue;
    var kSpan = document.createElement("span");
    kSpan.style.color = C_MUTE_L;
    kSpan.textContent = k.replace(/([A-Z])/g, function(m) { return "-" + m.toLowerCase(); });
    var vSpan = document.createElement("span");
    vSpan.style.cssText = "color:" + C_TXT + ";word-break:break-all;text-align:right;";
    vSpan.textContent = v;
    grid.appendChild(kSpan);
    grid.appendChild(vSpan);
  }
  specSection.appendChild(grid);
  panelBody.appendChild(specSection);

  /* Text + Parent Chain: bare rows on the dark ground (no card) */
  var txt = (info.textContent || "").trim();
  if (txt.length > 0) {
    var txtSection = document.createElement("div");
    txtSection.style.cssText = "padding:10px 6px 0;";
    var txtLbl = document.createElement("div");
    txtLbl.style.cssText = "font:700 8px " + F_MONO + ";color:#5c5c56;text-transform:uppercase;letter-spacing:0.16em;margin-bottom:5px;";
    txtLbl.textContent = "Text";
    txtSection.appendChild(txtLbl);
    var txtVal = document.createElement("div");
    txtVal.style.cssText = "font:10px/1.6 " + F_MONO + ";color:#b9b9b2;max-height:48px;overflow:hidden;text-overflow:ellipsis;word-break:break-all;";
    txtVal.textContent = "\\u201C" + txt.slice(0, 100) + "\\u201D";
    txtSection.appendChild(txtVal);
    panelBody.appendChild(txtSection);
  }

  if (info.parentChain && info.parentChain.length > 0) {
    var chainSection = document.createElement("div");
    chainSection.style.cssText = "padding:6px 6px 0;";
    var chainLbl = document.createElement("div");
    chainLbl.style.cssText = "font:700 8px " + F_MONO + ";color:#5c5c56;text-transform:uppercase;letter-spacing:0.16em;margin-bottom:5px;";
    chainLbl.textContent = "Parent Chain";
    chainSection.appendChild(chainLbl);
    var chainVal = document.createElement("div");
    chainVal.style.cssText = "font:9px/1.8 " + F_MONO + ";color:#7a7a74;word-break:break-all;max-height:72px;overflow:hidden;";
    chainVal.textContent = info.parentChain.slice(0, 6).join(" \\u203A ");
    chainSection.appendChild(chainVal);
    panelBody.appendChild(chainSection);
  }

  showPanel();
}

/* ── Annotations: pin layer ───────────────────────────────────── */
var pinLayer = document.createElement("div");
pinLayer.setAttribute(MARKER, "pin-layer");
pinLayer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:100001;";
document.documentElement.appendChild(pinLayer);

var annDialog = null;  // open comment dialog element
var annPopup = null;   // open pin popup element

/* ── Toast ────────────────────────────────────────────────────── */
var toastEl = null;
var toastTimer = null;
function showToast(text) {
  if (toastEl) { toastEl.remove(); toastEl = null; }
  if (toastTimer) clearTimeout(toastTimer);
  toastEl = document.createElement("div");
  toastEl.setAttribute(MARKER, "toast");
  toastEl.style.cssText = "position:fixed;bottom:18px;left:18px;background:" + C_INK + ";color:#f4f4f0;padding:10px 16px;border-radius:999px;font:11px " + F_MONO + ";letter-spacing:0.02em;z-index:100006;box-shadow:0 6px 20px rgba(0,0,0,0.4);pointer-events:none;display:flex;align-items:center;gap:8px;";
  var tDot = document.createElement("span");
  tDot.style.cssText = "width:6px;height:6px;border-radius:50%;background:" + C_RED + ";flex:none;";
  toastEl.appendChild(tDot);
  toastEl.appendChild(document.createTextNode(text));
  document.documentElement.appendChild(toastEl);
  toastTimer = setTimeout(function() {
    if (toastEl) { toastEl.remove(); toastEl = null; }
  }, 2200);
}

/* ── Annotations: page scoping ────────────────────────────────── */
/* Pins only render on the page they were created on (pathname match).
   Annotations from other pages stay on the server and in agent tools. */
function samePage(ann) {
  if (!ann.pageUrl) return true;
  try {
    return new URL(ann.pageUrl).pathname === location.pathname;
  } catch(e) { return true; }
}

/* ── Annotations: element re-anchoring ────────────────────────── */
function findElementByInfo(e) {
  if (!e) return null;
  var el = null;
  if (e.sourceLocation && e.sourceLocation.file) {
    try {
      el = document.querySelector('[data-at="' + e.sourceLocation.file + ":" + e.sourceLocation.line + ":" + e.sourceLocation.column + '"]');
    } catch(err) {}
  }
  if (!el && e.cssPath) { try { el = document.querySelector(e.cssPath); } catch(err) {} }
  if (!el && e.elementName && e.elementName.selector) {
    try { el = document.querySelector(e.elementName.selector); } catch(err) {}
  }
  return el;
}

function findAnnotationEl(ann) {
  return findElementByInfo(ann.element || {});
}

/* ── Annotations: pins ────────────────────────────────────────── */
function createPin(ann, indexInGroup) {
  var pin = document.createElement("div");
  pin.setAttribute(MARKER, "pin");
  var resolved = ann.status === "resolved";
  pin.style.cssText = "position:fixed;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 10px " + F_MONO + ";cursor:pointer;pointer-events:auto;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:2px solid " + C_CARD + ";transition:transform 0.15s ease;"
    + (resolved ? "background:" + C_INK + ";color:#f4f4f0;" : "background:" + C_RED + ";color:#fff;");
  pin.textContent = resolved ? "\\u2713" : String(ann.number);
  pin.title = ann.comment || "";
  pin._ann = ann;
  pin._offset = indexInGroup;
  pin.onmouseenter = function() { pin.style.transform = "scale(1.18)"; };
  pin.onmouseleave = function() { pin.style.transform = "scale(1)"; };
  pin.onclick = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    openPinPopup(ann, pin);
  };
  return pin;
}

function renderPins() {
  while (pinLayer.firstChild) pinLayer.removeChild(pinLayer.firstChild);
  var groupCounts = {};
  for (var i = 0; i < annotations.length; i++) {
    var ann = annotations[i];
    if (!samePage(ann)) { ann._el = null; continue; }
    var el = findAnnotationEl(ann);
    ann._el = el;
    var key = "orphan";
    if (el) {
      if (!el.__gemAnnKey) el.__gemAnnKey = "k" + String(Math.random()).slice(2, 10);
      key = el.__gemAnnKey;
    }
    var idx = groupCounts[key] || 0;
    groupCounts[key] = idx + 1;
    pinLayer.appendChild(createPin(ann, idx));
  }
  positionPins();
  updateToolbarState();
}

function positionPins() {
  var pins = pinLayer.children;
  for (var i = 0; i < pins.length; i++) {
    var pin = pins[i];
    var ann = pin._ann;
    var el = ann ? ann._el : null;
    if (!el || !document.documentElement.contains(el)) { pin.style.display = "none"; continue; }
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { pin.style.display = "none"; continue; }
    if (rect.bottom < 0 || rect.top > window.innerHeight) { pin.style.display = "none"; continue; }
    pin.style.display = "flex";
    pin.style.left = Math.max(0, rect.right - 11 - pin._offset * 24) + "px";
    pin.style.top = Math.max(0, rect.top - 11) + "px";
  }
}

var lastPinPath = location.pathname;
(function pinLoop() {
  try {
    // SPA route change (pushState/popstate): re-filter pins for the new page
    if (location.pathname !== lastPinPath) {
      lastPinPath = location.pathname;
      closePinPopup();
      closeCommentDialog();
      renderPins();
    } else if (annotations.length > 0) {
      positionPins();
    }
  } catch(e) {}
  requestAnimationFrame(pinLoop);
})();

/* ── Annotations: comment dialog (create) ─────────────────────── */
function closeCommentDialog() {
  if (annDialog) { annDialog.remove(); annDialog = null; }
}

function makeSmallBtn(text, accent) {
  var b = document.createElement("button");
  b.setAttribute(MARKER, "btn");
  b.textContent = text;
  b.style.cssText = "padding:7px 14px;border-radius:999px;font:600 11px " + F_SANS + ";cursor:pointer;transition:all 0.18s ease;border:1px solid "
    + (accent ? C_INK + ";background:" + C_INK + ";color:#f4f4f0;" : "#c9c9c1;background:transparent;color:" + C_TXT + ";");
  b.onmouseenter = function() {
    if (accent) { b.style.background = "#33332e"; b.style.borderColor = "#33332e"; }
    else { b.style.borderColor = C_TXT; }
  };
  b.onmouseleave = function() {
    if (accent) { b.style.background = C_INK; b.style.borderColor = C_INK; }
    else { b.style.borderColor = "#c9c9c1"; }
  };
  return b;
}

function clampToViewport(box, x, y) {
  box.style.left = Math.min(x, Math.max(8, window.innerWidth - 300)) + "px";
  box.style.top = Math.min(y, Math.max(8, window.innerHeight - 180)) + "px";
}

function openCommentDialog(target, x, y) {
  closeCommentDialog();
  closePinPopup();
  var info;
  try { info = getElementInfo(target); } catch(e) { return; }

  var box = document.createElement("div");
  box.setAttribute(MARKER, "dialog");
  box.style.cssText = "position:fixed;z-index:100004;background:" + C_CARD + ";border-radius:16px;padding:14px;width:280px;box-shadow:0 16px 44px rgba(0,0,0,0.35);pointer-events:auto;font-family:" + F_MONO + ";";

  var title = document.createElement("div");
  title.style.cssText = "display:flex;align-items:center;gap:7px;font:700 11px " + F_MONO + ";color:" + C_TXT + ";margin-bottom:9px;word-break:break-all;";
  var tSq = document.createElement("span");
  tSq.style.cssText = "width:6px;height:6px;background:" + C_RED + ";display:inline-block;flex:none;";
  title.appendChild(tSq);
  title.appendChild(document.createTextNode((info.elementName && info.elementName.primary ? info.elementName.primary : info.tag) + " \\u00b7 " + info.uiTerm));
  box.appendChild(title);

  var ta = document.createElement("textarea");
  ta.placeholder = "\\uC694\\uCCAD \\uC0AC\\uD56D\\uC744 \\uC785\\uB825\\uD558\\uC138\\uC694\\u2026 (\\u2318+Enter \\uC800\\uC7A5)";
  ta.style.cssText = "width:100%;height:64px;background:#fff;color:" + C_TXT + ";border:1px solid #dcdcd4;border-radius:10px;padding:8px 10px;font:12px " + F_MONO + ";resize:vertical;box-sizing:border-box;outline:none;transition:border-color 0.18s ease;";
  ta.onfocus = function() { ta.style.borderColor = C_TXT; };
  ta.onblur = function() { ta.style.borderColor = "#dcdcd4"; };
  box.appendChild(ta);

  var row = document.createElement("div");
  row.style.cssText = "display:flex;justify-content:flex-end;gap:6px;margin-top:8px;";
  var cancelBtn = makeSmallBtn("\\uCDE8\\uC18C", false);
  cancelBtn.onclick = function() { closeCommentDialog(); };
  var saveBtn = makeSmallBtn("\\uCD94\\uAC00", true);
  function save() {
    var comment = ta.value.trim();
    if (!comment) { ta.focus(); return; }
    wsSend("annotation_add", { comment: comment, element: info, pageUrl: location.href });
    closeCommentDialog();
    showToast("Annotation \\uCD94\\uAC00\\uB428");
  }
  saveBtn.onclick = save;
  row.appendChild(cancelBtn);
  row.appendChild(saveBtn);
  box.appendChild(row);

  ta.onkeydown = function(ev) {
    ev.stopPropagation();
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") { ev.preventDefault(); save(); }
    if (ev.key === "Escape") closeCommentDialog();
  };

  clampToViewport(box, x + 8, y + 8);
  document.documentElement.appendChild(box);
  annDialog = box;
  ta.focus();
}

/* ── Annotations: pin popup (view / edit / resolve / delete) ──── */
function closePinPopup() {
  if (annPopup) { annPopup.remove(); annPopup = null; }
}

function openPinPopup(ann, pin) {
  closePinPopup();
  closeCommentDialog();

  var box = document.createElement("div");
  box.setAttribute(MARKER, "popup");
  var resolved = ann.status === "resolved";
  box.style.cssText = "position:fixed;z-index:100004;background:" + C_CARD + ";border-radius:16px;padding:14px;width:280px;box-shadow:0 16px 44px rgba(0,0,0,0.35);pointer-events:auto;font-family:" + F_MONO + ";";

  var head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;gap:7px;margin-bottom:9px;";
  var numBadge = document.createElement("span");
  numBadge.style.cssText = "font:700 12px " + F_MONO + ";color:" + (resolved ? C_TXT : C_RED) + ";";
  numBadge.textContent = "#" + ann.number;
  head.appendChild(numBadge);
  var statusBadge = document.createElement("span");
  statusBadge.style.cssText = "font:700 8px " + F_MONO + ";padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:0.1em;"
    + (resolved ? "background:" + C_INK + ";color:#f4f4f0;" : "background:" + C_RED + ";color:#fff;");
  statusBadge.textContent = resolved ? "resolved" : "open";
  head.appendChild(statusBadge);
  if (ann.elements && ann.elements.length > 1) {
    var groupChip = document.createElement("span");
    groupChip.style.cssText = "font:700 8px " + F_MONO + ";padding:3px 9px;border-radius:999px;background:" + C_WELL + ";color:#3d3d38;letter-spacing:0.04em;";
    groupChip.textContent = "\\uC694\\uC18C " + ann.elements.length + "\\uAC1C";
    head.appendChild(groupChip);
    /* show which elements belong to this group */
    var groupEls = [];
    for (var gi = 0; gi < ann.elements.length; gi++) {
      var ge = findElementByInfo(ann.elements[gi]);
      if (ge) groupEls.push(ge);
    }
    if (groupEls.length) outlineElements(groupEls, 1600);
  }
  var elName = ann.element && ann.element.elementName ? ann.element.elementName.primary : "";
  if (elName) {
    var nameSpan = document.createElement("span");
    nameSpan.style.cssText = "font:10px " + F_MONO + ";color:" + C_MUTE_L + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;";
    nameSpan.textContent = elName;
    head.appendChild(nameSpan);
  }
  box.appendChild(head);

  var ta = document.createElement("textarea");
  ta.value = ann.comment || "";
  ta.style.cssText = "width:100%;height:56px;background:#fff;color:" + C_TXT + ";border:1px solid #dcdcd4;border-radius:10px;padding:8px 10px;font:12px " + F_MONO + ";resize:vertical;box-sizing:border-box;outline:none;transition:border-color 0.18s ease;";
  ta.onfocus = function() { ta.style.borderColor = C_TXT; };
  ta.onblur = function() { ta.style.borderColor = "#dcdcd4"; };
  box.appendChild(ta);

  if (resolved && ann.resolvedNote) {
    var note = document.createElement("div");
    note.style.cssText = "font:10px/1.6 " + F_MONO + ";color:#3d3d38;background:" + C_WELL + ";border-radius:8px;padding:7px 10px;margin-top:8px;";
    note.textContent = "\\u2713 " + ann.resolvedNote;
    box.appendChild(note);
  }

  var row = document.createElement("div");
  row.style.cssText = "display:flex;justify-content:flex-end;gap:6px;margin-top:8px;";
  var delBtn = makeSmallBtn("\\uC0AD\\uC81C", false);
  delBtn.style.color = C_RED;
  delBtn.onclick = function() {
    wsSend("annotation_remove", { id: ann.id });
    closePinPopup();
  };
  var resolveBtn = makeSmallBtn(resolved ? "\\uB2E4\\uC2DC \\uC5F4\\uAE30" : "\\uD574\\uACB0", false);
  resolveBtn.onclick = function() {
    wsSend("annotation_update", { id: ann.id, status: resolved ? "open" : "resolved" });
    closePinPopup();
  };
  var saveBtn = makeSmallBtn("\\uC800\\uC7A5", true);
  saveBtn.onclick = function() {
    var c = ta.value.trim();
    if (c && c !== ann.comment) wsSend("annotation_update", { id: ann.id, comment: c });
    closePinPopup();
  };
  row.appendChild(delBtn);
  row.appendChild(resolveBtn);
  row.appendChild(saveBtn);
  box.appendChild(row);

  ta.onkeydown = function(ev) {
    ev.stopPropagation();
    if (ev.key === "Escape") closePinPopup();
  };

  var pr = pin.getBoundingClientRect();
  clampToViewport(box, pr.left + 26, pr.top);
  document.documentElement.appendChild(box);
  annPopup = box;
}

/* ── Annotate: drag marquee multi-select ──────────────────────── */
var marqueeEl = null;
var dragStart = null;
var didDrag = false;
var MAX_GROUP = 30;

function collectElementsInRect(rect) {
  if (!document.body) return [];
  var all = document.body.querySelectorAll("*");
  var contained = [];
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (isOwnElement(el)) continue;
    var tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "link" || tag === "meta" || tag === "noscript") continue;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.left >= rect.left && r.right <= rect.right && r.top >= rect.top && r.bottom <= rect.bottom) {
      contained.push(el);
    }
  }
  /* keep outermost only: drop elements whose ancestor is also selected */
  function outermost(pool) {
    var out = [];
    for (var j = 0; j < pool.length; j++) {
      var nested = false;
      for (var k = 0; k < pool.length; k++) {
        if (k !== j && pool[k].contains(pool[j])) { nested = true; break; }
      }
      if (!nested) out.push(pool[j]);
    }
    return out;
  }

  /* drag means "select multiple": if the result collapses to a single
     wrapper/container, descend into its contained elements until the
     selection has 2+ items (or nothing left to descend into) */
  var pool = contained;
  var outer = outermost(pool);
  var depth = 0;
  while (outer.length === 1 && depth < 10) {
    var rest = [];
    for (var m = 0; m < pool.length; m++) {
      if (pool[m] !== outer[0]) rest.push(pool[m]);
    }
    if (rest.length < 2) break;
    pool = rest;
    outer = outermost(pool);
    depth++;
  }
  return outer;
}

function outlineElements(els, ms) {
  var boxes = [];
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (!el || !document.documentElement.contains(el)) continue;
    var r = el.getBoundingClientRect();
    var b = document.createElement("div");
    b.setAttribute(MARKER, "group-outline");
    b.style.cssText = "position:fixed;border:1.5px solid " + C_RED + ";border-radius:3px;background:rgba(255,48,0,0.06);pointer-events:none;z-index:100000;transition:opacity 0.3s;"
      + "left:" + r.x + "px;top:" + r.y + "px;width:" + r.width + "px;height:" + r.height + "px;";
    document.documentElement.appendChild(b);
    boxes.push(b);
  }
  setTimeout(function() {
    for (var j = 0; j < boxes.length; j++) boxes[j].style.opacity = "0";
    setTimeout(function() {
      for (var j = 0; j < boxes.length; j++) boxes[j].remove();
    }, 350);
  }, ms || 1600);
  return boxes;
}

function openGroupCommentDialog(targets, x, y) {
  closeCommentDialog();
  closePinPopup();

  var truncated = targets.length > MAX_GROUP;
  var picked = targets.slice(0, MAX_GROUP);
  var infos = [];
  for (var i = 0; i < picked.length; i++) {
    try { infos.push(getElementInfo(picked[i])); } catch(e) {}
  }
  if (infos.length === 0) return;
  outlineElements(picked, 2000);

  var box = document.createElement("div");
  box.setAttribute(MARKER, "dialog");
  box.style.cssText = "position:fixed;z-index:100004;background:" + C_CARD + ";border-radius:16px;padding:14px;width:300px;box-shadow:0 16px 44px rgba(0,0,0,0.35);pointer-events:auto;font-family:" + F_MONO + ";";

  var title = document.createElement("div");
  title.style.cssText = "display:flex;align-items:center;gap:7px;font:700 11px " + F_MONO + ";color:" + C_TXT + ";margin-bottom:9px;";
  var gSq = document.createElement("span");
  gSq.style.cssText = "width:6px;height:6px;background:" + C_RED + ";display:inline-block;flex:none;";
  title.appendChild(gSq);
  title.appendChild(document.createTextNode("\\uC694\\uC18C " + infos.length + "\\uAC1C \\uC120\\uD0DD\\uB428" + (truncated ? " (\\uCD5C\\uB300 " + MAX_GROUP + "\\uAC1C\\uAE4C\\uC9C0)" : "")));
  box.appendChild(title);

  var listEl = document.createElement("div");
  listEl.style.cssText = "font:10px/1.7 " + F_MONO + ";color:#3d3d38;max-height:72px;overflow-y:auto;background:" + C_WELL + ";border-radius:8px;padding:7px 10px;margin-bottom:9px;word-break:break-all;";
  var previewCount = Math.min(infos.length, 8);
  for (var p = 0; p < previewCount; p++) {
    var row = document.createElement("div");
    var nm = infos[p].elementName || {};
    row.textContent = (p + 1) + ". " + (nm.primary || infos[p].tag) + " \\u00b7 " + infos[p].uiTerm;
    listEl.appendChild(row);
  }
  if (infos.length > previewCount) {
    var more = document.createElement("div");
    more.textContent = "\\u2026 \\uC678 " + (infos.length - previewCount) + "\\uAC1C";
    listEl.appendChild(more);
  }
  box.appendChild(listEl);

  var ta = document.createElement("textarea");
  ta.placeholder = "\\uC120\\uD0DD\\uB41C \\uC694\\uC18C\\uB4E4\\uC5D0 \\uB300\\uD55C \\uC694\\uCCAD\\uC744 \\uC785\\uB825\\uD558\\uC138\\uC694\\u2026 (\\u2318+Enter \\uC800\\uC7A5)";
  ta.style.cssText = "width:100%;height:56px;background:#fff;color:" + C_TXT + ";border:1px solid #dcdcd4;border-radius:10px;padding:8px 10px;font:12px " + F_MONO + ";resize:vertical;box-sizing:border-box;outline:none;transition:border-color 0.18s ease;";
  ta.onfocus = function() { ta.style.borderColor = C_TXT; };
  ta.onblur = function() { ta.style.borderColor = "#dcdcd4"; };
  box.appendChild(ta);

  var row2 = document.createElement("div");
  row2.style.cssText = "display:flex;justify-content:flex-end;gap:6px;margin-top:8px;";
  var cancelBtn = makeSmallBtn("\\uCDE8\\uC18C", false);
  cancelBtn.onclick = function() { closeCommentDialog(); };
  var saveBtn = makeSmallBtn("\\uCD94\\uAC00", true);
  function save() {
    var comment = ta.value.trim();
    if (!comment) { ta.focus(); return; }
    wsSend("annotation_add", {
      comment: comment,
      element: infos[0],
      elements: infos,
      pageUrl: location.href
    });
    closeCommentDialog();
    showToast("\\uADF8\\uB8F9 Annotation \\uCD94\\uAC00\\uB428 (\\uC694\\uC18C " + infos.length + "\\uAC1C)");
  }
  saveBtn.onclick = save;
  row2.appendChild(cancelBtn);
  row2.appendChild(saveBtn);
  box.appendChild(row2);

  ta.onkeydown = function(ev) {
    ev.stopPropagation();
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") { ev.preventDefault(); save(); }
    if (ev.key === "Escape") closeCommentDialog();
  };

  clampToViewport(box, x + 8, y + 8);
  document.documentElement.appendChild(box);
  annDialog = box;
  ta.focus();
}

/* ── Annotations: agent prompt builder (Copy Prompt) ──────────── */
function buildPrompt() {
  var pageAnns = [];
  for (var k = 0; k < annotations.length; k++) {
    if (samePage(annotations[k])) pageAnns.push(annotations[k]);
  }
  var open = [];
  for (var i = 0; i < pageAnns.length; i++) {
    if (pageAnns[i].status === "open") open.push(pageAnns[i]);
  }
  var list = open.length ? open : pageAnns;
  var L = [];
  L.push("# UI Annotations (" + list.length + ")");
  L.push("");
  L.push("\\uB2E4\\uC74C\\uC740 \\uB77C\\uC774\\uBE0C \\uD504\\uB9AC\\uBDF0\\uC5D0\\uC11C \\uC0AC\\uC6A9\\uC790\\uAC00 \\uC694\\uC18C\\uC5D0 \\uB0A8\\uAE34 \\uC218\\uC815 \\uC694\\uCCAD\\uC785\\uB2C8\\uB2E4.");
  L.push("\\uAC01 \\uD56D\\uBAA9\\uC758 \\uC694\\uC18C\\uB97C \\uCC3E\\uC544 \\uC694\\uCCAD\\uC744 \\uBC18\\uC601\\uD558\\uC138\\uC694.");
  L.push("");
  for (var j = 0; j < list.length; j++) {
    var ann = list[j];
    var isGroup = ann.elements && ann.elements.length > 1;
    L.push("## " + ann.number + ". " + (ann.comment || "") + (isGroup ? " (\\uC694\\uC18C " + ann.elements.length + "\\uAC1C)" : ""));
    L.push("- Page: " + (ann.pageUrl || location.href));
    if (isGroup) {
      L.push("- Elements:");
      for (var g = 0; g < ann.elements.length; g++) {
        var ge = ann.elements[g];
        var gnm = ge.elementName || {};
        var lineParts = ["  " + (g + 1) + ") " + (gnm.primary || ge.tag) + " (" + (ge.uiTerm || "?") + ")"];
        if (ge.cssPath || gnm.selector) lineParts.push("\\u0060" + (ge.cssPath || gnm.selector) + "\\u0060");
        if (ge.sourceLocation) lineParts.push(ge.sourceLocation.file + ":" + ge.sourceLocation.line);
        L.push(lineParts.join(" \\u2014 "));
      }
    } else {
      var e = ann.element || {};
      var nm = e.elementName || {};
      if (nm.primary) L.push("- Element: " + nm.primary + " (" + (e.uiTerm || e.tag || "?") + ")");
      if (e.cssPath || nm.selector) L.push("- Selector: \\u0060" + (e.cssPath || nm.selector) + "\\u0060");
      if (e.sourceLocation) L.push("- Source: " + e.sourceLocation.file + ":" + e.sourceLocation.line);
      var txt = (e.textContent || "").trim();
      if (txt) L.push('- Text: "' + txt.slice(0, 80) + '"');
      if (e.boundingRect) L.push("- Size: " + Math.round(e.boundingRect.width) + "\\u00d7" + Math.round(e.boundingRect.height) + "px");
      if (e.htmlSnippet) {
        L.push("- HTML:");
        L.push("\\u0060\\u0060\\u0060html");
        L.push(e.htmlSnippet);
        L.push("\\u0060\\u0060\\u0060");
      }
    }
    L.push("");
  }
  return L.join("\\n");
}

function copyPrompt() {
  var pageCount = 0;
  for (var i = 0; i < annotations.length; i++) {
    if (samePage(annotations[i])) pageCount++;
  }
  if (pageCount === 0) { showToast("\\uC774 \\uD398\\uC774\\uC9C0\\uC5D0 Annotation\\uC774 \\uC5C6\\uC2B5\\uB2C8\\uB2E4"); return; }
  var text = buildPrompt();
  function fallbackCopy() {
    var ta = document.createElement("textarea");
    ta.setAttribute(MARKER, "copy");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:0;";
    document.documentElement.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast("\\uD504\\uB86C\\uD504\\uD2B8 \\uBCF5\\uC0AC\\uB428"); } catch(e) { showToast("\\uBCF5\\uC0AC \\uC2E4\\uD328"); }
    ta.remove();
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showToast("\\uD504\\uB86C\\uD504\\uD2B8 \\uBCF5\\uC0AC\\uB428 (" + annotations.length + "\\uAC1C)");
    }, fallbackCopy);
  } else {
    fallbackCopy();
  }
}

/* ── Agent highlight (agent → user visual pointing) ───────────── */
function flashHighlight(data) {
  var el = null;
  if (data.selector) { try { el = document.querySelector(data.selector); } catch(e) {} }
  if (!el && data.dataAt) {
    try { el = document.querySelector('[data-at^="' + data.dataAt + '"]'); } catch(e) {}
  }
  if (!el) return;
  try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch(e) {}

  var hl = document.createElement("div");
  hl.setAttribute(MARKER, "highlight");
  hl.style.cssText = "position:fixed;border:2px solid " + C_RED + ";border-radius:4px;background:rgba(255,48,0,0.1);pointer-events:none;z-index:100000;transition:opacity 0.3s;";
  document.documentElement.appendChild(hl);
  var lbl = null;
  if (data.label) {
    lbl = document.createElement("div");
    lbl.setAttribute(MARKER, "highlight-label");
    lbl.style.cssText = "position:fixed;background:" + C_RED + ";color:#fff;padding:4px 11px;border-radius:999px;font:700 10px " + F_MONO + ";letter-spacing:0.02em;pointer-events:none;z-index:100000;white-space:nowrap;";
    lbl.textContent = data.label;
    document.documentElement.appendChild(lbl);
  }
  var t0 = Date.now();
  var iv = setInterval(function() {
    if (!document.documentElement.contains(el)) {
      clearInterval(iv); hl.remove(); if (lbl) lbl.remove(); return;
    }
    var r = el.getBoundingClientRect();
    hl.style.left = (r.x - 4) + "px";
    hl.style.top = (r.y - 4) + "px";
    hl.style.width = (r.width + 8) + "px";
    hl.style.height = (r.height + 8) + "px";
    if (lbl) {
      lbl.style.left = r.x + "px";
      lbl.style.top = Math.max(0, r.y - 28) + "px";
    }
    if (Date.now() - t0 > 2500) {
      clearInterval(iv);
      hl.style.opacity = "0";
      if (lbl) lbl.style.opacity = "0";
      setTimeout(function() { hl.remove(); if (lbl) lbl.remove(); }, 350);
    }
  }, 50);
}

/* ── Toolbar: brand circle + mode capsule + CTA capsule ───────── */
var toolbar = document.createElement("div");
toolbar.setAttribute(MARKER, "toolbar");
toolbar.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:100003;display:flex;align-items:center;gap:8px;pointer-events:auto;font-family:" + F_SANS + ";transition:right 0.3s cubic-bezier(0.16,1,0.3,1);";

/* brand circle — click turns every mode off */
var brandBtn = document.createElement("button");
brandBtn.setAttribute(MARKER, "btn");
brandBtn.textContent = "\\u25C9"; /* ◉ */
brandBtn.title = "\\uBAA8\\uB4E0 \\uBAA8\\uB4DC \\uD574\\uC81C (ESC)"; /* 모든 모드 해제 */
brandBtn.style.cssText = "width:44px;height:44px;flex:none;border-radius:50%;background:" + C_INK + ";color:#f4f4f0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 6px 20px rgba(0,0,0,0.35);transition:transform 0.18s ease,color 0.18s ease;";
brandBtn.onmouseenter = function() { brandBtn.style.transform = "scale(1.07)"; brandBtn.style.color = C_RED; };
brandBtn.onmouseleave = function() { brandBtn.style.transform = "scale(1)"; brandBtn.style.color = "#f4f4f0"; };
brandBtn.onclick = function() {
  if (inspectorEnabled) {
    inspectorEnabled = false;
    wsSend("inspector_state", { enabled: false });
    hidePanel();
  }
  annotateEnabled = false;
  hoverBox.style.display = "none";
  labelEl.style.display = "none";
  closeCommentDialog();
  closePinPopup();
  hideBulkMenu();
  updateToolbarState();
};
toolbar.appendChild(brandBtn);

/* mode capsule: Inspect | Annotate | 정리 */
var modeGroup = document.createElement("div");
modeGroup.setAttribute(MARKER, "mode-group");
modeGroup.style.cssText = "display:flex;align-items:center;background:" + C_INK + ";border-radius:999px;padding:4px;box-shadow:0 6px 20px rgba(0,0,0,0.35);";

function makeModeBtn() {
  var b = document.createElement("button");
  b.setAttribute(MARKER, "btn");
  b.style.cssText = "padding:9px 16px;border:none;background:transparent;color:" + C_MUTE_D + ";cursor:pointer;font:13px " + F_SANS + ";letter-spacing:0.01em;border-radius:999px;transition:color 0.18s ease,background 0.18s ease;white-space:nowrap;";
  b.onmouseenter = function() { b.style.color = "#f4f4f0"; };
  b.onmouseleave = function() { updateToolbarState(); };
  return b;
}
function makeDivider() {
  var d = document.createElement("span");
  d.style.cssText = "width:1px;height:15px;background:#33332f;flex:none;";
  return d;
}

var toggleBtn = makeModeBtn();
toggleBtn.onclick = function() {
  inspectorEnabled = !inspectorEnabled;
  if (inspectorEnabled) {
    annotateEnabled = false;
    closeCommentDialog();
  }
  wsSend("inspector_state", { enabled: inspectorEnabled });
  updateToolbarState();
  if (!inspectorEnabled) {
    hoverBox.style.display = "none";
    labelEl.style.display = "none";
    hidePanel();
  }
};
modeGroup.appendChild(toggleBtn);
modeGroup.appendChild(makeDivider());

var annotateBtn = makeModeBtn();
annotateBtn.onclick = function() {
  annotateEnabled = !annotateEnabled;
  if (annotateEnabled && inspectorEnabled) {
    inspectorEnabled = false;
    wsSend("inspector_state", { enabled: false });
    hidePanel();
  }
  updateToolbarState();
  if (!annotateEnabled) {
    hoverBox.style.display = "none";
    labelEl.style.display = "none";
    closeCommentDialog();
  }
};
modeGroup.appendChild(annotateBtn);
modeGroup.appendChild(makeDivider());

var bulkBtn = makeModeBtn();
bulkBtn.textContent = "\\uC815\\uB9AC \\u25BE"; /* 정리 ▾ */
bulkBtn.onclick = function(e) { e.stopPropagation(); toggleBulkMenu(); };
modeGroup.appendChild(bulkBtn);
toolbar.appendChild(modeGroup);

/* CTA capsule — inverts on hover */
var promptBtn = document.createElement("button");
promptBtn.setAttribute(MARKER, "btn");
promptBtn.textContent = "Copy Prompt";
promptBtn.style.cssText = "padding:12px 20px;border:none;border-radius:999px;background:" + C_INK + ";color:#f4f4f0;font:600 13px " + F_SANS + ";letter-spacing:0.01em;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.35);transition:background 0.18s ease,color 0.18s ease;white-space:nowrap;";
promptBtn.onmouseenter = function() { promptBtn.style.background = "#f4f4f0"; promptBtn.style.color = C_TXT; };
promptBtn.onmouseleave = function() { promptBtn.style.background = C_INK; promptBtn.style.color = "#f4f4f0"; };
promptBtn.onclick = copyPrompt;
toolbar.appendChild(promptBtn);
document.documentElement.appendChild(toolbar);

/* ── Bulk Manage Menu (page / all resolve & delete) ───────────── */
var bulkMenu = document.createElement("div");
bulkMenu.setAttribute(MARKER, "bulk-menu");
bulkMenu.style.cssText = "position:fixed;bottom:74px;right:18px;z-index:100004;background:" + C_CARD + ";border-radius:16px;padding:8px;width:236px;box-shadow:0 16px 44px rgba(0,0,0,0.35);pointer-events:auto;font-family:" + F_MONO + ";display:none;transition:right 0.3s cubic-bezier(0.16,1,0.3,1);";
document.documentElement.appendChild(bulkMenu);
var bulkArmed = null; /* which delete action is armed for confirm */
var bulkArmTimer = null;

function bulkPageIds(openOnly) {
  var ids = [];
  for (var i = 0; i < annotations.length; i++) {
    var a = annotations[i];
    if (!samePage(a)) continue;
    if (openOnly && a.status !== "open") continue;
    ids.push(a.id);
  }
  return ids;
}
function bulkAllIds(openOnly) {
  var ids = [];
  for (var i = 0; i < annotations.length; i++) {
    if (openOnly && annotations[i].status !== "open") continue;
    ids.push(annotations[i].id);
  }
  return ids;
}
function bulkCounts() {
  var pageOpen = 0, pageTotal = 0, allOpen = 0, allTotal = 0;
  for (var i = 0; i < annotations.length; i++) {
    var a = annotations[i];
    allTotal++;
    if (a.status === "open") allOpen++;
    if (samePage(a)) {
      pageTotal++;
      if (a.status === "open") pageOpen++;
    }
  }
  return { pageOpen: pageOpen, pageTotal: pageTotal, allOpen: allOpen, allTotal: allTotal };
}

function clearBulkArm() {
  bulkArmed = null;
  if (bulkArmTimer) { clearTimeout(bulkArmTimer); bulkArmTimer = null; }
}

function bulkSectionLabel(text) {
  var el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;gap:6px;font:700 9px " + F_MONO + ";color:" + C_MUTE_L + ";text-transform:uppercase;letter-spacing:0.14em;padding:8px 10px 4px;";
  var sq = document.createElement("span");
  sq.style.cssText = "width:5px;height:5px;background:" + C_RED + ";display:inline-block;flex:none;";
  el.appendChild(sq);
  el.appendChild(document.createTextNode(text));
  return el;
}

function bulkRow(key, label, count, accent, action) {
  var row = document.createElement("button");
  row.setAttribute(MARKER, "btn");
  var disabled = count === 0;
  var armed = bulkArmed === key;
  row.style.cssText = "display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box;padding:8px 10px;border:none;border-radius:9px;transition:background 0.15s ease;background:"
    + (armed ? C_RED : "transparent") + ";color:"
    + (disabled ? "#b8b8b0" : armed ? "#fff" : accent) + ";cursor:"
    + (disabled ? "default" : "pointer") + ";font:12px " + F_MONO + ";text-align:left;";
  var left = document.createElement("span");
  left.textContent = armed ? "\\uD55C \\uBC88 \\uB354 \\uD074\\uB9AD \\u2192 \\uC0AD\\uC81C" : label; /* 한 번 더 클릭 → 삭제 */
  var right = document.createElement("span");
  right.style.cssText = "font-size:11px;color:" + (disabled ? "#b8b8b0" : armed ? "#fff" : "#8a8a84") + ";";
  right.textContent = String(count);
  row.appendChild(left);
  row.appendChild(right);
  if (!disabled) {
    row.onmouseenter = function() { if (bulkArmed !== key) row.style.background = C_WELL; };
    row.onmouseleave = function() { if (bulkArmed !== key) row.style.background = "transparent"; };
    row.onclick = function(e) { e.stopPropagation(); action(); };
  }
  return row;
}

function renderBulkMenu() {
  while (bulkMenu.firstChild) bulkMenu.removeChild(bulkMenu.firstChild);
  var c = bulkCounts();

  bulkMenu.appendChild(bulkSectionLabel("\\uC774 \\uD398\\uC774\\uC9C0")); /* 이 페이지 */
  bulkMenu.appendChild(bulkRow("page-resolve", "\\u2713 \\uD574\\uACB0", c.pageOpen, C_TXT, function() {
    wsSend("annotations_bulk_update", { ids: bulkPageIds(true), status: "resolved" });
    hideBulkMenu();
    showToast("\\uC774 \\uD398\\uC774\\uC9C0 " + c.pageOpen + "\\uAC1C \\uD574\\uACB0\\uB428");
  }));
  bulkMenu.appendChild(bulkRow("page-delete", "\\u2715 \\uC0AD\\uC81C", c.pageTotal, C_RED, function() {
    if (bulkArmed !== "page-delete") { armBulk("page-delete"); return; }
    var n = c.pageTotal;
    wsSend("annotations_bulk_remove", { ids: bulkPageIds(false) });
    hideBulkMenu();
    showToast("\\uC774 \\uD398\\uC774\\uC9C0 " + n + "\\uAC1C \\uC0AD\\uC81C\\uB428");
  }));

  var div = document.createElement("div");
  div.style.cssText = "height:1px;background:#e0ded6;margin:5px 8px;";
  bulkMenu.appendChild(div);

  bulkMenu.appendChild(bulkSectionLabel("\\uC804\\uCCB4 (\\uBAA8\\uB4E0 \\uD398\\uC774\\uC9C0)")); /* 전체 (모든 페이지) */
  bulkMenu.appendChild(bulkRow("all-resolve", "\\u2713 \\uD574\\uACB0", c.allOpen, C_TXT, function() {
    wsSend("annotations_bulk_update", { ids: bulkAllIds(true), status: "resolved" });
    hideBulkMenu();
    showToast("\\uC804\\uCCB4 " + c.allOpen + "\\uAC1C \\uD574\\uACB0\\uB428");
  }));
  bulkMenu.appendChild(bulkRow("all-delete", "\\u2715 \\uC0AD\\uC81C", c.allTotal, C_RED, function() {
    if (bulkArmed !== "all-delete") { armBulk("all-delete"); return; }
    var n = c.allTotal;
    wsSend("annotations_bulk_remove", { ids: bulkAllIds(false) });
    hideBulkMenu();
    showToast("\\uC804\\uCCB4 " + n + "\\uAC1C \\uC0AD\\uC81C\\uB428");
  }));
}

function armBulk(key) {
  bulkArmed = key;
  if (bulkArmTimer) clearTimeout(bulkArmTimer);
  bulkArmTimer = setTimeout(function() { clearBulkArm(); renderBulkMenu(); }, 3000);
  renderBulkMenu();
}
function showBulkMenu() { clearBulkArm(); renderBulkMenu(); bulkMenu.style.display = "block"; }
function hideBulkMenu() { clearBulkArm(); bulkMenu.style.display = "none"; }
function toggleBulkMenu() {
  if (bulkMenu.style.display === "none") showBulkMenu();
  else hideBulkMenu();
}
/* close menu on outside click */
document.addEventListener("click", function(e) {
  if (bulkMenu.style.display === "none") return;
  if (e.target === bulkBtn || (e.target.closest && e.target.closest("[" + MARKER + "=\\"bulk-menu\\"]"))) return;
  hideBulkMenu();
}, false);

/* ── DOM Guard: re-attach if framework removes our elements ── */
var guardEls = [overlay, panel, toolbar, pinLayer, bulkMenu];
var observer = new MutationObserver(function(mutations) {
  for (var i = 0; i < guardEls.length; i++) {
    ensureAttached(guardEls[i]);
  }
});
observer.observe(document.documentElement, { childList: true });

function setModeBtnState(btn, label, on) {
  while (btn.firstChild) btn.removeChild(btn.firstChild);
  if (on) {
    var dot = document.createElement("span");
    dot.style.cssText = "display:inline-block;width:6px;height:6px;border-radius:50%;background:" + C_RED + ";margin-right:7px;vertical-align:1px;";
    btn.appendChild(dot);
  }
  btn.appendChild(document.createTextNode(label));
  btn.style.color = on ? "#f4f4f0" : C_MUTE_D;
  btn.style.background = on ? "#2a2a26" : "transparent";
}

function updateToolbarState() {
  setModeBtnState(toggleBtn, "Inspect", inspectorEnabled);
  setModeBtnState(annotateBtn, "Annotate", annotateEnabled);

  var openCount = 0;
  var pageTotal = 0;
  for (var i = 0; i < annotations.length; i++) {
    if (!samePage(annotations[i])) continue;
    pageTotal++;
    if (annotations[i].status === "open") openCount++;
  }
  promptBtn.textContent = pageTotal > 0
    ? "Copy Prompt (" + openCount + "/" + pageTotal + ")"
    : "Copy Prompt";
  /* keep bulk menu counts fresh while open */
  if (bulkMenu && bulkMenu.style.display !== "none") renderBulkMenu();
}

/* ── Event Handlers ───────────────────────────────────────────── */
function isOwnElement(el) {
  return el && el.closest && el.closest("[" + MARKER + "]") !== null;
}

function updateLabel(info) {
  while (labelEl.firstChild) labelEl.removeChild(labelEl.firstChild);
  var termSpan = document.createElement("span");
  termSpan.style.cssText = "color:" + C_RED + ";margin-right:8px;font-weight:700;";
  termSpan.textContent = info.uiTerm;
  labelEl.appendChild(termSpan);
  if (info.elementName && info.elementName.primary && info.elementName.primarySource !== "tag") {
    var nameSpan = document.createElement("span");
    nameSpan.style.cssText = "color:#f4f4f0;margin-right:8px;";
    var nameTxt = info.elementName.primary;
    if (nameTxt.length > 32) nameTxt = nameTxt.slice(0, 32) + "\\u2026";
    nameSpan.textContent = nameTxt;
    labelEl.appendChild(nameSpan);
  }
  if (info.sourceLocation) {
    var srcSpan = document.createElement("span");
    srcSpan.style.color = C_MUTE_D;
    srcSpan.textContent = info.sourceLocation.file + ":" + info.sourceLocation.line;
    labelEl.appendChild(srcSpan);
  }
}

document.addEventListener("mousedown", function(e) {
  if (!annotateEnabled || e.button !== 0) return;
  if (isOwnElement(e.target)) return;
  dragStart = { x: e.clientX, y: e.clientY };
  didDrag = false;
}, true);

document.addEventListener("mouseup", function(e) {
  if (!annotateEnabled || !dragStart) return;
  var start = dragStart;
  dragStart = null;
  if (marqueeEl) { marqueeEl.remove(); marqueeEl = null; }
  if (!didDrag) return; /* plain click → click handler opens single dialog */
  e.preventDefault();
  e.stopPropagation();
  var rect = {
    left: Math.min(start.x, e.clientX),
    top: Math.min(start.y, e.clientY),
    right: Math.max(start.x, e.clientX),
    bottom: Math.max(start.y, e.clientY)
  };
  try {
    var selected = collectElementsInRect(rect);
    if (selected.length === 0) {
      showToast("\\uC601\\uC5ED\\uC5D0 \\uC644\\uC804\\uD788 \\uD3EC\\uD568\\uB41C \\uC694\\uC18C\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4");
    } else {
      openGroupCommentDialog(selected, e.clientX, e.clientY);
    }
  } catch(err) {
    console.error("[Gemini Inspector] Marquee handler error:", err);
  }
  /* keep didDrag until after the click event fires, then reset */
  setTimeout(function() { didDrag = false; }, 0);
}, true);

document.addEventListener("mousemove", function(e) {
  if (!inspectorEnabled && !annotateEnabled) return;

  /* annotate drag: draw marquee instead of hover box */
  if (annotateEnabled && dragStart) {
    var dx = Math.abs(e.clientX - dragStart.x);
    var dy = Math.abs(e.clientY - dragStart.y);
    if (didDrag || dx > 5 || dy > 5) {
      didDrag = true;
      e.preventDefault();
      if (!marqueeEl) {
        marqueeEl = document.createElement("div");
        marqueeEl.setAttribute(MARKER, "marquee");
        marqueeEl.style.cssText = "position:fixed;border:1.5px dashed " + C_RED + ";background:rgba(255,48,0,0.05);pointer-events:none;z-index:100001;";
        document.documentElement.appendChild(marqueeEl);
      }
      hoverBox.style.display = "none";
      labelEl.style.display = "none";
      marqueeEl.style.left = Math.min(dragStart.x, e.clientX) + "px";
      marqueeEl.style.top = Math.min(dragStart.y, e.clientY) + "px";
      marqueeEl.style.width = Math.abs(e.clientX - dragStart.x) + "px";
      marqueeEl.style.height = Math.abs(e.clientY - dragStart.y) + "px";
      return;
    }
  }

  var target = e.target;
  if (isOwnElement(target)) { hoverBox.style.display = "none"; return; }
  var rect = target.getBoundingClientRect();
  hoverBox.style.display = "block";
  hoverBox.style.borderColor = annotateEnabled ? C_RED : "#141414";
  hoverBox.style.background = annotateEnabled ? "rgba(255,48,0,0.05)" : "rgba(20,20,20,0.05)";
  hoverBox.style.left = rect.x + "px";
  hoverBox.style.top = rect.y + "px";
  hoverBox.style.width = rect.width + "px";
  hoverBox.style.height = rect.height + "px";
}, true);

document.addEventListener("click", function(e) {
  if (!inspectorEnabled && !annotateEnabled) return;
  var target = e.target;
  if (isOwnElement(target)) return;
  e.preventDefault();
  e.stopPropagation();
  if (didDrag) return; /* marquee selection just finished — suppress click */

  if (annotateEnabled) {
    try {
      openCommentDialog(target, e.clientX, e.clientY);
    } catch(err) {
      console.error("[Gemini Inspector] Annotate handler error:", err);
    }
    return;
  }

  try {
    var info = getElementInfo(target);

    ensureAttached(overlay);
    ensureAttached(panel);

    labelEl.style.display = "block";
    labelEl.style.left = info.boundingRect.x + "px";
    labelEl.style.top = Math.max(0, info.boundingRect.y - 32) + "px";
    updateLabel(info);

    renderPanel(info);
    wsSend("element_selected", info);
  } catch(err) {
    console.error("[Gemini Inspector] Click handler error:", err);
  }
}, true);

/* ── ESC: close dialogs / menu, then exit inspector & annotate ── */
document.addEventListener("keydown", function(e) {
  if (e.key !== "Escape" && e.keyCode !== 27) return;

  /* 1) an open dialog or pin popup takes priority */
  if (annDialog || annPopup) {
    closeCommentDialog();
    closePinPopup();
    e.preventDefault();
    return;
  }
  /* 2) an open bulk menu */
  if (bulkMenu && bulkMenu.style.display !== "none") {
    hideBulkMenu();
    e.preventDefault();
    return;
  }
  /* 3) exit whichever modes are active */
  if (inspectorEnabled || annotateEnabled) {
    if (inspectorEnabled) {
      inspectorEnabled = false;
      wsSend("inspector_state", { enabled: false });
      hidePanel();
    }
    annotateEnabled = false;
    hoverBox.style.display = "none";
    labelEl.style.display = "none";
    closeCommentDialog();
    updateToolbarState();
    showToast("\\uC778\\uC2A4\\uD399\\uD130 \\uD574\\uC81C (ESC)"); /* 인스펙터 해제 */
    e.preventDefault();
  }
}, true);

/* ── Init ─────────────────────────────────────────────────────── */
updateToolbarState();
connectWS();
console.log("[Gemini Inspector] Injected. WSBridge port: " + WS_PORT);
})();`;
}
