import { render, screen } from '@testing-library/react-native';

import { LocaleProvider } from '@/lib/use-locale';
import { SunArc } from '@/features/details/SunArc';
import { UVMeter } from '@/features/details/UVMeter';
import { WindCompass } from '@/features/details/WindCompass';

const colors = { color: '#071e3d', secondaryColor: '#16335a', accentColor: '#0b2a55' };

describe('WindCompass', () => {
  it.each([
    [
      'a typical westerly',
      { speedLabel: '12 km/h', gustLabel: '22 km/h', directionLabel: 'WSW', degrees: 250 },
    ],
    [
      'a gale from the north',
      { speedLabel: '252 km/h', gustLabel: '340 km/h', directionLabel: 'N', degrees: 359 },
    ],
    [
      'calm air with no direction',
      { speedLabel: '0 km/h', gustLabel: null, directionLabel: null, degrees: null },
    ],
  ])('renders %s', async (_label, wind) => {
    await render(<WindCompass wind={{ ...wind, a11yLabel: 'wind' }} {...colors} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('shows the speed, the gust and the direction as text', async () => {
    await render(
      <WindCompass
        wind={{
          speedLabel: '12 km/h',
          gustLabel: '22 km/h',
          directionLabel: 'WSW',
          degrees: 250,
          a11yLabel: 'Wind 12 km/h from west-southwest, gusts 22 km/h',
        }}
        {...colors}
      />,
    );
    expect(screen.getByText('12 km/h')).toBeTruthy();
    expect(screen.getByText('Gusts 22 km/h')).toBeTruthy();
    expect(screen.getByText('WSW')).toBeTruthy();
    expect(screen.getByLabelText('Wind 12 km/h from west-southwest, gusts 22 km/h')).toBeTruthy();
  });

  it('shows no direction or gust text when they are missing', async () => {
    await render(
      <WindCompass
        wind={{
          speedLabel: '17 km/h',
          gustLabel: null,
          directionLabel: null,
          degrees: null,
          a11yLabel: 'Wind 17 km/h',
        }}
        {...colors}
      />,
    );
    expect(screen.queryByText(/Gusts/)).toBeNull();
    expect(screen.getByText('17 km/h')).toBeTruthy();
  });
});

describe('UVMeter', () => {
  const available = {
    available: true,
    label: '5',
    category: 'Moderate' as const,
    categoryLabel: 'Moderate',
    advice: 'Wear sunscreen and sunglasses.',
    value: 5.2,
    fraction: 5.2 / 11,
  };
  const unavailable = {
    available: false,
    label: 'Unavailable',
    category: null,
    categoryLabel: null,
    advice: null,
    value: null,
    fraction: 0,
  };

  it.each([
    ['a typical value', available],
    [
      'an extreme value',
      {
        ...available,
        label: '15',
        category: 'Extreme' as const,
        categoryLabel: 'Extreme',
        value: 15.2,
        fraction: 1,
      },
    ],
    ['no data', unavailable],
  ])('renders %s', async (_label, uv) => {
    await render(<UVMeter uv={uv} {...colors} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('names the category in words next to the number, so colour is not the only signal', async () => {
    await render(<UVMeter uv={available} {...colors} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
    expect(screen.getByText('Wear sunscreen and sunglasses.')).toBeTruthy();
  });

  it('reads the value and category aloud as one sentence', async () => {
    await render(<UVMeter uv={available} {...colors} />);
    expect(
      screen.getByLabelText('UV index 5, Moderate. Wear sunscreen and sunglasses.'),
    ).toBeTruthy();
  });

  it('says so plainly when there is no data', async () => {
    await render(<UVMeter uv={unavailable} {...colors} />);
    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(screen.getByLabelText('UV index unavailable')).toBeTruthy();
  });
});

describe('SunArc', () => {
  const day = {
    available: true,
    sunriseLabel: '7:42 AM',
    sunsetLabel: '6:15 PM',
    progress: 0.4,
    isDay: true,
  };
  const none = {
    available: false,
    sunriseLabel: 'Unavailable',
    sunsetLabel: 'Unavailable',
    progress: 0,
    isDay: true,
  };

  it.each([
    ['midday', day],
    ['before sunrise', { ...day, progress: 0, isDay: false }],
    ['after sunset', { ...day, progress: 1, isDay: false }],
    ['no sun events', none],
  ])('renders %s', async (_label, sun) => {
    await render(<SunArc sun={sun} {...colors} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('shows sunrise and sunset times as text', async () => {
    await render(<SunArc sun={day} {...colors} />);
    expect(screen.getByText('7:42 AM')).toBeTruthy();
    expect(screen.getByText('6:15 PM')).toBeTruthy();
    expect(screen.getByLabelText('Sunrise 7:42 AM, sunset 6:15 PM')).toBeTruthy();
  });

  it('describes missing sun events', async () => {
    await render(<SunArc sun={none} {...colors} />);
    expect(screen.getByLabelText('Sunrise and sunset unavailable')).toBeTruthy();
  });
});

describe('in French', () => {
  const french = (ui: React.ReactElement) =>
    render(<LocaleProvider locale="fr-FR">{ui}</LocaleProvider>);

  it('labels the gust in French', async () => {
    await french(
      <WindCompass
        wind={{
          speedLabel: '12 km/h',
          gustLabel: '22 km/h',
          directionLabel: 'OSO',
          degrees: 250,
          a11yLabel: 'Vent',
        }}
        {...colors}
      />,
    );
    expect(screen.getByText('Rafales 22 km/h')).toBeTruthy();
    expect(screen.queryByText(/Gusts/)).toBeNull();
  });

  it('reads the UV index aloud in French and shows the French category', async () => {
    await french(
      <UVMeter
        uv={{
          available: true,
          label: '5',
          category: 'Moderate',
          categoryLabel: 'Modéré',
          advice: 'Portez de la crème solaire et des lunettes de soleil.',
          value: 5.2,
          fraction: 5.2 / 11,
        }}
        {...colors}
      />,
    );
    expect(screen.getByText('Modéré')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Indice UV 5, Modéré. Portez de la crème solaire et des lunettes de soleil.',
      ),
    ).toBeTruthy();
  });

  it('says the UV index is unavailable in French', async () => {
    await french(
      <UVMeter
        uv={{
          available: false,
          label: 'Indisponible',
          category: null,
          categoryLabel: null,
          advice: null,
          value: null,
          fraction: 0,
        }}
        {...colors}
      />,
    );
    expect(screen.getByLabelText('Indice UV indisponible')).toBeTruthy();
  });

  it('reads the sun times aloud in French', async () => {
    const sun = {
      available: true,
      sunriseLabel: '7:42',
      sunsetLabel: '18:15',
      progress: 0.4,
      isDay: true,
    };
    await french(<SunArc sun={sun} {...colors} />);
    expect(screen.getByLabelText('Lever du soleil 7:42, coucher 18:15')).toBeTruthy();
  });

  it('describes missing sun events in French', async () => {
    const sun = {
      available: false,
      sunriseLabel: 'Indisponible',
      sunsetLabel: 'Indisponible',
      progress: 0,
      isDay: true,
    };
    await french(<SunArc sun={sun} {...colors} />);
    expect(screen.getByLabelText('Lever et coucher du soleil indisponibles')).toBeTruthy();
  });
});
