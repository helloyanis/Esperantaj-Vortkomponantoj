document.addEventListener('DOMContentLoaded', function() {
  if(!localStorage.getItem('tab')) {
    localStorage.setItem('tab', 0);
  }
  document.querySelectorAll('md-primary-tab')[0].removeAttribute('active');
  document.querySelectorAll('md-primary-tab')[localStorage.getItem('tab')].setAttribute('active', 'true');
  switchTab(localStorage.getItem('tab'));
});
function switchTab(tab) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].style.display = 'none';
  }
  document.querySelectorAll('.tab')[tab].style.display = 'block';
  localStorage.setItem('tab', tab);
}