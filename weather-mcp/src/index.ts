import {
	McpServer,
	ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
	buildFallbackAdvice,
	buildTravelBrief,
	fetchWeather,
	formatCurrentWeather,
	FORECAST_DAY_OPTIONS,
	matchesPrefix,
	normalizeCity,
	SAMPLE_CITIES,
} from "./helpers.js";

const server = new McpServer({
	name: "weather-server",
	version: "2.0.0",
});

const weatherOutputSchema = z.object({
	city: z.string(),
	observedAt: z.string(),
	temperatureC: z.number(),
	feelsLikeC: z.number(),
	condition: z.string(),
	humidity: z.number(),
	windKph: z.number(),
});

server.registerTool(
	"get_weather",
	{
		title: "Get Weather",
		description: "Get current weather for a city.",
		inputSchema: {
			city: z.string().describe("City name"),
		},
		outputSchema: weatherOutputSchema,
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: true,
		},
	},
	async ({ city }) => {
		try {
			const snapshot = await fetchWeather(city);

			return {
				structuredContent: {
					city: snapshot.city,
					observedAt: snapshot.observedAt,
					temperatureC: snapshot.current.temperatureC,
					feelsLikeC: snapshot.current.feelsLikeC,
					condition: snapshot.current.condition,
					humidity: snapshot.current.humidity,
					windKph: snapshot.current.windKph,
				},
				content: [
					{
						type: "text",
						text: formatCurrentWeather(snapshot),
					},
				],
			};
		} catch (error) {
			return {
				isError: true,
				content: [
					{
						type: "text",
						text:
							error instanceof Error
								? error.message
								: `Failed to fetch weather for ${city}`,
					},
				],
			};
		}
	},
);

server.registerTool(
	"weather_advice",
	{
		title: "Weather Advice",
		description:
			"Use current weather plus MCP sampling to generate human-friendly activity advice.",
		inputSchema: {
			city: z.string().describe("City name"),
			activity: z
				.string()
				.default("a normal day outside")
				.describe("What the person plans to do"),
		},
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: true,
		},
	},
	async ({ city, activity }) => {
		try {
			const snapshot = await fetchWeather(city);
			const fallbackAdvice = buildFallbackAdvice(snapshot, activity);

			try {
				const response = await server.server.createMessage({
					systemPrompt:
						"You are a practical weather assistant. Give grounded, concise advice based only on the provided weather facts.",
					messages: [
						{
							role: "user",
							content: {
								type: "text",
								text: [
									`Activity: ${activity}`,
									`City: ${snapshot.city}`,
									`Current temperature: ${snapshot.current.temperatureC}°C`,
									`Feels like: ${snapshot.current.feelsLikeC}°C`,
									`Condition: ${snapshot.current.condition}`,
									`Humidity: ${snapshot.current.humidity}%`,
									`Wind: ${snapshot.current.windKph} km/h`,
									`Rain chance today: ${snapshot.forecast[0]?.chanceOfRain ?? 0}%`,
									"Give 3-4 short sentences with clothing advice, comfort/risk notes, and one useful preparation tip.",
								].join("\n"),
							},
						},
					],
					maxTokens: 250,
				});

				return {
					content: [
						{
							type: "text",
							text:
								response.content.type === "text"
									? response.content.text
									: fallbackAdvice,
						},
					],
				};
			} catch {
				return {
					content: [
						{
							type: "text",
							text: fallbackAdvice,
						},
					],
				};
			}
		} catch (error) {
			return {
				isError: true,
				content: [
					{
						type: "text",
						text:
							error instanceof Error
								? error.message
								: `Failed to build advice for ${city}`,
					},
				],
			};
		}
	},
);

server.registerResource(
	"weather-concepts-guide",
	"weather://guides/concepts",
	{
		title: "Weather MCP Concepts Guide",
		description:
			"Explains how this demo uses tools, resources, resource templates, prompts, and sampling.",
		mimeType: "text/markdown",
	},
	async () => ({
		contents: [
			{
				uri: "weather://guides/concepts",
				text: [
					"# Weather MCP concept guide",
					"",
					"- `get_weather`: a tool for action-oriented live weather lookup.",
					"- `weather_advice`: demonstrates sampling by asking the client model to turn structured weather into user-friendly advice.",
					"- `weather_trip_planner`: a prompt that turns weather resources into a reusable workflow.",
					"- `weather://city/{city}/current`: a resource template for reusable current conditions context.",
					"- `weather://city/{city}/brief/{days}`: a resource template for readable planning context.",
					"",
					"Use tools when you want the server to do something now.",
					"Use resources when you want durable context the client or model can read later.",
					"Use resource templates when that context should be parameterized by things like city or number of days.",
					"Use prompts when you want reusable instructions on top of your tools and resources.",
				].join("\n"),
			},
		],
	}),
);

