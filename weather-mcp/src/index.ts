import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
	name: "weather-server",
	version: "1.0.0",
});

// Register tool
server.registerTool(
	"get_weather",
	{
		title: "Get Weather",
		description: "Get current weather for a city",
		inputSchema: {
			city: z.string().describe("City name"),
		},
	},
	async ({ city }) => {
		try {
			const response = await fetch(
				`https://wttr.in/${encodeURIComponent(city)}?format=j1`,
			);

			const data = await response.json();

			const current = data.current_condition?.[0];

			if (!current) {
				return {
					content: [
						{
							type: "text",
							text: `No weather data found for ${city}`,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text",
						text: ` 
                Weather in ${city}
                Temperature: ${current.temp_C}°C
                Feels Like: ${current.FeelsLikeC}°C
                Condition: ${current.weatherDesc?.[0]?.value}
                Humidity: ${current.humidity}%
                            `.trim(),
					},
				],
			};
		} catch (_) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to fetch weather for ${city}`,
					},
				],
			};
		}
	},
);

async function main() {
	const transport = new StdioServerTransport();

	await server.connect(transport);

	console.error("Weather MCP Server running...");
}

main().catch(console.error);
