const MODE = 'PEN';

document.addEventListener('DOMContentLoaded', () => {
  loadUnits();
  loadMonths();

  bulanSelect.addEventListener('change', loadJadwal);
  unitSelect.addEventListener('change', loadJadwal);
});

async function loadMonths() {
  const res = await fetchAPI({
    action: 'getAvailableMonths',
    mode: MODE
  });
  fillMonthDropdown(res);
}

async function loadJadwal() {
  const bulan = bulanSelect.value;
  const unit = unitSelect.value;
  if (!bulan || !unit) return;

  const data = await fetchAPI({
    action: 'getJadwal',
    mode: MODE,
    bulan,
    unit
  });

  renderJadwal(data);
}
