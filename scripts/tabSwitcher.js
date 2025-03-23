document.addEventListener('DOMContentLoaded', function() {
  if(!localStorage.getItem('tab')) {
    localStorage.setItem('tab', 0);
  }
  document.querySelectorAll('md-primary-tab')[localStorage.getItem('tab')].click();
});

function switchTab(tabIndex) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].style.display = 'none';
  }
  document.querySelectorAll('.tab')[tabIndex].style.display = 'block';

  localStorage.setItem('tab', tabIndex);

  var newHash = document.querySelectorAll('.tab')[tabIndex].id;

  if (window.location.hash !== '#' + newHash) {
    history.pushState({ tab: tabIndex }, null, '#' + newHash);
  } else {
    history.replaceState({ tab: tabIndex }, null, '#' + newHash);
  }
}

//Detect back button
window.addEventListener('popstate', function(event) {
  if (event.state && event.state.tab !== undefined) {
    document.querySelectorAll('md-primary-tab')[event.state.tab].click();
  }
});