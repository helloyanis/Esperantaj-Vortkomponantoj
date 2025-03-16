document.addEventListener('DOMContentLoaded', function() {
  if(!localStorage.getItem('onBoarding')) {
    document.querySelector('#language-form-dialog').setAttribute('open', 'true');
  }
});
  
function saveLanguage() {
  localStorage.setItem('onBoarding', 'true');
  localStorage.setItem('language', document.querySelectorAll('md-radio[name="language"]').forEach((radio) => {
    if(radio.checked) {
      return radio.value;
    }
  }));
  document.querySelector('#language-form-dialog').removeAttribute('open');
}