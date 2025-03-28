// Utility function to integrate lessons into the main page's lesson container
async function integrateLesson(category, lesson, section) {
    const lessonRequest = await fetch(`../data/lessons/${category}/${lesson}/${section}-${localStorage.getItem("language")}.html`);
    const lessonData = await lessonRequest.text();
    document.querySelector('#lesson-container').innerHTML = lessonData;
    document.querySelector('#print').removeAttribute('style');
    const floatingNextButton = document.createElement('md-fab');
    floatingNextButton.setAttribute('icon', 'arrow_forward');
    floatingNextButton.setAttribute('color', 'primary');
}