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
hoverBox.style.cssText = "position:fixed;border:2px solid #3b82f6;background:rgba(59,130,246,0.1);pointer-events:none;display:none;transition:all 0.1s ease;z-index:99999;";
overlay.appendChild(hoverBox);

var labelEl = document.createElement("div");
labelEl.setAttribute(MARKER, "label");
labelEl.style.cssText = "position:fixed;background:#1e293b;color:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:12px;font-family:monospace;pointer-events:none;white-space:nowrap;z-index:100000;display:none;";
overlay.appendChild(labelEl);

/* ── Code Panel (Side Panel) ──────────────────────────────────── */
var panel = document.createElement("div");
panel.setAttribute(MARKER, "panel");
panel.style.cssText = "position:fixed;top:0;right:0;width:320px;height:100vh;background:#0f172a;color:#e2e8f0;font-family:'SF Mono',SFMono-Regular,ui-monospace,Menlo,monospace;font-size:13px;z-index:100002;transform:translateX(100%);transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);overflow-y:auto;border-left:1px solid #1e293b;box-shadow:-4px 0 20px rgba(0,0,0,0.3);pointer-events:auto;";

var panelHeader = document.createElement("div");
panelHeader.setAttribute(MARKER, "panel-header");
panelHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #1e293b;position:sticky;top:0;background:#0f172a;z-index:1;";
var panelTitle = document.createElement("span");
panelTitle.style.cssText = "font-weight:700;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;";
panelTitle.textContent = "Inspector";
panelHeader.appendChild(panelTitle);
var closeBtn = document.createElement("button");
closeBtn.setAttribute(MARKER, "btn");
closeBtn.textContent = "\\u2715";
closeBtn.style.cssText = "background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;";
closeBtn.onmouseenter = function() { closeBtn.style.color = "#e2e8f0"; };
closeBtn.onmouseleave = function() { closeBtn.style.color = "#64748b"; };
closeBtn.onclick = function() { hidePanel(); };
panelHeader.appendChild(closeBtn);
panel.appendChild(panelHeader);

var panelBody = document.createElement("div");
panelBody.setAttribute(MARKER, "panel-body");
panelBody.style.cssText = "padding:12px 16px;display:flex;flex-direction:column;gap:16px;";
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
}
function hidePanel() { panel.style.transform = "translateX(100%)"; panelVisible = false; }

function createSectionLabel(text) {
  var el = document.createElement("div");
  el.style.cssText = "font-weight:700;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;";
  el.textContent = text;
  return el;
}

