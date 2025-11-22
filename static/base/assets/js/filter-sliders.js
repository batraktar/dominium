document.addEventListener('DOMContentLoaded', () => {
  const filters = document.querySelectorAll('.filter-range');
  const chipsContainer = document.getElementById('active-filter-chips');

  if (!filters.length) {
    return;
  }

  const formatNumber = (value, suffix = '', symbol = '', isRooms = false, maxValue = null) => {
    if (isRooms && maxValue !== null && Number(value) >= maxValue) {
      return `${maxValue}+`;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return `${symbol}${value}${suffix ? ` ${suffix}` : ''}`.trim();
    }
    const formatted = new Intl.NumberFormat('uk-UA').format(numeric);
    return `${symbol}${formatted}${suffix ? ` ${suffix}` : ''}`.trim();
  };

  const updateChip = (key, label, displayValue, resetFn) => {
    if (!chipsContainer) {
      return;
    }
    let chip = chipsContainer.querySelector(`[data-chip="${key}"]`);
    if (!displayValue) {
      if (chip) {
        chip.remove();
      }
      return;
    }

    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.chip = key;
      chip.className =
        'bg-white text-deepOcean border border-coolSage px-3 py-1.5 rounded-full text-xs font-fixel flex items-center gap-2 shadow-sm hover:bg-creamBeige transition';
      chipsContainer.appendChild(chip);
    }
    chip.innerHTML = `<span class="font-semibold">${label}:</span> <span>${displayValue}</span> <i class="ri-close-line text-base"></i>`;
    chip.onclick = resetFn;
  };

  const resetFilter = (filterEl) => {
    const minRange = filterEl.querySelector('.range-min');
    const maxRange = filterEl.querySelector('.range-max');
    const hiddenMin = filterEl.querySelector('input[data-field="min"]');
    const hiddenMax = filterEl.querySelector('input[data-field="max"]');
    const minDefault = Number(filterEl.dataset.min);
    const maxDefault = Number(filterEl.dataset.max);

    if (minRange) minRange.value = minDefault;
    if (maxRange) maxRange.value = maxDefault;
    if (hiddenMin) hiddenMin.value = '';
    if (hiddenMax) hiddenMax.value = '';

    updateFilterUI(filterEl, null, true);
  };

  const updateFilterUI = (filterEl, source = null, notify = false) => {
    const minRange = filterEl.querySelector('.range-min');
    const maxRange = filterEl.querySelector('.range-max');
    if (!minRange || !maxRange) return;

    const minValue = Number(minRange.value);
    const maxValue = Number(maxRange.value);
    const minLimit = Number(filterEl.dataset.min);
    const maxLimit = Number(filterEl.dataset.max);
    const step = Number(filterEl.dataset.step) || 1;
    const symbol = filterEl.dataset.symbol || '';
    const suffix = filterEl.dataset.suffix || '';
    const label = filterEl.dataset.label || '';
    const mappingMaxPlus = filterEl.dataset.mappingMaxPlus === 'true';

    if (minValue > maxValue - step) {
      if (source === 'min') {
        minRange.value = maxValue - step;
      } else {
        maxRange.value = minValue + step;
      }
    }

    const effectiveMin = Number(minRange.value);
    const effectiveMax = Number(maxRange.value);

    const hiddenMin = filterEl.querySelector('input[data-field="min"]');
    const hiddenMax = filterEl.querySelector('input[data-field="max"]');

    if (hiddenMin) {
      hiddenMin.value = effectiveMin <= minLimit ? '' : String(effectiveMin);
    }
    if (hiddenMax) {
      if (mappingMaxPlus && effectiveMax >= maxLimit) {
        hiddenMax.value = '';
      } else {
        hiddenMax.value = effectiveMax >= maxLimit ? '' : String(effectiveMax);
      }
    }

    const minLabel = filterEl.querySelector('[data-value-label="min"]');
    const maxLabel = filterEl.querySelector('[data-value-label="max"]');

    if (minLabel) {
      if (effectiveMin <= minLimit) {
        minLabel.textContent = mappingMaxPlus ? 'Будь-яка' : `Від ${formatNumber(minLimit, suffix, symbol)}`;
      } else {
        minLabel.textContent = `Від ${formatNumber(effectiveMin, suffix, symbol)}`;
      }
    }
    if (maxLabel) {
      if (mappingMaxPlus && effectiveMax >= maxLimit) {
        maxLabel.textContent = `${formatNumber(maxLimit, suffix, symbol, true, maxLimit)}`;
      } else if (effectiveMax >= maxLimit) {
        maxLabel.textContent = `До ${formatNumber(maxLimit, suffix, symbol)}`;
      } else {
        maxLabel.textContent = `До ${formatNumber(effectiveMax, suffix, symbol, false, maxLimit)}`;
      }
    }

    const percMin = ((Number(minRange.value) - minLimit) / (maxLimit - minLimit)) * 100;
    const percMax = ((Number(maxRange.value) - minLimit) / (maxLimit - minLimit)) * 100;

    const trackColor = '#ffffff44';
    const fillColor = '#133E44';
    const gradient = `linear-gradient(90deg, ${trackColor} ${percMin}%, ${fillColor} ${percMin}%, ${fillColor} ${percMax}%, ${trackColor} ${percMax}%)`;

    minRange.style.background = gradient;
    maxRange.style.background = gradient;

    const currentMinValue = hiddenMin?.value || '';
    const currentMaxValue = hiddenMax?.value || '';

    let chipDisplay = '';
    const hasMin = currentMinValue !== '';
    const hasMax = currentMaxValue !== '';
    const key = filterEl.dataset.filterKey;

    if (key === 'rooms') {
      const minText = hasMin ? formatNumber(currentMinValue, '', '', true, maxLimit) : null;
      const maxText = hasMax ? formatNumber(currentMaxValue, '', '', true, maxLimit) : null;
      const isMaxUnlimited = !hasMax && Number(maxRange.value) >= maxLimit;

      if (hasMin && hasMax) {
        chipDisplay = `${minText} — ${maxText}`;
      } else if (hasMin && isMaxUnlimited) {
        chipDisplay = `${minText}+`;
      } else if (hasMin) {
        chipDisplay = `від ${minText}`;
      } else if (hasMax) {
        chipDisplay = `до ${maxText}`;
      } else if (isMaxUnlimited && Number(minRange.value) > minLimit) {
        chipDisplay = `${formatNumber(minRange.value, '', '', true, maxLimit)}+`;
      }
    } else {
      const minText = hasMin ? formatNumber(currentMinValue, suffix, symbol) : null;
      const maxText = hasMax ? formatNumber(currentMaxValue, suffix, symbol) : null;

      if (hasMin && hasMax) {
        chipDisplay = `${minText} — ${maxText}`;
      } else if (hasMin) {
        chipDisplay = `від ${minText}`;
      } else if (hasMax) {
        chipDisplay = `до ${maxText}`;
      }
    }

    updateChip(filterEl.dataset.filterKey, label, chipDisplay, () => resetFilter(filterEl));

    if (notify) {
      document.dispatchEvent(
        new CustomEvent('dominium:filter-change', {
          detail: { key: filterEl.dataset.filterKey },
        }),
      );
    }
  };

  filters.forEach((filterEl) => {
    const minRange = filterEl.querySelector('.range-min');
    const maxRange = filterEl.querySelector('.range-max');
    if (!minRange || !maxRange) return;

    const currentMin = filterEl.dataset.currentMin;
    const currentMax = filterEl.dataset.currentMax;
    const minLimit = Number(filterEl.dataset.min);
    const maxLimit = Number(filterEl.dataset.max);

    const initMin = currentMin !== '' ? Number(currentMin) : minLimit;
    const initMax = currentMax !== '' ? Number(currentMax) : maxLimit;
    minRange.value = Math.min(Math.max(initMin, minLimit), maxLimit);
    maxRange.value = Math.min(Math.max(initMax, minLimit), maxLimit);

    if (Number(minRange.value) > Number(maxRange.value)) {
      minRange.value = maxLimit < minLimit ? minLimit : Math.min(Number(maxRange.value), maxLimit);
    }

    minRange.addEventListener('input', () => updateFilterUI(filterEl, 'min', true));
    maxRange.addEventListener('input', () => updateFilterUI(filterEl, 'max', true));

    const resetBtn = filterEl.querySelector('[data-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => resetFilter(filterEl));
    }

    updateFilterUI(filterEl);
  });
});

