class Hero {
  constructor({ name, stats, loyalty = 0, permanentStatus = null }) {
    this.name = name;
    this.stats = stats;
    this.loyalty = loyalty; // range -10 to 10
    this.permanentStatus = permanentStatus;
    this.status = 'Available';
    this.restCounter = 0;
    this.xp = 0;
  }

  getLoyaltyModifier() {
    if (this.loyalty >= 7) return 0.25;
    if (this.loyalty >= 3) return 0.15;
    if (this.loyalty <= -7) return -0.25;
    if (this.loyalty <= -3) return -0.1;
    return 0;
  }

  applyInjury() {
    this.status = 'Injured';
    this.restCounter = 1; // Unavailable for next shift
  }

  tickShift() {
    if (this.restCounter > 0) {
      this.restCounter -= 1;
      if (this.restCounter === 0) {
        this.status = 'Available';
      }
    }
  }

  adjustLoyalty(delta) {
    this.loyalty = Math.max(-10, Math.min(10, this.loyalty + delta));
    if (this.loyalty === 10) {
      this.permanentStatus = 'Romanced';
    }
    if (this.loyalty === -10) {
      this.permanentStatus = 'Nemesis';
    }
  }
}

class Mission {
  constructor({ name, requiredStats, timeCost = 1, baseXPReward = 5, difficultyTarget = 12 }) {
    this.name = name;
    this.requiredStats = requiredStats;
    this.timeCost = timeCost;
    this.baseXPReward = baseXPReward;
    this.difficultyTarget = difficultyTarget;
  }
}

function calculateSuccess(heroes, mission) {
  const statSum = Object.entries(mission.requiredStats).reduce((total, [stat, _]) => {
    const contribution = heroes.reduce((heroTotal, hero) => heroTotal + (hero.stats[stat] || 0), 0);
    return total + contribution;
  }, 0);

  const loyaltyBonus = heroes.reduce((sum, hero) => sum + hero.getLoyaltyModifier(), 0) * 10;
  const successScore = (statSum + loyaltyBonus) / mission.difficultyTarget;
  const roll = Math.random();
  return { successScore, roll, passed: successScore >= roll };
}

function runNarrativeEvent(hero) {
  const moods = hero.loyalty <= -3 ? 'Distrusting' : hero.loyalty >= 4 ? 'Supportive' : 'Guarded';
  const baseText = {
    Distrusting: `${hero.name} leans against the vending machine, arms crossed. "You keep pushing us into chaos," they mutter.`,
    Guarded: `${hero.name} eyes the mission board. "Next time, give me a plan that respects my limits," they say evenly.`,
    Supportive: `${hero.name} lounges on the sofa with a smirk. "We made it back. Keep trusting me and I'll keep delivering," they offer.`,
  };

  const choices = [
    {
      label: 'Promise safer intel and back them publicly (+2 Loyalty)',
      delta: 2,
      narrative: `${hero.name} softens. "Alright... if you actually have my back, I'll push harder next shift."`,
    },
    {
      label: 'Demand they toughen up (-1 Loyalty, risk of Nemesis)',
      delta: -1,
      narrative: `${hero.name}'s stare hardens. "Maybe I'm the only one seeing the cracks. Fine. But don't act surprised when I walk."`,
    },
    {
      label: 'Offer personal support and downtime (+3 Loyalty, chance to Romance)',
      delta: 3,
      narrative: `${hero.name} exhales and lets their guard down. "You actually listen? Maybe this place isn't doomed."`,
    },
  ];

  return { title: `${hero.name} — ${moods}`, text: baseText[moods], choices };
}

class DispatchManager {
  constructor() {
    this.shiftIndex = 0;
    this.shifts = ['Shift A', 'Shift B', 'Shift C', 'Shift D'];
    this.heroes = [
      new Hero({
        name: 'Coupe',
        stats: { Combat: 4, Intellect: 3, Charisma: 2, Mobility: 5, Vigor: 4 },
        loyalty: 2,
      }),
      new Hero({
        name: 'Punch Up',
        stats: { Combat: 5, Intellect: 2, Charisma: 1, Mobility: 3, Vigor: 5 },
        loyalty: -1,
      }),
      new Hero({
        name: 'Spindle',
        stats: { Combat: 2, Intellect: 5, Charisma: 4, Mobility: 3, Vigor: 2 },
        loyalty: 1,
      }),
    ];
    this.missions = [
      new Mission({
        name: 'Contain the Skywell Breach',
        requiredStats: { Combat: 6, Intellect: 4, Vigor: 4 },
        baseXPReward: 6,
        difficultyTarget: 14,
      }),
    ];
    this.logElement = document.getElementById('log');
  }

  get currentShift() {
    return this.shifts[this.shiftIndex % this.shifts.length];
  }

  getAvailableHeroes(limit = 2) {
    return this.heroes.filter((h) => h.status === 'Available').slice(0, limit);
  }

  startShift() {
    this.heroes.forEach((hero) => hero.tickShift());
  }

  advanceShift() {
    this.shiftIndex += 1;
  }

