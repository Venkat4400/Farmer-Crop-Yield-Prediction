import { useState, useCallback } from "react";

interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  pressure: number;
  condition: string;
  icon: string;
}

interface ForecastDay {
  day: string;
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipitationProbability?: number;
  humidity: number;
  windSpeed?: number;
  condition: string;
  icon: string;
  isHistoricalBased?: boolean;
}

interface WeeklySummary {
  week: string;
  startDate: string;
  endDate: string;
  avgTempMax: number;
  avgTempMin: number;
  totalRain: number;
  rainyDays: number;
  avgHumidity: number;
}

interface WeatherStats {
  avgTemp: number;
  totalRainfall: number;
  humidityRange: string;
  farmingConditions: string;
  rainyDays?: number;
  heavyRainDays?: number;
}

interface Recommendation {
  title: string;
  description: string;
  type: "positive" | "info" | "warning";
}

interface WeatherData {
  region: string;
  coordinates?: { lat: number; lon: number };
  forecastDays: number;
  current: CurrentWeather;
  forecast: ForecastDay[];
  weeklySummary?: WeeklySummary[];
  stats: WeatherStats;
  recommendations: Recommendation[];
  note?: string;
  success?: boolean;
}

// Region coordinates for Open-Meteo
const regionCoords: Record<string, { lat: number; lon: number; name: string }> = {
  "north-india": { lat: 28.6, lon: 77.2, name: "North India (Delhi)" },
  "south-india": { lat: 12.97, lon: 77.59, name: "South India (Bangalore)" },
  "east-india": { lat: 22.57, lon: 88.36, name: "East India (Kolkata)" },
  "west-india": { lat: 19.07, lon: 72.87, name: "West India (Mumbai)" },
  "central-india": { lat: 23.26, lon: 77.41, name: "Central India (Bhopal)" },
  "northeast-india": { lat: 26.14, lon: 91.74, name: "Northeast India (Guwahati)" },
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCondition(code: number): { condition: string; icon: string } {
  if (code <= 1) return { condition: "Clear", icon: "sun" };
  if (code <= 3) return { condition: "Partly Cloudy", icon: "cloud-sun" };
  if (code <= 48) return { condition: "Cloudy", icon: "cloud" };
  if (code <= 67) return { condition: "Rain", icon: "cloud-rain" };
  if (code <= 77) return { condition: "Snow", icon: "cloud-snow" };
  if (code <= 82) return { condition: "Heavy Rain", icon: "cloud-rain" };
  if (code <= 99) return { condition: "Thunderstorm", icon: "cloud-lightning" };
  return { condition: "Cloudy", icon: "cloud" };
}

function getFarmingConditions(avgTemp: number, totalRain: number): string {
  if (avgTemp >= 20 && avgTemp <= 35 && totalRain >= 10 && totalRain <= 100)
    return "Favorable";
  if (avgTemp > 40 || totalRain > 200) return "Challenging";
  if (avgTemp < 10) return "Too Cold";
  return "Moderate";
}

function getRecommendations(avgTemp: number, totalRain: number, humidity: number): Recommendation[] {
  const recs: Recommendation[] = [];

  if (avgTemp > 35) {
    recs.push({ title: "Heat Alert", description: "High temperatures expected. Ensure adequate irrigation and consider mulching to retain soil moisture.", type: "warning" });
  } else if (avgTemp >= 22 && avgTemp <= 32) {
    recs.push({ title: "Ideal Growing Temperature", description: "Temperature range is ideal for most kharif crops. Good time for sowing and transplanting.", type: "positive" });
  }

  if (totalRain > 80) {
    recs.push({ title: "Heavy Rainfall Expected", description: "Ensure proper drainage in fields. Delay fertilizer application until dry spell.", type: "warning" });
  } else if (totalRain >= 20 && totalRain <= 80) {
    recs.push({ title: "Moderate Rainfall", description: "Rainfall is adequate for most crops. Monitor soil moisture levels regularly.", type: "positive" });
  } else {
    recs.push({ title: "Low Rainfall", description: "Consider supplemental irrigation. Drought-resistant varieties may be beneficial.", type: "info" });
  }

  if (humidity > 80) {
    recs.push({ title: "High Humidity Warning", description: "Elevated humidity increases risk of fungal diseases. Apply preventive fungicides and ensure air circulation.", type: "warning" });
  } else {
    recs.push({ title: "Good Air Conditions", description: "Humidity levels are manageable. Continue regular crop monitoring.", type: "positive" });
  }

  recs.push({ title: "Market Advisory", description: "Check local mandi prices before harvesting. Consider storage if prices are currently low.", type: "info" });

  return recs;
}

export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (region: string = "north-india", lat?: number, lon?: number, days: number = 30) => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine coordinates
      let useLat = lat;
      let useLon = lon;
      let regionName = region;

      if (useLat === undefined || useLon === undefined) {
        const coords = regionCoords[region];
        if (coords) {
          useLat = coords.lat;
          useLon = coords.lon;
          regionName = coords.name;
        } else {
          useLat = 28.6;
          useLon = 77.2;
          regionName = region;
        }
      }

      // Fetch from Open-Meteo (free, no API key needed)
      const forecastDays = Math.min(days, 16); // Open-Meteo max is 16 days forecast
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${useLat}&longitude=${useLon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,surface_pressure,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,relative_humidity_2m_mean,wind_speed_10m_max&forecast_days=${forecastDays}&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather API returned an error");

      const apiData = await response.json();

      // Parse current weather
      const currentCondition = getCondition(apiData.current.weather_code);
      const current: CurrentWeather = {
        temperature: Math.round(apiData.current.temperature_2m),
        feelsLike: Math.round(apiData.current.apparent_temperature),
        humidity: Math.round(apiData.current.relative_humidity_2m),
        precipitation: Math.round(apiData.current.precipitation * 10) / 10,
        windSpeed: Math.round(apiData.current.wind_speed_10m),
        pressure: Math.round(apiData.current.surface_pressure),
        condition: currentCondition.condition,
        icon: currentCondition.icon,
      };

      // Parse daily forecast
      const forecast: ForecastDay[] = apiData.daily.time.map((dateStr: string, i: number) => {
        const d = new Date(dateStr);
        const cond = getCondition(apiData.daily.weather_code[i]);
        return {
          day: dayNames[d.getDay()],
          date: dateStr,
          tempMax: Math.round(apiData.daily.temperature_2m_max[i]),
          tempMin: Math.round(apiData.daily.temperature_2m_min[i]),
          precipitation: Math.round((apiData.daily.precipitation_sum[i] || 0) * 10) / 10,
          precipitationProbability: apiData.daily.precipitation_probability_max?.[i] || 0,
          humidity: Math.round(apiData.daily.relative_humidity_2m_mean?.[i] || 60),
          windSpeed: Math.round(apiData.daily.wind_speed_10m_max?.[i] || 0),
          condition: cond.condition,
          icon: cond.icon,
        };
      });

      // Calculate stats
      const avgTemp = Math.round(forecast.reduce((s, d) => s + (d.tempMax + d.tempMin) / 2, 0) / forecast.length);
      const totalRainfall = Math.round(forecast.reduce((s, d) => s + d.precipitation, 0) * 10) / 10;
      const humidities = forecast.map(d => d.humidity);
      const minHumidity = Math.min(...humidities);
      const maxHumidity = Math.max(...humidities);
      const avgHumidity = Math.round(humidities.reduce((s, h) => s + h, 0) / humidities.length);
      const rainyDays = forecast.filter(d => d.precipitation > 1).length;
      const heavyRainDays = forecast.filter(d => d.precipitation > 20).length;

      const stats: WeatherStats = {
        avgTemp,
        totalRainfall,
        humidityRange: `${minHumidity}% - ${maxHumidity}%`,
        farmingConditions: getFarmingConditions(avgTemp, totalRainfall),
        rainyDays,
        heavyRainDays,
      };

      const recommendations = getRecommendations(avgTemp, totalRainfall, avgHumidity);

      const weatherData: WeatherData = {
        success: true,
        region: regionName,
        coordinates: { lat: useLat!, lon: useLon! },
        forecastDays: forecast.length,
        current,
        forecast,
        stats,
        recommendations,
        note: "Weather data from Open-Meteo — free, real-time forecast",
      };

      setData(weatherData);
      return weatherData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch weather";
      setError(message);
      console.error("Weather fetch error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchWeather,
  };
}
