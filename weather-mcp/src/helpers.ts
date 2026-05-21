import type { ForecastDay, WeatherSnapshot, WttrResponse } from "./types.js";

export const SAMPLE_CITIES = [
	"Kathmandu",
	"London",
	"New York",
	"Tokyo",
	"Sydney",
];

export const FORECAST_DAY_OPTIONS = ["1", "3"];

function parseNumber(value: string | undefined, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCity(city: string) {
	return city.trim();
}

function summarizeForecastDay(day: ForecastDay) {
	const firstHour = day?.hourly?.[0];

	return {
		date: day?.date ?? "unknown",
		maxTempC: parseNumber(day?.maxtempC),
		minTempC: parseNumber(day?.mintempC),
		avgTempC: parseNumber(day?.avgtempC),
		sunrise: day?.astronomy?.[0]?.sunrise ?? "unknown",
		sunset: day?.astronomy?.[0]?.sunset ?? "unknown",
		chanceOfRain: parseNumber(firstHour?.chanceofrain),
		condition: firstHour?.weatherDesc?.[0]?.value ?? "Unknown",
	};
}

export async function fetchWeather(city: string): Promise<WeatherSnapshot> {
	const normalizedCity = normalizeCity(city);
	const response = await fetch(
		`https://wttr.in/${encodeURIComponent(normalizedCity)}?format=j1`,
	);

	if (!response.ok) {
		throw new Error(`Weather service responded with ${response.status}`);
	}

	const data = (await response.json()) as WttrResponse;
	const current = data.current_condition?.[0];

	if (!current) {
		throw new Error(`No weather data found for ${normalizedCity}`);
	}

	return {
		city: normalizedCity,
		observedAt: current.localObsDateTime ?? new Date().toISOString(),
		current: {
			temperatureC: parseNumber(current.temp_C),
			feelsLikeC: parseNumber(current.FeelsLikeC),
			condition: current.weatherDesc?.[0]?.value ?? "Unknown",
			humidity: parseNumber(current.humidity),
			windKph: parseNumber(current.windspeedKmph),
		},
		forecast: (data.weather ?? []).map(summarizeForecastDay),
	};
}

export function formatCurrentWeather(snapshot: WeatherSnapshot) {
	return [
		`Weather in ${snapshot.city}`,
		`Temperature: ${snapshot.current.temperatureC}°C`,
		`Feels like: ${snapshot.current.feelsLikeC}°C`,
		`Condition: ${snapshot.current.condition}`,
		`Humidity: ${snapshot.current.humidity}%`,
		`Wind: ${snapshot.current.windKph} km/h`,
		`Observed at: ${snapshot.observedAt}`,
	].join("\n");
}

function formatForecast(snapshot: WeatherSnapshot, days: number) {
	return snapshot.forecast
		.slice(0, days)
		.map((day) =>
			[
				`${day.date}`,
				`  Condition: ${day.condition}`,
				`  Temp: ${day.minTempC}°C to ${day.maxTempC}°C (avg ${day.avgTempC}°C)`,
				`  Rain chance: ${day.chanceOfRain}%`,
				`  Sunrise/Sunset: ${day.sunrise} / ${day.sunset}`,
			].join("\n"),
		)
		.join("\n\n");
}

export function buildTravelBrief(snapshot: WeatherSnapshot, days: number) {
	return [
		`# ${snapshot.city} weather brief`,
		"",
		"## Current conditions",
		`- Temperature: ${snapshot.current.temperatureC}°C`,
		`- Feels like: ${snapshot.current.feelsLikeC}°C`,
		`- Condition: ${snapshot.current.condition}`,
		`- Humidity: ${snapshot.current.humidity}%`,
		`- Wind: ${snapshot.current.windKph} km/h`,
		"",
		"## Forecast",
		formatForecast(snapshot, days),
	].join("\n");
}

export function buildFallbackAdvice(
	snapshot: WeatherSnapshot,
	activity: string,
) {
	const layers =
		snapshot.current.temperatureC <= 10
			? "Wear warm layers."
			: snapshot.current.temperatureC >= 28
				? "Wear light, breathable clothing."
				: "Light layers should work well.";

	const todayRainChance = snapshot.forecast[0]?.chanceOfRain ?? 0;
	const rainNote =
		todayRainChance >= 50
			? "Carry an umbrella because rain looks possible."
			: "Rain risk looks fairly manageable.";

	return `${activity} in ${snapshot.city}: ${layers} ${rainNote} Current condition is ${snapshot.current.condition.toLowerCase()} with ${snapshot.current.temperatureC}°C.`;
}

export function matchesPrefix(values: string[], partial: string) {
	return values.filter((value) =>
		value.toLowerCase().startsWith(partial.toLowerCase()),
	);
}
