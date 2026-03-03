import { useState } from "react";

export interface NDVIData {
  value: number;
  status: "poor" | "moderate" | "healthy";
  description: string;
  available: boolean;
}

export interface SoilMoistureData {
  value: number;
  level: "very_low" | "low" | "moderate" | "high";
  description: string;
  available: boolean;
}

export interface SatelliteData {
  ndvi: NDVIData;
  soilMoisture: SoilMoistureData;
  landSurfaceTemperature?: number;
  dataSource: string;
  timestamp: string;
  warnings: string[];
}

interface FetchParams {
  state: string;
  district?: string;
  season?: string;
  crop?: string;
  latitude?: number;
  longitude?: number;
}

// Season-based NDVI ranges for Indian agriculture
function getSeasonalNDVI(season?: string, crop?: string): number {
  const seasonBase: Record<string, number> = {
    kharif: 0.55,
    rabi: 0.50,
    summer: 0.35,
    zaid: 0.40,
    whole_year: 0.48,
  };

  const cropBoost: Record<string, number> = {
    rice: 0.12,
    wheat: 0.10,
    maize: 0.08,
    sugarcane: 0.15,
    cotton: 0.05,
    jute: 0.07,
    groundnut: 0.06,
    soybean: 0.09,
    potato: 0.04,
    onion: 0.03,
    mustard: 0.06,
    barley: 0.05,
    millet: 0.04,
    sorghum: 0.03,
  };

  let base = seasonBase[season?.toLowerCase() || "kharif"] || 0.45;
  const boost = cropBoost[crop?.toLowerCase() || ""] || 0;
  base += boost;

  // Add realistic variation (±0.08)
  const variation = (Math.random() - 0.5) * 0.16;
  return Math.max(0.1, Math.min(0.9, base + variation));
}

function getNDVIStatus(value: number): { status: "poor" | "moderate" | "healthy"; description: string } {
  if (value < 0.3) return { status: "poor", description: "Vegetation health is poor. Crop may be under stress due to drought, pests, or nutrient deficiency." };
  if (value < 0.5) return { status: "moderate", description: "Moderate vegetation health. Crops are growing but may benefit from additional nutrients or water." };
  return { status: "healthy", description: "Vegetation is healthy and thriving. NDVI indicates strong photosynthetic activity and good crop growth." };
}

function getSoilMoisture(season?: string, lat?: number): { value: number; level: "very_low" | "low" | "moderate" | "high" } {
  const seasonMoistureBase: Record<string, number> = {
    kharif: 65,
    rabi: 45,
    summer: 25,
    zaid: 35,
    whole_year: 45,
  };

  let base = seasonMoistureBase[season?.toLowerCase() || "kharif"] || 45;

  // Southern/coastal regions tend to have more moisture
  if (lat && lat < 15) base += 10;
  else if (lat && lat > 28) base -= 5;

  const variation = (Math.random() - 0.5) * 20;
  return categorize(Math.max(5, Math.min(95, base + variation)));
}

function categorize(value: number): { value: number; level: "very_low" | "low" | "moderate" | "high" } {
  const rounded = Math.round(value);
  if (rounded < 20) return { value: rounded, level: "very_low" };
  if (rounded < 40) return { value: rounded, level: "low" };
  if (rounded < 65) return { value: rounded, level: "moderate" };
  return { value: rounded, level: "high" };
}

function getSoilMoistureDescription(level: string): string {
  switch (level) {
    case "very_low": return "Soil moisture is critically low. Immediate irrigation recommended to prevent crop wilting.";
    case "low": return "Soil moisture is below optimal. Schedule irrigation within the next 2-3 days.";
    case "moderate": return "Soil moisture is at adequate levels for most crops. Continue monitoring.";
    case "high": return "Soil moisture is high. Reduce irrigation frequency and ensure proper drainage.";
    default: return "Soil moisture data available.";
  }
}

export function useSatelliteData() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SatelliteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSatelliteData = async (params: FetchParams): Promise<SatelliteData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate brief API delay for realism
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

      // Generate realistic NDVI based on inputs
      const ndviValue = Math.round(getSeasonalNDVI(params.season, params.crop) * 100) / 100;
      const ndviInfo = getNDVIStatus(ndviValue);

      // Generate soil moisture
      const moisture = getSoilMoisture(params.season, params.latitude);

      // Generate land surface temperature based on latitude
      const baseLST = params.latitude ? (35 - (params.latitude - 20) * 0.5) : 30;
      const lst = Math.round((baseLST + (Math.random() - 0.5) * 8) * 10) / 10;

      // Generate context-aware warnings
      const warnings: string[] = [];
      if (ndviValue < 0.3) warnings.push("Low NDVI detected — consider checking for drought stress or pest damage.");
      if (moisture.level === "very_low") warnings.push("Critical soil moisture deficit — irrigation urgently needed.");
      if (lst > 38) warnings.push("High land surface temperature may cause heat stress in crops.");
      if (moisture.level === "high" && ndviValue < 0.4) warnings.push("High moisture with low NDVI may indicate waterlogging.");

      const satelliteData: SatelliteData = {
        ndvi: {
          value: ndviValue,
          status: ndviInfo.status,
          description: ndviInfo.description,
          available: true,
        },
        soilMoisture: {
          value: moisture.value,
          level: moisture.level,
          description: getSoilMoistureDescription(moisture.level),
          available: true,
        },
        landSurfaceTemperature: lst,
        dataSource: "Simulated satellite data (MODIS/Sentinel-2 model) — real API integration available with Supabase",
        timestamp: new Date().toISOString(),
        warnings,
      };

      setData(satelliteData);
      return satelliteData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch satellite data";
      setError(message);
      console.error("Satellite data error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = () => {
    setData(null);
    setError(null);
  };

  return {
    fetchSatelliteData,
    isLoading,
    data,
    error,
    clearData,
  };
}
