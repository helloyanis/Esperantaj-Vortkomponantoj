// vocabulary.js

document.addEventListener("DOMContentLoaded", () => {
    loadComponents();
    loadTranslations();

    document.getElementById("save-component-btn").addEventListener("click", saveComponent);
    document.getElementById("search-component-input").addEventListener("input", searchComponents);
    document.getElementById("search-word-input").addEventListener("input", searchWord);
    document.getElementById("save-word-btn").addEventListener("click", saveWord);
});

const STORAGE_KEY = "esperanto_components";
const WORDS_KEY = "esperanto_words";

// 📌 Save a new word component
function saveComponent() {
    const component = document.getElementById("component-input").value.trim();
    const type = document.getElementById("type-select").value;
    const canPrecede = document.getElementById("can-precede-input").value.split(",").map(s => s.trim());
    const canFollow = document.getElementById("can-follow-input").value.split(",").map(s => s.trim());
    const description = document.getElementById("description-input").value.trim();

    if (!component || !type) {
        alert("Veuillez entrer un composant et sélectionner un type.");
        return;
    }

    const newComponent = { component, type, canPrecede, canFollow, description };

    const components = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    components.push(newComponent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(components));

    loadComponents();
    clearComponentForm();
}

// 📌 Load and display saved components
function loadComponents() {
    const componentsList = document.getElementById("components-list");
    componentsList.innerHTML = "";

    const components = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    components.forEach(({ component, type, description }) => {
        const item = document.createElement("md-list-item");
        item.innerHTML = `<span><strong>${component}</strong> (${type}) - ${description}</span>`;
        componentsList.appendChild(item);
    });
}

// 📌 Search components
function searchComponents() {
    const query = document.getElementById("search-component-input").value.toLowerCase();
    const componentsList = document.getElementById("components-list");
    componentsList.innerHTML = "";

    const components = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const filtered = components.filter(c => c.component.toLowerCase().includes(query));

    filtered.forEach(({ component, type, description }) => {
        const item = document.createElement("md-list-item");
        item.innerHTML = `<span><strong>${component}</strong> (${type}) - ${description}</span>`;
        componentsList.appendChild(item);
    });
}

// 📌 Build words
let selectedComponents = [];

function searchWord() {
    const input = document.getElementById("search-word-input").value.toLowerCase();
    const components = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    selectedComponents = [];
    const matched = [];

    components.forEach(comp => {
        if (input.includes(comp.component.toLowerCase())) {
            matched.push(comp);
        }
    });

    updateWordBuilder(matched);
}

function updateWordBuilder(matched) {
    const wordChipSet = document.getElementById("word-chip-set");
    wordChipSet.innerHTML = "";

    matched.forEach(({ component }) => {
        const chip = document.createElement("md-chip");
        chip.textContent = component;
        chip.addEventListener("click", () => removeComponent(component));
        wordChipSet.appendChild(chip);
        selectedComponents.push(component);
    });
}

function removeComponent(component) {
    selectedComponents = selectedComponents.filter(c => c !== component);
    updateWordBuilder(selectedComponents.map(c => ({ component: c })));
}

// 📌 Save a built word
function saveWord() {
    if (selectedComponents.length === 0) {
        alert("Veuillez ajouter des composants pour créer un mot.");
        return;
    }

    const word = selectedComponents.join("");
    const translation = prompt(`Entrez la traduction pour "${word}" :`);

    if (!translation) return;

    const words = JSON.parse(localStorage.getItem(WORDS_KEY)) || [];
    words.push({ word, components: selectedComponents, translation });
    localStorage.setItem(WORDS_KEY, JSON.stringify(words));

    loadTranslations();
}

// 📌 Load saved words
function loadTranslations() {
    const translationsList = document.getElementById("translations-list");
    translationsList.innerHTML = "";

    const words = JSON.parse(localStorage.getItem(WORDS_KEY)) || [];
    words.forEach(({ word, components, translation }) => {
        const item = document.createElement("md-list-item");
        item.innerHTML = `<span><strong>${word}</strong> (${components.join(", ")}) → ${translation}</span>`;
        translationsList.appendChild(item);
    });
}

// 📌 Clear input fields after saving a component
function clearComponentForm() {
    document.getElementById("component-input").value = "";
    document.getElementById("type-select").value = "";
    document.getElementById("can-precede-input").value = "";
    document.getElementById("can-follow-input").value = "";
    document.getElementById("description-input").value = "";
}
