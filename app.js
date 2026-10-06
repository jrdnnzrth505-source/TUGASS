/**
 * TitikParkir — Sistem Alokasi Lot Parkir Kampus (Gratis)
 * Tanpa Lantai, Tanpa Tiket
 * Fitur: Klik slot kosong → isi plat → terisi. Klik slot terisi → kosongkan.
 */

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'titikparkir_lots_v1';
  const TOTAL_LOTS = 12;
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('titikparkir_sync') : null;

  // State
  let selectedLotId = null;
  let lots = loadInitialLots();
  let isSimulatorActive = true;
  let lastUpdatedLotId = null;

  // DOM Elements
  const parkingGrid = document.getElementById('parkingGrid');
  const availableLotsCount = document.getElementById('availableLotsCount');
  const totalLotsCount = document.getElementById('totalLotsCount');
  const toggleSim = document.getElementById('toggleSim');
  const syncClock = document.getElementById('syncClock');
  const feedMessage = document.getElementById('feedMessage');
  const feedTime = document.getElementById('feedTime');
  const liveFeed = document.getElementById('liveFeed');

  // Modal Park (Check-in)
  const modalPark = document.getElementById('modalPark');
  const formPark = document.getElementById('formPark');
  const targetLotId = document.getElementById('targetLotId');
  const plateNumberInput = document.getElementById('plateNumber');
  const btnClosePark = document.getElementById('btnClosePark');
  const btnCancelPark = document.getElementById('btnCancelPark');

  // Modal Occupied (Kosongkan)
  const modalOccupied = document.getElementById('modalOccupied');
  const occLotId = document.getElementById('occLotId');
  const occPlate = document.getElementById('occPlate');
  const btnCloseOcc = document.getElementById('btnCloseOcc');
  const btnCancelOcc = document.getElementById('btnCancelOcc');
  const btnCheckout = document.getElementById('btnCheckout');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // ──────────────────────────────────────────────
  // Inisialisasi Data Lot (Tanpa Lantai — 1 zona saja)
  // ──────────────────────────────────────────────
  function loadInitialLots() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Pastikan jumlah lot sesuai
        if (Array.isArray(parsed) && parsed.length === TOTAL_LOTS) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing stored lots', e);
      }
    }

    const defaultLots = [];
    const initialOccupied = {
      'A-02': 'B 2145 TZA',
      'A-05': 'B 1098 KLI',
      'A-08': 'D 1477 AB',
      'A-11': 'B 8832 WQ'
    };

    for (let i = 1; i <= TOTAL_LOTS; i++) {
      const id = `A-${String(i).padStart(2, '0')}`;
      if (initialOccupied[id]) {
        // Buat waktu masuk random di masa lalu (10-90 menit yang lalu)
        const pastMinutes = Math.floor(Math.random() * 80) + 10;
        const entryTime = new Date(Date.now() - pastMinutes * 60000).toISOString();
        
        defaultLots.push({
          id,
          status: 'occupied',
          plateNumber: initialOccupied[id],
          entryTime: entryTime
        });
      } else {
        defaultLots.push({
          id,
          status: 'available',
          plateNumber: null,
          entryTime: null
        });
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLots));
    return defaultLots;
  }

  function saveLotsAndBroadcast(actionInfo = null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lots));
    if (channel) {
      channel.postMessage({ type: 'SYNC_LOTS', lots, actionInfo });
    }
  }

  // Listener Cross-Tab Synchronizer
  if (channel) {
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'SYNC_LOTS') {
        lots = event.data.lots;
        if (event.data.actionInfo) {
          triggerFeed(event.data.actionInfo);
        }
        renderGrid();
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        lots = JSON.parse(e.newValue);
        renderGrid();
      } catch (err) {}
    }
  });

  // ──────────────────────────────────────────────
  // Format Durasi Real-Time
  // ──────────────────────────────────────────────
  function formatDurationShort(entryTimeIso) {
    if (!entryTimeIso) return '00:00:00';
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(entryTimeIso).getTime()) / 1000));
    const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
    const s = String(diffSec % 60).padStart(2, '0');
    return `${h}j ${m}m ${s}s`;
  }

  setInterval(() => {
    // Update live timer di dalam modal occupied jika sedang terbuka
    if (modalOccupied && modalOccupied.classList.contains('active') && selectedLotId) {
      const activeLot = lots.find(l => l.id === selectedLotId && l.status === 'occupied');
      if (activeLot && activeLot.entryTime) {
        const durEl = document.getElementById('occDuration');
        if (durEl) durEl.textContent = formatDurationShort(activeLot.entryTime);
      }
    }
  }, 1000);

  // ──────────────────────────────────────────────
  // Render Grid & Statistik
  // ──────────────────────────────────────────────
  function updateStats() {
    const total = lots.length;
    const available = lots.filter(l => l.status === 'available').length;

    totalLotsCount.textContent = total;
    availableLotsCount.textContent = available;

    if (syncClock) {
      const now = new Date();
      syncClock.textContent = `Sinkron ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB`;
    }
  }

  function renderGrid() {
    updateStats();
    parkingGrid.innerHTML = '';

    lots.forEach(lot => {
      const card = document.createElement('div');
      const isJustUpdated = (lot.id === lastUpdatedLotId);
      card.className = `lot-slot ${lot.status} ${isJustUpdated ? 'status-updated' : ''}`;
      card.dataset.id = lot.id;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Lot ${lot.id}, status ${lot.status === 'available' ? 'tersedia' : 'terisi'}`);

      if (lot.status === 'available') {
        card.innerHTML = `
          <div class="lot-top">
            <span class="lot-number">${lot.id}</span>
          </div>
          <div class="lot-center">
            <span class="lot-tag">Tersedia</span>
          </div>
          <div class="lot-bottom">Pilih Lot</div>
        `;
      } else {
        card.innerHTML = `
          <div class="lot-top">
            <span class="lot-number">${lot.id}</span>
          </div>
          <div class="lot-center">
            <span class="lot-tag">Terisi</span>
            <span class="lot-plate">${lot.plateNumber || 'KENDARAAN'}</span>
          </div>
          <div class="lot-bottom">Status Aktif</div>
        `;
      }

      card.addEventListener('click', () => handleLotClick(lot));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleLotClick(lot);
        }
      });

      parkingGrid.appendChild(card);
    });

    if (lastUpdatedLotId) {
      setTimeout(() => {
        lastUpdatedLotId = null;
      }, 1500);
    }
  }

  // ──────────────────────────────────────────────
  // Feed Banner Helper
  // ──────────────────────────────────────────────
  function triggerFeed(message) {
    if (feedMessage) feedMessage.textContent = message;
    if (feedTime) {
      const now = new Date();
      feedTime.textContent = `${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }
    if (liveFeed) {
      liveFeed.classList.add('flash');
      setTimeout(() => liveFeed.classList.remove('flash'), 600);
    }
  }

  // ──────────────────────────────────────────────
  // Handle Interaksi Klik Lot
  // ──────────────────────────────────────────────
  function handleLotClick(lot) {
    selectedLotId = lot.id;

    if (lot.status === 'available') {
      targetLotId.textContent = lot.id;
      openModal(modalPark);
    } else {
      // Langsung tampilkan modal konfirmasi kosongkan
      occLotId.textContent = lot.id;
      if (occPlate) occPlate.textContent = lot.plateNumber || '-';
      
      const occEntryTime = document.getElementById('occEntryTime');
      if (occEntryTime && lot.entryTime) {
        occEntryTime.textContent = new Date(lot.entryTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      }

      openModal(modalOccupied);
    }
  }

  // ──────────────────────────────────────────────
  // Konfirmasi Parkir (Submit Form Otomatis)
  // ──────────────────────────────────────────────
  formPark.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Auto-generate plat dari kamera IoT
    const randomPlate = dummyPlates[Math.floor(Math.random() * dummyPlates.length)];
    const plate = randomPlate;

    const targetLot = lots.find(l => l.id === selectedLotId);
    if (targetLot) {
      targetLot.status = 'occupied';
      targetLot.plateNumber = plate;
      targetLot.entryTime = new Date().toISOString();
      lastUpdatedLotId = targetLot.id;

      const actionMsg = `Kamera IoT: ${plate} terdeteksi menempati Titik ${targetLot.id}`;
      saveLotsAndBroadcast(actionMsg);
      triggerFeed(actionMsg);
      closeModal(modalPark);
      renderGrid();
      showToast(`✅ Berhasil! Titik ${targetLot.id} terisi otomatis oleh ${plate}`);
    }
  });

  // ──────────────────────────────────────────────
  // Kosongkan Lot (Checkout)
  // ──────────────────────────────────────────────
  if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
      const targetLot = lots.find(l => l.id === selectedLotId);
      if (targetLot) {
        const lotName = targetLot.id;
        const plate = targetLot.plateNumber;
        targetLot.status = 'available';
        targetLot.plateNumber = null;
        targetLot.entryTime = null;
        lastUpdatedLotId = targetLot.id;

        const actionMsg = `Gate: Kendaraan ${plate} keluar. Titik ${lotName} kini KOSONG`;
        saveLotsAndBroadcast(actionMsg);
        triggerFeed(actionMsg);
        closeModal(modalOccupied);
        renderGrid();
        showToast(`🅿️ Titik ${lotName} telah kembali tersedia.`);
      }
    });
  }

  // ──────────────────────────────────────────────
  // Real-Time IoT Sensor Simulation Engine
  // ──────────────────────────────────────────────
  if (toggleSim) {
    toggleSim.addEventListener('change', () => {
      isSimulatorActive = toggleSim.checked;
      if (isSimulatorActive) {
        triggerFeed('Simulasi sensor IoT diaktifkan (pemantauan otomatis).');
      } else {
        triggerFeed('Simulasi sensor IoT dinonaktifkan (mode manual).');
      }
    });
  }

  const dummyPlates = [
    'B 1928 KLA', 'B 3341 PRQ', 'D 1289 VAZ', 'B 4410 SXM',
    'F 2199 GH', 'B 7720 TWA', 'L 1823 XY', 'B 5501 QWE',
    'B 6682 POK', 'D 9901 KLM'
  ];

  function runSimulatedIoTCycle() {
    if (!isSimulatorActive) return;

    const availablePool = lots.filter(l => l.status === 'available');
    const occupiedPool = lots.filter(l => l.status === 'occupied');

    const shouldArrive = (availablePool.length > 3 && (Math.random() > 0.45 || occupiedPool.length <= 2));

    if (shouldArrive && availablePool.length > 0) {
      const randomLot = availablePool[Math.floor(Math.random() * availablePool.length)];
      const randomPlate = dummyPlates[Math.floor(Math.random() * dummyPlates.length)];
      
      randomLot.status = 'occupied';
      randomLot.plateNumber = randomPlate;
      randomLot.entryTime = new Date().toISOString();
      lastUpdatedLotId = randomLot.id;

      const msg = `Sensor IoT: Kendaraan ${randomPlate} parkir di Titik ${randomLot.id}`;
      triggerFeed(msg);
      saveLotsAndBroadcast(msg);
      renderGrid();
    } else if (occupiedPool.length > 0) {
      const randomLot = occupiedPool[Math.floor(Math.random() * occupiedPool.length)];
      const oldPlate = randomLot.plateNumber || 'Mobil';
      
      randomLot.status = 'available';
      randomLot.plateNumber = null;
      randomLot.entryTime = null;
      lastUpdatedLotId = randomLot.id;

      const msg = `Detektor Gate: ${oldPlate} keluar. Titik ${randomLot.id} kini KOSONG`;
      triggerFeed(msg);
      saveLotsAndBroadcast(msg);
      renderGrid();
    }
  }

  function scheduleNextSimCycle() {
    const delay = 6000 + Math.random() * 4000;
    setTimeout(() => {
      runSimulatedIoTCycle();
      scheduleNextSimCycle();
    }, delay);
  }
  scheduleNextSimCycle();

  // ──────────────────────────────────────────────
  // Modal & Toast Helpers
  // ──────────────────────────────────────────────
  function openModal(modal) {
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  btnClosePark.addEventListener('click', () => closeModal(modalPark));
  btnCancelPark.addEventListener('click', () => closeModal(modalPark));
  btnCloseOcc.addEventListener('click', () => closeModal(modalOccupied));
  btnCancelOcc.addEventListener('click', () => closeModal(modalOccupied));

  window.addEventListener('click', (e) => {
    if (e.target === modalPark) closeModal(modalPark);
    if (e.target === modalOccupied) closeModal(modalOccupied);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(modalPark);
      closeModal(modalOccupied);
    }
  });

  let toastTimer = null;
  function showToast(message) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Initial Run
  renderGrid();
});
