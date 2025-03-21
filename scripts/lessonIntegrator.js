// Utility function to integrate lessons into the main page's lesson container
async function integrateLesson(category, lesson) {
    const lessonRequest = await fetch(`../data/lessons/${category}/${localStorage.getItem("language")}/${lesson}.html`);
    const lessonData = await lessonRequest.text();
    document.querySelector('#lesson-container').innerHTML = lessonData;
}