import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;

const wrapper = document.createElement("div");
wrapper.className = "min-h-screen bg-gray-50 flex items-center justify-center";

const inner = document.createElement("div");
inner.className = "text-center";

const heading = document.createElement("h1");
heading.className = "text-4xl font-bold text-gray-900 mb-4";
heading.textContent = "Gemini Preview";

const paragraph = document.createElement("p");
paragraph.className = "text-gray-600";
paragraph.textContent = "코드를 생성하면 여기에 미리보기가 표시됩니다";

inner.appendChild(heading);
inner.appendChild(paragraph);
wrapper.appendChild(inner);
app.appendChild(wrapper);
