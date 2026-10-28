import type { Messages } from './types';

/**
 * French. Addresses the user as "vous". A no-break space ( ) goes before ! ? : ; and %, as
 * French typography requires, so the sign never wraps onto a line of its own.
 */
export const fr: Messages = {
  common: {
    tryAgain: 'Réessayer',
    close: 'Fermer',
    back: 'Retour',
    search: 'Rechercher',
    settings: 'Paramètres',
    edit: 'Modifier',
    done: 'Terminé',
    currentLocation: 'Position actuelle',
    unavailable: 'Indisponible',
    searchForAPlace: 'Rechercher un lieu',
    unknownConditions: 'Conditions inconnues',
  },
  time: { today: "Aujourd'hui", tomorrow: 'Demain', now: 'Maintenant' },
  freshness: {
    justNow: "Mis à jour à l'instant",
    minutesAgo: (minutes) => `Mis à jour il y a ${minutes} min`,
    hoursAgo: (hours) => `Mis à jour il y a ${hours} h`,
    daysAgo: (days) => `Mis à jour il y a ${days} j`,
  },
  mood: {
    lines: {
      clear: 'Grand soleil. Allez jouer !',
      'partly-cloudy': 'Un peu de tout au programme.',
      cloudy: "Ciel boudeur aujourd'hui.",
      drizzle: 'Juste une petite bruine.',
      rain: 'Prenez un parapluie !',
      thunderstorm: 'Le ciel fait son cinéma.',
      snow: 'Ambiance jour de neige.',
      sleet: 'De la gadoue dehors.',
      'mist-fog': 'Brumeux et mystérieux.',
      'dust-smoke': 'Ciel voilé dehors.',
      'squall-tornado': 'Tenez bien votre chapeau !',
      unknown: 'La météo fait sa météo.',
    },
    frigid: 'Brrr. Un froid de canard dehors.',
    scorching: 'Quelle fournaise. Hydratez-vous !',
    clearNight: 'Ciel dégagé. Levez les yeux !',
    clearCool: 'Frais et lumineux dehors.',
  },
  units: {
    temperature: {
      c: { label: '°C', name: 'Celsius' },
      f: { label: '°F', name: 'Fahrenheit' },
    },
    windSpeed: {
      ms: { label: 'm/s', name: 'Mètres par seconde' },
      kmh: { label: 'km/h', name: 'Kilomètres par heure' },
      mph: { label: 'mi/h', name: 'Miles par heure' },
      kn: { label: 'nd', name: 'Nœuds' },
    },
    precipitation: {
      mm: { label: 'mm', name: 'Millimètres' },
      in: { label: 'po', name: 'Pouces' },
    },
    distance: { km: 'km', mi: 'mi' },
    pressure: 'hPa',
    percent: (value) => `${value} %`,
  },
  spoken: { degrees: (value) => `${value} degrés` },
  home: {
    loading: 'Chargement de la météo',
    savedPlaces: 'Lieux enregistrés',
    weatherDetails: 'Détails météo',
  },
  current: {
    feelsLike: (temperature) => `Ressenti ${temperature}`,
    highLow: (high, low) => `Max. ${high}  Min. ${low}`,
    spokenFeelsLike: (value) => `Ressenti ${value} degrés`,
    spokenHighLow: (high, low) => `Maximum ${high}, minimum ${low}`,
    rainChance: (percent) => `Risque de pluie ${percent}`,
    snowChance: (percent) => `Risque de neige ${percent}`,
  },
  forecast: {
    hourlyTitle: 'Prévisions horaires',
    dailyTitle: 'Prévisions à 7 jours',
    high: (value) => `maximum ${value}`,
    low: (value) => `minimum ${value}`,
    precipChance: (percent) => `${percent} pour cent de risque de précipitations`,
    timeOfDay: 'Heure de la journée',
    backToNow: 'Revenir à maintenant',
  },
  details: {
    titles: {
      wind: 'Vent',
      uvIndex: 'Indice UV',
      humidity: 'Humidité',
      visibility: 'Visibilité',
      pressure: 'Pression',
      sun: 'Soleil',
    },
    compass: [
      ['N', 'nord', 'du nord'],
      ['NNE', 'nord-nord-est', 'du nord-nord-est'],
      ['NE', 'nord-est', 'du nord-est'],
      ['ENE', 'est-nord-est', "de l'est-nord-est"],
      ['E', 'est', "de l'est"],
      ['ESE', 'est-sud-est', "de l'est-sud-est"],
      ['SE', 'sud-est', 'du sud-est'],
      ['SSE', 'sud-sud-est', 'du sud-sud-est'],
      ['S', 'sud', 'du sud'],
      ['SSO', 'sud-sud-ouest', 'du sud-sud-ouest'],
      ['SO', 'sud-ouest', 'du sud-ouest'],
      ['OSO', 'ouest-sud-ouest', "de l'ouest-sud-ouest"],
      ['O', 'ouest', "de l'ouest"],
      ['ONO', 'ouest-nord-ouest', "de l'ouest-nord-ouest"],
      ['NO', 'nord-ouest', 'du nord-ouest'],
      ['NNO', 'nord-nord-ouest', 'du nord-nord-ouest'],
    ],
    windSpoken: (speed, from, gust) =>
      [`Vent ${speed}${from ? ` ${from}` : ''}`, gust ? `rafales ${gust}` : null]
        .filter(Boolean)
        .join(', '),
    gusts: (value) => `Rafales ${value}`,
    uv: {
      Low: { label: 'Faible', advice: 'Aucune protection nécessaire.' },
      Moderate: {
        label: 'Modéré',
        advice: 'Portez de la crème solaire et des lunettes de soleil.',
      },
      High: { label: 'Élevé', advice: "Cherchez l'ombre vers midi." },
      'Very high': { label: 'Très élevé', advice: 'Évitez le soleil vers midi.' },
      Extreme: { label: 'Extrême', advice: "Restez à l'abri du soleil si possible." },
    },
    uvSpoken: (value, category, advice) => `Indice UV ${value}, ${category}. ${advice}`,
    uvUnavailable: 'Indice UV indisponible',
    sunSpoken: (sunrise, sunset) => `Lever du soleil ${sunrise}, coucher ${sunset}`,
    sunUnavailable: 'Lever et coucher du soleil indisponibles',
  },
  alerts: {
    severity: {
      extreme: 'Extrême',
      severe: 'Sévère',
      moderate: 'Modérée',
      minor: 'Mineure',
      unknown: 'Alerte',
    },
    more: (count) => `${count} de plus`,
    issuedBy: (sender) => `Émis par ${sender}`,
    opensFull: "Ouvre l'alerte complète",
  },
  places: {
    permission: {
      undetermined: {
        title: 'Voir la météo là où vous êtes',
        body: "W34th3r utilise votre position uniquement pour afficher la météo de l'endroit où vous vous trouvez.",
      },
      denied: {
        title: 'La localisation est désactivée',
        body: "Activez l'accès à la localisation dans les Paramètres pour voir la météo là où vous êtes.",
      },
      unavailable: {
        title: "Nous n'avons pas pu vous localiser",
        body: 'Vérifiez que les services de localisation sont activés, puis réessayez.',
      },
    },
    useMyLocation: 'Utiliser ma position',
    deniedInBrowser: {
      title: 'La localisation est bloquée',
      body: "Autorisez la localisation pour ce site dans la barre d'adresse de votre navigateur, puis réessayez.",
    },
    openSettings: 'Ouvrir les Paramètres',
    title: 'Lieux',
    emptyTitle: 'Aucun lieu enregistré',
    emptyBody: 'Recherchez une ville et touchez le marque-page pour la garder ici.',
    moveUp: (name) => `Monter ${name}`,
    moveDown: (name) => `Descendre ${name}`,
    remove: (name) => `Supprimer ${name}`,
    removeFromSaved: (label) => `Retirer ${label} des lieux enregistrés`,
    save: (label) => `Enregistrer ${label}`,
  },
  search: {
    prompt: 'Recherchez une ville ou un lieu.',
    noResults: 'Aucun lieu trouvé',
    noResultsHint: "Vérifiez l'orthographe ou essayez une ville voisine.",
    searching: 'Recherche en cours…',
    placeholder: 'Ville ou lieu',
    clear: 'Effacer la recherche',
  },
  settings: {
    sections: {
      temperature: 'Température',
      windSpeed: 'Vitesse du vent',
      precipitation: 'Précipitations',
      appearance: 'Apparence',
    },
    appearance: { system: 'Système', light: 'Clair', dark: 'Sombre' },
    note: 'Les unités dépendent de votre région et ne changent que si vous le décidez.',
    attribution: {
      'open-meteo':
        'Données météo par Open-Meteo.com (CC BY 4.0). Le nom de votre position provient de BigDataCloud.',
      openweather: 'Données météo par OpenWeather.',
    },
  },
};
