import type { WeatherSnapshot } from "./types.js";
export declare const SAMPLE_CITIES: string[];
export declare const FORECAST_DAY_OPTIONS: string[];
export declare function normalizeCity(city: string): string;
export declare function fetchWeather(city: string): Promise<WeatherSnapshot>;
export declare function formatCurrentWeather(snapshot: WeatherSnapshot): string;
export declare function buildTravelBrief(snapshot: WeatherSnapshot, days: number): string;
export declare function buildFallbackAdvice(snapshot: WeatherSnapshot, activity: string): string;
export declare function matchesPrefix(values: string[], partial: string): string[];
//# sourceMappingURL=helpers.d.ts.map