  deploy(mission, selectedHeroes) {
    if (selectedHeroes.length === 0) {
      this.appendLog('No heroes available to deploy.');
      return null;
    }

    const { successScore, roll, passed } = calculateSuccess(selectedHeroes, mission);
    const narrative = passed
      ? `${mission.name} succeeded with a success index of ${successScore.toFixed(2)} against roll ${roll.toFixed(2)}.`
      : `${mission.name} faltered. Success index ${successScore.toFixed(2)} was below roll ${roll.toFixed(2)}.`;

    selectedHeroes.forEach((hero) => {
      const reward = Math.round(mission.baseXPReward * (passed ? 1 : 0.25));
      hero.xp += reward;
    });

    if (!passed) {
      const injuredHero = selectedHeroes[Math.floor(Math.random() * selectedHeroes.length)];
      injuredHero.applyInjury();
      this.appendLog(`${injuredHero.name} was injured and will sit out the next shift.`);
    }

    this.appendLog(narrative);
    return { passed, selectedHeroes, mission };
  }

  appendLog(text) {
    if (!this.logElement) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${this.currentShift}] ${text}`;
    this.logElement.prepend(entry);
  }
}

function renderRoster(manager) {
  const roster = document.getElementById('roster');
  roster.innerHTML = '';
  manager.heroes.forEach((hero) => {
    const card = document.createElement('div');
    card.className = 'hero-card';

    const header = document.createElement('div');
    header.className = 'hero-header';
    const name = document.createElement('div');
    name.innerHTML = `<strong>${hero.name}</strong>`;

    const status = document.createElement('span');
    status.className = `badge ${hero.status === 'Injured' ? 'status-injured' : ''}`;
    status.textContent = hero.status === 'Available' ? 'Ready' : `Injured (${hero.restCounter} shift)`;

    header.append(name, status);

    const loyalty = document.createElement('p');
    loyalty.innerHTML = `Loyalty: <span class="loyalty">${hero.loyalty}</span> (modifier ${(hero.getLoyaltyModifier() * 100).toFixed(0)}%)`;

    const perm = document.createElement('p');
    if (hero.permanentStatus) {
      perm.innerHTML = `<span class="permanent-tag">${hero.permanentStatus}</span>`;
    }

    const stats = document.createElement('div');
    stats.className = 'stat-grid';
    Object.entries(hero.stats).forEach(([key, value]) => {
      const stat = document.createElement('div');
      stat.className = 'stat';
      stat.innerHTML = `<span>${key}</span><span>${value}</span>`;
      stats.appendChild(stat);
    });

    card.append(header, loyalty);
    if (perm) card.appendChild(perm);
    card.append(stats);
    roster.appendChild(card);
  });
}

function renderMission(manager) {
  const missionContainer = document.getElementById('mission');
  missionContainer.innerHTML = '';
  manager.missions.forEach((mission) => {
    const card = document.createElement('div');
    card.className = 'mission-card';

    const header = document.createElement('div');
    header.className = 'mission-header';
    header.innerHTML = `<strong>${mission.name}</strong><span class="badge">${mission.timeCost} Shift</span>`;

    const reqs = document.createElement('div');
    reqs.className = 'stat-grid';
    Object.entries(mission.requiredStats).forEach(([key, value]) => {
      const stat = document.createElement('div');
      stat.className = 'stat';
      stat.innerHTML = `<span>Needs ${key}</span><span>${value}</span>`;
      reqs.appendChild(stat);
    });

    const footer = document.createElement('p');
    footer.className = 'hint';
    footer.textContent = `Difficulty Target: ${mission.difficultyTarget} • Base XP: ${mission.baseXPReward}`;

    card.append(header, reqs, footer);
    missionContainer.appendChild(card);
  });
}

function renderShift(manager) {
  document.getElementById('shift-counter').textContent = manager.currentShift;
}

function showNarrative(event, hero, manager) {
  const modal = document.getElementById('narrative-modal');
  const text = document.getElementById('narrative-text');
  const title = document.getElementById('narrative-title');
  const choices = document.getElementById('narrative-choices');
  const close = document.getElementById('close-narrative');

  return new Promise((resolve) => {
    modal.classList.remove('hidden');
    title.textContent = event.title;
    text.textContent = event.text;
    choices.innerHTML = '';

    const selectChoice = (choice) => {
      hero.adjustLoyalty(choice.delta);
      manager.appendLog(choice.narrative);
      renderRoster(manager);
      modal.classList.add('hidden');
      resolve();
    };

    event.choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.textContent = choice.label;
      btn.addEventListener('click', () => selectChoice(choice));
      choices.appendChild(btn);
    });

    close.onclick = () => {
      modal.classList.add('hidden');
      resolve();
    };
  });
}

async function runVerticalSlice(manager) {
  manager.startShift();
  renderShift(manager);

  const available = manager.getAvailableHeroes(2);
  if (available.length < 2) {
    manager.appendLog('Not enough available heroes to run the cycle. Someone is still injured.');
    return;
  }

  const mission = manager.missions[0];
  manager.appendLog(`Deploying ${available.map((h) => h.name).join(' + ')} to ${mission.name}.`);
  const result = manager.deploy(mission, available);

  if (result) {
    const heroForDialogue = result.selectedHeroes[0];
    const narrativeEvent = runNarrativeEvent(heroForDialogue);
    await showNarrative(narrativeEvent, heroForDialogue, manager);
  }

  manager.advanceShift();
  renderShift(manager);
  renderRoster(manager);
}

function init() {
  const manager = new DispatchManager();
  renderShift(manager);
  renderRoster(manager);
  renderMission(manager);

  document.getElementById('run-cycle').addEventListener('click', () => runVerticalSlice(manager));
}

document.addEventListener('DOMContentLoaded', init);