server.registerResource(
	"sample-cities",
	"weather://config/sample-cities",
	{
		title: "Sample Cities",
		description:
			"Starter city list used for completions and resource discovery.",
		mimeType: "application/json",
	},
	async () => ({
		contents: [
			{
				uri: "weather://config/sample-cities",
				text: JSON.stringify({ cities: SAMPLE_CITIES }, null, 2),
			},
		],
	}),
);

server.registerResource(
	"city-current-resource",
	new ResourceTemplate("weather://city/{city}/current", {
		list: async () => ({
			resources: SAMPLE_CITIES.map((city) => ({
				name: `${city} current weather`,
				uri: `weather://city/${encodeURIComponent(city)}/current`,
				mimeType: "application/json",
				description: `Current conditions for ${city}`,
			})),
		}),
		complete: {
			city: async (value) => matchesPrefix(SAMPLE_CITIES, value),
		},
	}),
	{
		title: "City Current Weather",
		description:
			"Dynamic resource template for reusable current conditions by city.",
		mimeType: "application/json",
	},
	async (uri, variables) => {
		const city = normalizeCity(String(variables.city ?? ""));
		const snapshot = await fetchWeather(city);

		return {
			contents: [
				{
					uri: uri.toString(),
					text: JSON.stringify(
						{
							city: snapshot.city,
							observedAt: snapshot.observedAt,
							current: snapshot.current,
						},
						null,
						2,
					),
				},
			],
		};
	},
);

server.registerResource(
	"city-weather-brief",
	new ResourceTemplate("weather://city/{city}/brief/{days}", {
		list: async () => ({
			resources: SAMPLE_CITIES.flatMap((city) =>
				FORECAST_DAY_OPTIONS.map((days) => ({
					name: `${city} ${days}-day weather brief`,
					uri: `weather://city/${encodeURIComponent(city)}/brief/${days}`,
					mimeType: "text/markdown",
					description: `Planning brief for ${city} covering ${days} day(s)`,
				})),
			),
		}),
		complete: {
			city: async (value) => matchesPrefix(SAMPLE_CITIES, value),
			days: async (value) => matchesPrefix(FORECAST_DAY_OPTIONS, value),
		},
	}),
	{
		title: "City Weather Brief",
		description:
			"Dynamic markdown brief that is useful as rich planning context for travel or daily preparation.",
		mimeType: "text/markdown",
	},
	async (uri, variables) => {
		const city = normalizeCity(String(variables.city ?? ""));
		const requestedDays = Number(variables.days ?? "1");
		const days = requestedDays >= 3 ? 3 : 1;
		const snapshot = await fetchWeather(city);

		return {
			contents: [
				{
					uri: uri.toString(),
					text: buildTravelBrief(snapshot, days),
				},
			],
		};
	},
);

server.registerPrompt(
	"weather_trip_planner",
	{
		title: "Weather Trip Planner",
		description:
			"Reusable prompt for turning a weather brief resource into a travel plan.",
		argsSchema: {
			city: z.string().describe("City to plan for"),
			days: z
				.enum(["1", "3"])
				.default("3")
				.describe("How many forecast days to consider"),
			tripType: z
				.string()
				.default("city sightseeing")
				.describe("Type of trip or activity"),
		},
	},
	async ({ city, days, tripType }) => ({
		messages: [
			{
				role: "user",
				content: {
					type: "text",
					text: [
						`I am planning ${tripType} in ${city}.`,
						`Read the resource weather://city/${encodeURIComponent(city)}/brief/${days}.`,
						"Then suggest what to wear, the best time windows to be outside, and what I should pack.",
					].join("\n"),
				},
			},
		],
	}),
);

server.registerPrompt(
	"weather_commute_brief",
	{
		title: "Weather Commute Brief",
		description:
			"Reusable prompt for daily commute preparation using the current weather resource.",
		argsSchema: {
			city: z.string().describe("City for the commute"),
			commuteMode: z
				.string()
				.default("walking")
				.describe("How the person will commute"),
		},
	},
	async ({ city, commuteMode }) => ({
		messages: [
			{
				role: "user",
				content: {
					type: "text",
					text: [
						`I am commuting in ${city} by ${commuteMode}.`,
						`Use the resource weather://city/${encodeURIComponent(city)}/current.`,
						"Give me a compact commute brief with comfort, rain, and clothing considerations.",
					].join("\n"),
				},
			},
		],
	}),
);

async function main() {
	const transport = new StdioServerTransport();

	await server.connect(transport);

	console.error("Weather MCP server running...");
}

main().catch((error) => {
	console.error("Weather MCP server failed:", error);
	process.exit(1);
});
