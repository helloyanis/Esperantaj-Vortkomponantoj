document.addEventListener('DOMContentLoaded', function() {
  if(!localStorage.getItem('language')) {
    document.querySelector('#language-form-dialog').setAttribute('open', 'true');
    // Pre-select browser language
    document.querySelectorAll('md-radio[name="language"]').forEach((radio) => {
      if(radio.value.startsWith(navigator.language)) {
        radio.checked = true;
      }
    });
  }else {
    translateInterface(localStorage.getItem('language'));
  }
});
  
function saveLanguage() {
 document.querySelectorAll('md-radio[name="language"]').forEach((radio) => {
    if(radio.checked) {
      localStorage.setItem('language', radio.value);
    }
  });
  document.querySelector('#language-form-dialog').removeAttribute('open');
  window.location.reload();
}

async function translateInterface(language) {
  const translateRequest = await fetch(`../data/interface/${language}.json`)
  const translateData = await translateRequest.json();
  console.log(translateData);
  document.querySelectorAll('.translatable').forEach((element) => {
    const key = element.getAttribute('translate-key');
    element.innerText = translateData[key];
  });
}