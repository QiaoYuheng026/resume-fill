(() => {
  window.demoSubmitCount = 0;
  window.demoInputEvents = 0;
  document.querySelector('#applicationForm').addEventListener('input', () => { window.demoInputEvents++; });
  document.querySelector('#applicationForm').addEventListener('submit', (event) => {
    event.preventDefault();
    window.demoSubmitCount++;
    document.querySelector('#submitResult').textContent = `练习完成！没有发送任何申请。本页手动提交次数：${window.demoSubmitCount}。`;
    const notice = document.querySelector('#practiceNotice');
    notice.classList.add('success');
    notice.textContent = '练习完成：填写结果仅保留在当前页面，没有发送到服务器。可以继续修改，或刷新页面重新练习。';
  });

  const cityControl = document.querySelector('#currentCity');
  const cityOptions = document.querySelector('#cityOptions');
  const toggleCities = () => {
    cityOptions.hidden = !cityOptions.hidden;
    cityControl.setAttribute('aria-expanded', String(!cityOptions.hidden));
  };
  cityControl.addEventListener('click', toggleCities);
  cityControl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCities();
    }
    if (event.key === 'Escape') {
      cityOptions.hidden = true;
      cityControl.setAttribute('aria-expanded', 'false');
    }
  });
  cityOptions.addEventListener('click', (event) => {
    const option = event.target.closest('[data-city]');
    if (!option) return;
    cityControl.textContent = option.dataset.city;
    cityControl.dispatchEvent(new Event('change', { bubbles: true }));
    cityOptions.hidden = true;
    cityControl.setAttribute('aria-expanded', 'false');
    cityControl.focus();
  });
  document.addEventListener('click', (event) => {
    if (cityControl.contains(event.target) || cityOptions.contains(event.target)) return;
    cityOptions.hidden = true;
    cityControl.setAttribute('aria-expanded', 'false');
  });
})();
