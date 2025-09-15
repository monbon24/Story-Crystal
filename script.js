(() => {
  const STORAGE_KEY = 'story-crystal-data-v1';

  const BINDING_DEFAULTS = {
    'campaign-title': 'your saga',
    'campaign-genre': 'Define the genre and stakes.',
    'campaign-tone': 'Outline the emotional palette.',
    'campaign-hook': 'Describe the promise of adventure.',
    'campaign-inspirations': 'List your inspirational touchstones.',
    'next-session': 'Nothing scheduled yet'
  };

  const STATUS_CLASS_MAP = {
    upcoming: 'is-planned',
    planned: 'is-planned',
    'in progress': 'is-active',
    active: 'is-active',
    running: 'is-active',
    complete: 'is-complete',
    completed: 'is-complete',
    resolved: 'is-complete',
    closed: 'is-complete',
    foreshadowed: 'is-planned',
    'in motion': 'is-active'
  };

  let state = loadState();
  let campaignFields = [];
  let storedInputs = [];

  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupCampaignForm();
    setupStoredInputs();
    setupSessionPlanner();
    setupNpcTracker();
    setupLocationAtlas();
    setupStoryBeats();
    setupHeaderActions();
    renderAll();
  });

  function getDefaultState() {
    return {
      campaign: {
        title: '',
        genre: '',
        hook: '',
        tone: '',
        inspirations: ''
      },
      partyRoster: '',
      worldTruths: '',
      sessionIdeas: '',
      factionNotes: '',
      relicNotes: '',
      loreNotes: '',
      sessions: [],
      npcs: [],
      locations: [],
      beats: []
    };
  }

  function loadState() {
    const base = getDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return base;
      }
      const parsed = JSON.parse(raw);
      return mergeState(base, parsed);
    } catch (error) {
      console.warn('Story Crystal: could not load saved data, starting fresh.', error);
      return base;
    }
  }

  function mergeState(target, source) {
    Object.keys(source || {}).forEach((key) => {
      const value = source[key];
      if (Array.isArray(value)) {
        target[key] = value.map((item) => (typeof item === 'object' && item !== null ? { ...item } : item));
      } else if (value && typeof value === 'object') {
        target[key] = mergeState({ ...(target[key] || {}) }, value);
      } else if (key in target) {
        target[key] = value;
      }
    });
    return target;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Story Crystal: unable to save data.', error);
    }
  }

  function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        navButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
        pages.forEach((page) => {
          page.classList.toggle('active', page.id === targetId);
        });
      });
    });
  }

  function setupCampaignForm() {
    const form = document.querySelector('#campaign-form');
    if (!form) return;

    campaignFields = Array.from(form.querySelectorAll('[data-field]'));
    campaignFields.forEach((field) => {
      const key = field.dataset.field;
      field.value = state.campaign[key] || '';
      field.addEventListener('input', () => {
        state.campaign[key] = field.value;
        saveState();
        updateBindings();
      });
    });
  }

  function hydrateCampaignForm() {
    campaignFields.forEach((field) => {
      const key = field.dataset.field;
      field.value = state.campaign[key] || '';
    });
  }

  function setupStoredInputs() {
    storedInputs = Array.from(document.querySelectorAll('[data-store]'));
    storedInputs.forEach((element) => {
      const key = element.dataset.store;
      element.value = state[key] || '';
      element.addEventListener('input', () => {
        state[key] = element.value;
        saveState();
      });
    });
  }

  function hydrateStoredInputs() {
    storedInputs.forEach((element) => {
      const key = element.dataset.store;
      element.value = state[key] || '';
    });
  }

  function setupSessionPlanner() {
    const form = document.querySelector('#session-form');
    const list = document.querySelector('#session-list');
    if (!form || !list) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const title = (formData.get('sessionTitle') || '').toString().trim();
      if (!title) {
        form.querySelector('[name="sessionTitle"]').focus();
        return;
      }

      const session = {
        id: createId(),
        title,
        date: (formData.get('sessionDate') || '').toString(),
        spotlight: (formData.get('sessionSpotlight') || '').toString().trim(),
        beats: (formData.get('sessionBeats') || '').toString().trim(),
        threats: (formData.get('sessionThreats') || '').toString().trim(),
        rewards: (formData.get('sessionRewards') || '').toString().trim(),
        status: (formData.get('sessionStatus') || 'Upcoming').toString()
      };

      state.sessions.push(session);
      saveState();
      form.reset();
      renderSessions();
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-session]');
      if (!button) return;
      const id = button.dataset.removeSession;
      state.sessions = state.sessions.filter((session) => session.id !== id);
      saveState();
      renderSessions();
    });
  }

  function renderSessions() {
    const list = document.querySelector('#session-list');
    if (!list) return;

    list.innerHTML = '';
    if (!state.sessions.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No sessions planned yet. Plot a new adventure to begin the chronicle.';
      list.appendChild(empty);
      updateNextSessionBinding();
      return;
    }

    const sessions = [...state.sessions].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    sessions.forEach((session) => {
      const card = document.createElement('article');
      card.className = 'record-card session-card';

      const header = document.createElement('div');
      header.className = 'record-card__header';

      const title = document.createElement('h4');
      title.textContent = session.title || 'Untitled Session';
      header.appendChild(title);

      if (session.date) {
        const date = document.createElement('p');
        date.className = 'session-date';
        date.textContent = formatDate(session.date);
        header.appendChild(date);
      }

      if (session.status) {
        const badge = document.createElement('span');
        badge.className = 'status-badge';
        badge.textContent = session.status;
        const statusClass = STATUS_CLASS_MAP[session.status.toLowerCase()] || 'is-planned';
        badge.classList.add(statusClass);
        header.appendChild(badge);
      }

      card.appendChild(header);

      const details = createDefinitionList([
        ['Spotlight', session.spotlight],
        ['Key Beats', session.beats],
        ['Threats & Opposition', session.threats],
        ['Rewards & Fallout', session.rewards]
      ]);
      card.appendChild(details);

      const actions = document.createElement('div');
      actions.className = 'record-card__actions';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost-button small-button';
      removeButton.dataset.removeSession = session.id;
      removeButton.textContent = 'Archive Plan';
      actions.appendChild(removeButton);
      card.appendChild(actions);

      list.appendChild(card);
    });

    updateNextSessionBinding();
  }

  function setupNpcTracker() {
    const form = document.querySelector('#npc-form');
    const list = document.querySelector('#npc-list');
    if (!form || !list) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = (formData.get('npcName') || '').toString().trim();
      if (!name) {
        form.querySelector('[name="npcName"]').focus();
        return;
      }

      const npc = {
        id: createId(),
        name,
        role: (formData.get('npcRole') || '').toString().trim(),
        faction: (formData.get('npcFaction') || '').toString().trim(),
        motivation: (formData.get('npcMotivation') || '').toString().trim(),
        details: (formData.get('npcDetails') || '').toString().trim()
      };

      state.npcs.push(npc);
      saveState();
      form.reset();
      renderNpcs();
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-npc]');
      if (!button) return;
      const id = button.dataset.removeNpc;
      state.npcs = state.npcs.filter((npc) => npc.id !== id);
      saveState();
      renderNpcs();
    });
  }

  function renderNpcs() {
    const list = document.querySelector('#npc-list');
    if (!list) return;

    list.innerHTML = '';
    if (!state.npcs.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No NPCs logged yet. Chronicle the allies and rivals the party meets.';
      list.appendChild(empty);
      return;
    }

    const npcs = [...state.npcs].sort((a, b) => a.name.localeCompare(b.name));
    npcs.forEach((npc) => {
      const card = document.createElement('article');
      card.className = 'record-card npc-card';

      const header = document.createElement('div');
      header.className = 'record-card__header';

      const title = document.createElement('h4');
      title.textContent = npc.name;
      header.appendChild(title);

      if (npc.faction) {
        const faction = document.createElement('p');
        faction.className = 'npc-faction';
        faction.textContent = npc.faction;
        header.appendChild(faction);
      }

      card.appendChild(header);

      const details = createDefinitionList([
        ['Role', npc.role],
        ['Motivations', npc.motivation],
        ['Details & Secrets', npc.details]
      ]);
      card.appendChild(details);

      const actions = document.createElement('div');
      actions.className = 'record-card__actions';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost-button small-button';
      removeButton.dataset.removeNpc = npc.id;
      removeButton.textContent = 'Archive NPC';
      actions.appendChild(removeButton);
      card.appendChild(actions);

      list.appendChild(card);
    });
  }

  function setupLocationAtlas() {
    const form = document.querySelector('#location-form');
    const list = document.querySelector('#location-list');
    if (!form || !list) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = (formData.get('locationName') || '').toString().trim();
      if (!name) {
        form.querySelector('[name="locationName"]').focus();
        return;
      }

      const location = {
        id: createId(),
        name,
        type: (formData.get('locationType') || '').toString().trim(),
        hook: (formData.get('locationHook') || '').toString().trim(),
        danger: (formData.get('locationDanger') || '').toString().trim(),
        treasure: (formData.get('locationTreasure') || '').toString().trim()
      };

      state.locations.push(location);
      saveState();
      form.reset();
      renderLocations();
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-location]');
      if (!button) return;
      const id = button.dataset.removeLocation;
      state.locations = state.locations.filter((location) => location.id !== id);
      saveState();
      renderLocations();
    });
  }

  function renderLocations() {
    const list = document.querySelector('#location-list');
    if (!list) return;

    list.innerHTML = '';
    if (!state.locations.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No locations or relics have been recorded. Chronicle the spaces your heroes explore.';
      list.appendChild(empty);
      return;
    }

    const locations = [...state.locations].sort((a, b) => a.name.localeCompare(b.name));
    locations.forEach((location) => {
      const card = document.createElement('article');
      card.className = 'record-card location-card';

      const header = document.createElement('div');
      header.className = 'record-card__header';

      const title = document.createElement('h4');
      title.textContent = location.name;
      header.appendChild(title);

      if (location.type) {
        const type = document.createElement('p');
        type.className = 'npc-faction';
        type.textContent = location.type;
        header.appendChild(type);
      }

      card.appendChild(header);

      const details = createDefinitionList([
        ['Hooks & Atmosphere', location.hook],
        ['Dangers or Guardians', location.danger],
        ['Secrets & Treasures', location.treasure]
      ]);
      card.appendChild(details);

      const actions = document.createElement('div');
      actions.className = 'record-card__actions';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost-button small-button';
      removeButton.dataset.removeLocation = location.id;
      removeButton.textContent = 'Archive Entry';
      actions.appendChild(removeButton);
      card.appendChild(actions);

      list.appendChild(card);
    });
  }

  function setupStoryBeats() {
    const form = document.querySelector('#beat-form');
    const list = document.querySelector('#beat-list');
    if (!form || !list) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const title = (formData.get('beatTitle') || '').toString().trim();
      if (!title) {
        form.querySelector('[name="beatTitle"]').focus();
        return;
      }

      const beat = {
        id: createId(),
        title,
        stage: (formData.get('beatStage') || '').toString().trim(),
        status: (formData.get('beatStatus') || '').toString().trim(),
        details: (formData.get('beatDetails') || '').toString().trim()
      };

      state.beats.push(beat);
      saveState();
      form.reset();
      renderBeats();
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-beat]');
      if (!button) return;
      const id = button.dataset.removeBeat;
      state.beats = state.beats.filter((beat) => beat.id !== id);
      saveState();
      renderBeats();
    });
  }

  function renderBeats() {
    const list = document.querySelector('#beat-list');
    if (!list) return;

    list.innerHTML = '';
    if (!state.beats.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No story beats yet. Plot prophecies, twists, and payoffs as they unfold.';
      list.appendChild(empty);
      return;
    }

    const beats = [...state.beats].sort((a, b) => a.stage.localeCompare(b.stage) || a.title.localeCompare(b.title));
    beats.forEach((beat) => {
      const card = document.createElement('article');
      card.className = 'record-card beat-card';

      const header = document.createElement('div');
      header.className = 'record-card__header';

      const title = document.createElement('h4');
      title.textContent = beat.title;
      header.appendChild(title);

      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.textContent = beat.status || 'Foreshadowed';
      const normalized = (beat.status || '').toLowerCase();
      const statusClass = STATUS_CLASS_MAP[normalized] || 'is-planned';
      badge.classList.add(statusClass);
      header.appendChild(badge);

      card.appendChild(header);

      const details = createDefinitionList([
        ['Act or Stage', beat.stage],
        ['Details', beat.details]
      ]);
      card.appendChild(details);

      const actions = document.createElement('div');
      actions.className = 'record-card__actions';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost-button small-button';
      removeButton.dataset.removeBeat = beat.id;
      removeButton.textContent = 'Archive Beat';
      actions.appendChild(removeButton);
      card.appendChild(actions);

      list.appendChild(card);
    });
  }

  function setupHeaderActions() {
    const resetButton = document.querySelector('#reset-data');
    const exportButton = document.querySelector('#export-data');

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        const confirmReset = window.confirm('Reset Story Crystal? This will erase all stored campaign data in this browser.');
        if (!confirmReset) return;
        state = getDefaultState();
        saveState();
        renderAll();
      });
    }

    if (exportButton) {
      exportButton.addEventListener('click', () => {
        const filename = createExportFilename();
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }
  }

  function renderAll() {
    hydrateCampaignForm();
    hydrateStoredInputs();
    renderSessions();
    renderNpcs();
    renderLocations();
    renderBeats();
    updateBindings();
  }

  function updateBindings() {
    document.querySelectorAll('[data-binding]').forEach((element) => {
      const key = element.dataset.binding;
      let value = '';
      switch (key) {
        case 'campaign-title':
          value = state.campaign.title || BINDING_DEFAULTS[key];
          break;
        case 'campaign-genre':
          value = state.campaign.genre || BINDING_DEFAULTS[key];
          break;
        case 'campaign-tone':
          value = state.campaign.tone || BINDING_DEFAULTS[key];
          break;
        case 'campaign-hook':
          value = state.campaign.hook || BINDING_DEFAULTS[key];
          break;
        case 'campaign-inspirations':
          value = state.campaign.inspirations || BINDING_DEFAULTS[key];
          break;
        case 'next-session':
          value = getNextSessionLabel() || BINDING_DEFAULTS[key];
          break;
        default:
          value = BINDING_DEFAULTS[key] || '';
      }
      element.textContent = value;
    });
  }

  function updateNextSessionBinding() {
    document.querySelectorAll('[data-binding="next-session"]').forEach((element) => {
      element.textContent = getNextSessionLabel() || BINDING_DEFAULTS['next-session'];
    });
  }

  function getNextSessionLabel() {
    if (!state.sessions.length) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sorted = [...state.sessions]
      .filter((session) => session.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!sorted.length) return '';
    const upcoming = sorted.find((session) => {
      const date = new Date(session.date);
      date.setHours(0, 0, 0, 0);
      return date.getTime() >= today.getTime();
    });
    const nextSession = upcoming || sorted[sorted.length - 1];
    const formattedDate = formatDate(nextSession.date);
    if (nextSession.status && formattedDate) {
      return `${nextSession.title} · ${nextSession.status} · ${formattedDate}`;
    }
    if (formattedDate) {
      return `${nextSession.title} · ${formattedDate}`;
    }
    return nextSession.title;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function createDefinitionList(entries) {
    const dl = document.createElement('dl');
    dl.className = 'definition-list';
    let hasContent = false;
    entries.forEach(([term, value]) => {
      if (!value) return;
      hasContent = true;
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });

    if (!hasContent) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No details recorded yet.';
      return empty;
    }

    return dl;
  }

  function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createExportFilename() {
    const baseTitle = state.campaign.title || 'story-crystal';
    const slug = baseTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'story-crystal';
    const date = new Date().toISOString().slice(0, 10);
    return `${slug}-chronicle-${date}.json`;
  }
})();