const sliderStyle = document.createElement('style');
sliderStyle.textContent = `
  .filter-range {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .filter-range .range-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: rgba(255,255,255,0.25);
    border-radius: 9999px;
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .filter-range .range-slider.range-min {
    z-index: 5;
  }
  .filter-range .range-slider.range-max {
    z-index: 4;
  }
  .filter-range .range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #133E44;
    box-shadow: 0 0 0 2px rgba(19, 62, 68, 0.35);
    cursor: pointer;
    pointer-events: auto;
  }
  .filter-range .range-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #133E44;
    box-shadow: 0 0 0 2px rgba(19, 62, 68, 0.35);
    cursor: pointer;
    pointer-events: auto;
  }
  .filter-range .range-slider.range-max::-webkit-slider-thumb {
    background: #133E44;
    border-color: #133E44;
    box-shadow: 0 0 0 2px rgba(231, 224, 206, 0.9);
  }
  .filter-range .range-slider.range-max::-moz-range-thumb {
    background: #133E44;
    border-color: #133E44;
    box-shadow: 0 0 0 2px rgba(231, 224, 206, 0.9);
  }
  .filter-range .range-slider::-webkit-slider-thumb:hover,
  .filter-range .range-slider::-moz-range-thumb:hover {
    background: #133E44;
    border-color: #133E44;
    box-shadow: 0 0 0 3px rgba(19, 62, 68, 0.4);
  }
  .filter-range .range-slider.range-max::-webkit-slider-thumb:hover,
  .filter-range .range-slider.range-max::-moz-range-thumb:hover {
    background: #0f2f34;
    border-color: #0f2f34;
    box-shadow: 0 0 0 3px rgba(19, 62, 68, 0.5);
  }
`;
document.head.appendChild(sliderStyle);
