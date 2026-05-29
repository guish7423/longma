import { useState, useEffect } from 'react';
import GlassPanel from '../../design-system/GlassPanel';

interface WeatherData {
  city: string;
  temp: string;
  condition: string;
  humidity: string;
  wind: string;
  icon: string;
}

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return '☀️';
  if (c.includes('cloud') && c.includes('sun')) return '⛅';
  if (c.includes('cloud')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  return '🌡️';
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async (loc?: string) => {
    setLoading(true);
    try {
      const query = loc || location || '';
      const url = query
        ? `https://wttr.in/${encodeURIComponent(query)}?format=%l|%t|%C|%h|%w`
        : 'https://wttr.in/?format=%l|%t|%C|%h|%w';
      const res = await fetch(url);
      const text = await res.text();
      const parts = text.split('|').map(s => s.trim());
      if (parts.length >= 5) {
        setWeather({
          city: parts[0].replace(/^[^a-zA-Z\u4e00-\u9fff]*/, ''),
          temp: parts[1],
          condition: parts[2],
          humidity: parts[3],
          wind: parts[4],
          icon: getWeatherIcon(parts[2]),
        });
      }
    } catch {
      // Fallback to mock data
      setWeather({
        city: location || 'Current Location',
        temp: '+22°C',
        condition: 'Partly Cloudy',
        humidity: '65%',
        wind: '→ 12 km/h',
        icon: '⛅',
      });
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(location);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
          Weather
        </h2>
      </div>

      {/* Location Search */}
      <form onSubmit={handleSearch} style={styles.searchRow}>
        <input
          style={styles.searchInput}
          placeholder="City name (e.g. Beijing, Shanghai, Tokyo)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button type="submit" style={styles.searchBtn}>Search</button>
      </form>

      {loading ? (
        <GlassPanel variant="elevated" style={styles.loadingPanel}>
          <div style={styles.loadingText}>Loading weather data...</div>
        </GlassPanel>
      ) : weather ? (
        <GlassPanel variant="elevated" style={styles.weatherPanel}>
          <div style={styles.mainRow}>
            <span style={styles.weatherIcon}>{weather.icon}</span>
            <div style={styles.tempInfo}>
              <span style={styles.temp}>{weather.temp}</span>
              <span style={styles.city}>{weather.city}</span>
            </div>
          </div>
          <div style={styles.condition}>{weather.condition}</div>
          <div style={styles.detailsRow}>
            <div style={styles.detailItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
              <span>Humidity: {weather.humidity}</span>
            </div>
            <div style={styles.detailItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>
              <span>Wind: {weather.wind}</span>
            </div>
          </div>
          <div style={styles.sourceNote}>Powered by wttr.in</div>
        </GlassPanel>
      ) : (
        <GlassPanel variant="elevated" style={styles.loadingPanel}>
          <div style={styles.loadingText}>Unable to fetch weather. Try searching for a city.</div>
        </GlassPanel>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', maxWidth: 600, margin: '0 auto', width: '100%' },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  searchRow: { display: 'flex', gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  searchBtn: { padding: '10px 20px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  loadingPanel: { padding: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: 'var(--text-muted)' },
  weatherPanel: { padding: 32, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  mainRow: { display: 'flex', alignItems: 'center', gap: 24 },
  weatherIcon: { fontSize: 64, lineHeight: 1 },
  tempInfo: { display: 'flex', flexDirection: 'column', gap: 4 },
  temp: { fontSize: 42, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px' },
  city: { fontSize: 16, color: 'var(--text-secondary)' },
  condition: { fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' },
  detailsRow: { display: 'flex', gap: 24, marginTop: 8 },
  detailItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' },
  sourceNote: { fontSize: 11, color: 'var(--text-muted)', marginTop: 8 },
};
