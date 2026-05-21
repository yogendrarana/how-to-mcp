export type WttrResponse = {
	current_condition?: Array<{
		temp_C?: string;
		FeelsLikeC?: string;
		humidity?: string;
		windspeedKmph?: string;
		localObsDateTime?: string;
		weatherDesc?: Array<{ value?: string }>;
	}>;
	weather?: Array<{
		date?: string;
		maxtempC?: string;
		mintempC?: string;
		avgtempC?: string;
		astronomy?: Array<{
			sunrise?: string;
			sunset?: string;
		}>;
		hourly?: Array<{
			chanceofrain?: string;
			weatherDesc?: Array<{ value?: string }>;
		}>;
	}>;
};

export type ForecastDay = NonNullable<WttrResponse["weather"]>[number];

export type WeatherSnapshot = {
	city: string;
	observedAt: string;
	current: {
		temperatureC: number;
		feelsLikeC: number;
		condition: string;
		humidity: number;
		windKph: number;
	};
	forecast: Array<{
		date: string;
		maxTempC: number;
		minTempC: number;
		avgTempC: number;
		sunrise: string;
		sunset: string;
		chanceOfRain: number;
		condition: string;
	}>;
};