function renderPanel(info) {
  while (panelBody.firstChild) panelBody.removeChild(panelBody.firstChild);

  /* Name (정확한 이름) */
  if (info.elementName) {
    var nm = info.elementName;
    var nameSection = document.createElement("div");
    nameSection.appendChild(createSectionLabel("Name"));

    var nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;";
    var primaryEl = document.createElement("div");
    primaryEl.style.cssText = "font-size:14px;font-weight:700;color:#fbbf24;word-break:break-all;line-height:1.3;";
    primaryEl.textContent = nm.primary;
    nameRow.appendChild(primaryEl);
    if (nm.primarySource) {
      var srcTag = document.createElement("span");
      srcTag.style.cssText = "font-size:9px;color:#64748b;background:#1e293b;padding:1px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:0.05em;";
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
      detailGrid.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:11px;";
      for (var ri = 0; ri < rows.length; ri++) {
        var kSpan = document.createElement("span");
        kSpan.style.color = "#64748b";
        kSpan.textContent = rows[ri][0];
        var vSpan = document.createElement("span");
        vSpan.style.cssText = "color:#cbd5e1;word-break:break-all;";
        vSpan.textContent = rows[ri][1];
        detailGrid.appendChild(kSpan);
        detailGrid.appendChild(vSpan);
      }
      nameSection.appendChild(detailGrid);
    }

    if (nm.selector) {
      var selEl = document.createElement("div");
      selEl.style.cssText = "margin-top:6px;font-size:10px;color:#94a3b8;background:#0c1524;padding:4px 6px;border-radius:3px;word-break:break-all;font-family:'SF Mono',monospace;";
      selEl.textContent = nm.selector;
      nameSection.appendChild(selEl);
    }

    panelBody.appendChild(nameSection);
  }

  /* Source */
  if (info.sourceLocation) {
    var srcSection = document.createElement("div");
    srcSection.appendChild(createSectionLabel("Source"));
    var srcVal = document.createElement("div");
    srcVal.style.cssText = "color:#3b82f6;word-break:break-all;";
    srcVal.textContent = info.sourceLocation.file + ":" + info.sourceLocation.line;
    srcSection.appendChild(srcVal);
    panelBody.appendChild(srcSection);
  }

  /* Design Term */
  var termSection = document.createElement("div");
  termSection.appendChild(createSectionLabel("Design Term"));
  var badge = document.createElement("div");
  badge.style.cssText = "display:inline-block;padding:2px 8px;border-radius:4px;background:#1e3a5f;color:#60a5fa;font-size:12px;font-weight:700;margin-bottom:6px;";
  badge.textContent = info.uiTerm;
  termSection.appendChild(badge);
  if (info.uiDescription) {
    var desc = document.createElement("div");
    desc.style.cssText = "font-size:11px;color:#94a3b8;line-height:1.5;padding:6px 8px;background:#0c1524;border-radius:4px;border-left:2px solid #1e3a5f;";
    desc.textContent = info.uiDescription;
    termSection.appendChild(desc);
  }
  panelBody.appendChild(termSection);

  /* Element */
  var elSection = document.createElement("div");
  elSection.appendChild(createSectionLabel("Element"));
  var tagEl = document.createElement("div");
  tagEl.style.color = "#f472b6";
  tagEl.textContent = "<" + info.tag + ">";
  elSection.appendChild(tagEl);
  if (info.className) {
    var clsEl = document.createElement("div");
    clsEl.style.cssText = "color:#94a3b8;font-size:11px;margin-top:4px;word-break:break-all;max-height:60px;overflow:hidden;";
    clsEl.textContent = info.className;
    elSection.appendChild(clsEl);
  }
  panelBody.appendChild(elSection);

  /* Computed Styles */
  var styleSection = document.createElement("div");
  styleSection.appendChild(createSectionLabel("Styles"));
  var grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:11px;";
  var keys = Object.keys(info.computedStyles);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = info.computedStyles[k];
    if (!v || v === "normal" || v === "static" || v === "none" || v === "0px" || v === "auto") continue;
    var kSpan = document.createElement("span");
    kSpan.style.color = "#94a3b8";
    kSpan.textContent = k.replace(/([A-Z])/g, function(m) { return "-" + m.toLowerCase(); });
    var vSpan = document.createElement("span");
    vSpan.style.color = "#67e8f9";
    vSpan.textContent = v;
    grid.appendChild(kSpan);
    grid.appendChild(vSpan);
  }
  styleSection.appendChild(grid);
  panelBody.appendChild(styleSection);

  /* Size */
  var sizeSection = document.createElement("div");
  sizeSection.appendChild(createSectionLabel("Size"));
  var sizeVal = document.createElement("div");
  sizeVal.style.cssText = "font-size:12px;color:#a78bfa;";
  sizeVal.textContent = Math.round(info.boundingRect.width) + " \\u00d7 " + Math.round(info.boundingRect.height) + "px";
  sizeSection.appendChild(sizeVal);
  panelBody.appendChild(sizeSection);

  /* Text */
  var txt = (info.textContent || "").trim();
  if (txt.length > 0) {
    var txtSection = document.createElement("div");
    txtSection.appendChild(createSectionLabel("Text"));
    var txtVal = document.createElement("div");
    txtVal.style.cssText = "font-size:11px;color:#cbd5e1;max-height:60px;overflow:hidden;text-overflow:ellipsis;word-break:break-all;";
    txtVal.textContent = txt.slice(0, 100);
    txtSection.appendChild(txtVal);
    panelBody.appendChild(txtSection);
  }

  /* Parent Chain */
  if (info.parentChain && info.parentChain.length > 0) {
    var chainSection = document.createElement("div");
    chainSection.appendChild(createSectionLabel("Parent Chain"));
    var chainVal = document.createElement("div");
    chainVal.style.cssText = "font-size:10px;color:#64748b;line-height:1.6;word-break:break-all;max-height:80px;overflow:hidden;";
    chainVal.textContent = info.parentChain.slice(0, 6).join(" > ");
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
  toastEl.style.cssText = "position:fixed;bottom:64px;right:16px;background:#1e293b;color:#e2e8f0;padding:8px 14px;border-radius:6px;font:12px system-ui,sans-serif;z-index:100005;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:1px solid #334155;pointer-events:none;";
  toastEl.textContent = text;
  document.documentElement.appendChild(toastEl);
  toastTimer = setTimeout(function() {
    if (toastEl) { toastEl.remove(); toastEl = null; }
  }, 2200);
}

