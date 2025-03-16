function switchTab(tab) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].style.display = 'none';
  }
  document.querySelectorAll('.tab')[tab].style.display = 'block';
}