/* ── Annotations: element re-anchoring ────────────────────────── */
function findAnnotationEl(ann) {
  var e = ann.element || {};
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

/* ── Annotations: pins ────────────────────────────────────────── */
function createPin(ann, indexInGroup) {
  var pin = document.createElement("div");
  pin.setAttribute(MARKER, "pin");
  var resolved = ann.status === "resolved";
  pin.style.cssText = "position:fixed;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 11px system-ui,sans-serif;cursor:pointer;pointer-events:auto;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #fff;"
    + (resolved ? "background:#16a34a;color:#fff;" : "background:#f59e0b;color:#1c1917;");
  pin.textContent = resolved ? "\\u2713" : String(ann.number);
  pin.title = ann.comment || "";
  pin._ann = ann;
  pin._offset = indexInGroup;
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

(function pinLoop() {
  try { if (annotations.length > 0) positionPins(); } catch(e) {}
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
  b.style.cssText = "padding:4px 10px;border-radius:5px;font:12px system-ui,sans-serif;cursor:pointer;border:1px solid "
    + (accent ? "#f59e0b;background:#f59e0b;color:#1c1917;font-weight:700;" : "#334155;background:transparent;color:#94a3b8;");
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
  box.style.cssText = "position:fixed;z-index:100004;background:#0f172a;border:1px solid #f59e0b;border-radius:8px;padding:10px;width:280px;box-shadow:0 8px 30px rgba(0,0,0,0.5);pointer-events:auto;font-family:system-ui,sans-serif;";

  var title = document.createElement("div");
  title.style.cssText = "font-size:11px;color:#f59e0b;font-weight:700;margin-bottom:6px;word-break:break-all;";
  title.textContent = (info.elementName && info.elementName.primary ? info.elementName.primary : info.tag) + " \\u00b7 " + info.uiTerm;
  box.appendChild(title);

  var ta = document.createElement("textarea");
  ta.placeholder = "\\uC694\\uCCAD \\uC0AC\\uD56D\\uC744 \\uC785\\uB825\\uD558\\uC138\\uC694\\u2026 (\\u2318+Enter \\uC800\\uC7A5)";
  ta.style.cssText = "width:100%;height:64px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none;";
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
  box.style.cssText = "position:fixed;z-index:100004;background:#0f172a;border:1px solid " + (resolved ? "#16a34a" : "#f59e0b") + ";border-radius:8px;padding:10px;width:280px;box-shadow:0 8px 30px rgba(0,0,0,0.5);pointer-events:auto;font-family:system-ui,sans-serif;";

  var head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  var numBadge = document.createElement("span");
  numBadge.style.cssText = "font:700 11px system-ui;color:" + (resolved ? "#16a34a" : "#f59e0b") + ";";
  numBadge.textContent = "#" + ann.number;
  head.appendChild(numBadge);
  var statusBadge = document.createElement("span");
  statusBadge.style.cssText = "font-size:9px;padding:1px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:0.05em;"
    + (resolved ? "background:#052e16;color:#4ade80;" : "background:#451a03;color:#fbbf24;");
  statusBadge.textContent = resolved ? "resolved" : "open";
  head.appendChild(statusBadge);
  var elName = ann.element && ann.element.elementName ? ann.element.elementName.primary : "";
  if (elName) {
    var nameSpan = document.createElement("span");
    nameSpan.style.cssText = "font-size:10px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;";
    nameSpan.textContent = elName;
    head.appendChild(nameSpan);
  }
  box.appendChild(head);

  var ta = document.createElement("textarea");
  ta.value = ann.comment || "";
  ta.style.cssText = "width:100%;height:56px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none;";
  box.appendChild(ta);

  if (resolved && ann.resolvedNote) {
    var note = document.createElement("div");
    note.style.cssText = "font-size:11px;color:#4ade80;background:#052e16;border-radius:4px;padding:5px 8px;margin-top:6px;line-height:1.4;";
    note.textContent = "\\u2713 " + ann.resolvedNote;
    box.appendChild(note);
  }

  var row = document.createElement("div");
  row.style.cssText = "display:flex;justify-content:flex-end;gap:6px;margin-top:8px;";
  var delBtn = makeSmallBtn("\\uC0AD\\uC81C", false);
  delBtn.style.color = "#f87171";
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

/* ── Annotations: agent prompt builder (Copy Prompt) ──────────── */
function buildPrompt() {
  var open = [];
  for (var i = 0; i < annotations.length; i++) {
    if (annotations[i].status === "open") open.push(annotations[i]);
  }
  var list = open.length ? open : annotations;
  var L = [];
  L.push("# UI Annotations (" + list.length + ")");
  L.push("");
  L.push("\\uB2E4\\uC74C\\uC740 \\uB77C\\uC774\\uBE0C \\uD504\\uB9AC\\uBDF0\\uC5D0\\uC11C \\uC0AC\\uC6A9\\uC790\\uAC00 \\uC694\\uC18C\\uC5D0 \\uB0A8\\uAE34 \\uC218\\uC815 \\uC694\\uCCAD\\uC785\\uB2C8\\uB2E4.");
  L.push("\\uAC01 \\uD56D\\uBAA9\\uC758 \\uC694\\uC18C\\uB97C \\uCC3E\\uC544 \\uC694\\uCCAD\\uC744 \\uBC18\\uC601\\uD558\\uC138\\uC694.");
  L.push("");
  for (var j = 0; j < list.length; j++) {
    var ann = list[j];
    var e = ann.element || {};
    var nm = e.elementName || {};
    L.push("## " + ann.number + ". " + (ann.comment || ""));
    if (nm.primary) L.push("- Element: " + nm.primary + " (" + (e.uiTerm || e.tag || "?") + ")");
    if (e.cssPath || nm.selector) L.push("- Selector: \\u0060" + (e.cssPath || nm.selector) + "\\u0060");
    if (e.sourceLocation) L.push("- Source: " + e.sourceLocation.file + ":" + e.sourceLocation.line);
    L.push("- Page: " + (ann.pageUrl || location.href));
    var txt = (e.textContent || "").trim();
    if (txt) L.push('- Text: "' + txt.slice(0, 80) + '"');
    if (e.boundingRect) L.push("- Size: " + Math.round(e.boundingRect.width) + "\\u00d7" + Math.round(e.boundingRect.height) + "px");
    if (e.htmlSnippet) {
      L.push("- HTML:");
      L.push("\\u0060\\u0060\\u0060html");
      L.push(e.htmlSnippet);
      L.push("\\u0060\\u0060\\u0060");
    }
    L.push("");
  }
  return L.join("\\n");
}

function copyPrompt() {
  if (annotations.length === 0) { showToast("Annotation\\uC774 \\uC5C6\\uC2B5\\uB2C8\\uB2E4"); return; }
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
  hl.style.cssText = "position:fixed;border:3px solid #f59e0b;border-radius:4px;background:rgba(245,158,11,0.15);pointer-events:none;z-index:100000;transition:opacity 0.3s;";
  document.documentElement.appendChild(hl);
  var lbl = null;
  if (data.label) {
    lbl = document.createElement("div");
    lbl.setAttribute(MARKER, "highlight-label");
    lbl.style.cssText = "position:fixed;background:#f59e0b;color:#1c1917;padding:3px 8px;border-radius:4px;font:700 11px system-ui,sans-serif;pointer-events:none;z-index:100000;white-space:nowrap;";
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

/* ── Mini Toolbar ─────────────────────────────────────────────── */
var toolbar = document.createElement("div");
toolbar.setAttribute(MARKER, "toolbar");
toolbar.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:100003;display:flex;gap:4px;pointer-events:auto;font-family:system-ui,-apple-system,sans-serif;font-size:13px;";

var toggleBtn = document.createElement("button");
toggleBtn.setAttribute(MARKER, "btn");
toggleBtn.textContent = "Inspect OFF";
toggleBtn.style.cssText = "padding:6px 14px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#94a3b8;cursor:pointer;font-size:13px;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,0.3);";
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
toolbar.appendChild(toggleBtn);

var annotateBtn = document.createElement("button");
annotateBtn.setAttribute(MARKER, "btn");
annotateBtn.textContent = "Annotate OFF";
annotateBtn.style.cssText = toggleBtn.style.cssText;
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
toolbar.appendChild(annotateBtn);

var promptBtn = document.createElement("button");
promptBtn.setAttribute(MARKER, "btn");
promptBtn.textContent = "Copy Prompt";
promptBtn.style.cssText = toggleBtn.style.cssText;
promptBtn.onclick = copyPrompt;
toolbar.appendChild(promptBtn);
document.documentElement.appendChild(toolbar);

/* ── DOM Guard: re-attach if framework removes our elements ── */
var guardEls = [overlay, panel, toolbar, pinLayer];
var observer = new MutationObserver(function(mutations) {
  for (var i = 0; i < guardEls.length; i++) {
    ensureAttached(guardEls[i]);
  }
});
observer.observe(document.documentElement, { childList: true });

function updateToolbarState() {
  if (inspectorEnabled) {
    toggleBtn.textContent = "Inspect ON";
    toggleBtn.style.borderColor = "#3b82f6";
    toggleBtn.style.backgroundColor = "#1e3a5f";
    toggleBtn.style.color = "#60a5fa";
  } else {
    toggleBtn.textContent = "Inspect OFF";
    toggleBtn.style.borderColor = "#334155";
    toggleBtn.style.backgroundColor = "#0f172a";
    toggleBtn.style.color = "#94a3b8";
  }
  if (annotateEnabled) {
    annotateBtn.textContent = "Annotate ON";
    annotateBtn.style.borderColor = "#f59e0b";
    annotateBtn.style.backgroundColor = "#451a03";
    annotateBtn.style.color = "#fbbf24";
  } else {
    annotateBtn.textContent = "Annotate OFF";
    annotateBtn.style.borderColor = "#334155";
    annotateBtn.style.backgroundColor = "#0f172a";
    annotateBtn.style.color = "#94a3b8";
  }
  var openCount = 0;
  for (var i = 0; i < annotations.length; i++) {
    if (annotations[i].status === "open") openCount++;
  }
  if (annotations.length > 0) {
    promptBtn.textContent = "Copy Prompt (" + openCount + "/" + annotations.length + ")";
    promptBtn.style.borderColor = "#f59e0b";
    promptBtn.style.color = "#fbbf24";
    promptBtn.style.backgroundColor = "#0f172a";
  } else {
    promptBtn.textContent = "Copy Prompt";
    promptBtn.style.borderColor = "#334155";
    promptBtn.style.color = "#94a3b8";
    promptBtn.style.backgroundColor = "#0f172a";
  }
}

/* ── Event Handlers ───────────────────────────────────────────── */
function isOwnElement(el) {
  return el && el.closest && el.closest("[" + MARKER + "]") !== null;
}

function updateLabel(info) {
  while (labelEl.firstChild) labelEl.removeChild(labelEl.firstChild);
  var termSpan = document.createElement("span");
  termSpan.style.cssText = "color:#60a5fa;margin-right:6px;";
  termSpan.textContent = info.uiTerm;
  labelEl.appendChild(termSpan);
  if (info.elementName && info.elementName.primary && info.elementName.primarySource !== "tag") {
    var nameSpan = document.createElement("span");
    nameSpan.style.cssText = "color:#fbbf24;margin-right:6px;";
    var nameTxt = info.elementName.primary;
    if (nameTxt.length > 32) nameTxt = nameTxt.slice(0, 32) + "\\u2026";
    nameSpan.textContent = nameTxt;
    labelEl.appendChild(nameSpan);
  }
  if (info.sourceLocation) {
    var srcSpan = document.createElement("span");
    srcSpan.style.color = "#94a3b8";
    srcSpan.textContent = info.sourceLocation.file + ":" + info.sourceLocation.line;
    labelEl.appendChild(srcSpan);
  }
}

document.addEventListener("mousemove", function(e) {
  if (!inspectorEnabled && !annotateEnabled) return;
  var target = e.target;
  if (isOwnElement(target)) { hoverBox.style.display = "none"; return; }
  var rect = target.getBoundingClientRect();
  hoverBox.style.display = "block";
  hoverBox.style.borderColor = annotateEnabled ? "#f59e0b" : "#3b82f6";
  hoverBox.style.background = annotateEnabled ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.1)";
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

/* ── Init ─────────────────────────────────────────────────────── */
connectWS();
console.log("[Gemini Inspector] Injected. WSBridge port: " + WS_PORT);
})();`;
}
