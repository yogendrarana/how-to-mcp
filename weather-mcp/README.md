# Weather MCP Learning Project

This project started as a simple MCP server with only tools. It now introduces the other core MCP concepts through a weather app so each concept has a practical reason to exist.

## What this server demonstrates

| Concept | In this project | Why it is useful |
| --- | --- | --- |
| Tools | `get_weather`, `weather_advice` | Use tools when the server should perform an action now, like fetching live weather or generating advice. |
| Resources | `weather://guides/concepts`, `weather://config/sample-cities` | Use fixed resources for durable reference material or configuration-like context. |
| Resource templates | `weather://city/{city}/current`, `weather://city/{city}/brief/{days}` | Use templates when the same kind of context should be available for many parameterized entities like cities or time windows. |
| Prompts | `weather_trip_planner`, `weather_commute_brief` | Use prompts to package reusable workflows on top of tools and resources. |
| Sampling | `weather_advice` | Use sampling when the server wants the client model to transform facts into natural-language guidance. |

## Why these use cases matter

- A tool is great for a direct action like "what is the weather in Kathmandu right now?"
- A resource is better when the client or model may want to read the same context multiple times.
- A resource template is better than a tool for parameterized read-only context like `weather://city/London/current`.
- A prompt is useful when you want a repeatable user workflow, such as generating a trip packing guide from a weather brief.
- Sampling helps when the raw data is not enough and you want the connected model to turn it into human-friendly advice.

## Inspector dashboard

You can explore the server with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector tsx src/index.ts
```

That opens an inspector UI where you can:

- Call tools like `get_weather`
- Browse resources and resource templates
- Run prompts
- Inspect whether sampling-backed flows like `weather_advice` are supported by your client

If you prefer package scripts, use:

```bash
npm run inspect
```

## Suggested things to try in the Inspector

1. Call `get_weather` with `Kathmandu` and compare the tool result with the resource `weather://city/Kathmandu/current`.
2. Open `weather://city/London/brief/3` to see how a resource template can act like reusable planning context.
3. Run the `weather_trip_planner` prompt for `Tokyo` and `3` days.
4. Run `weather_advice` with an activity like `motorbike commute` to see sampling turn structured weather into practical language.

## Notes on sampling

`weather_advice` uses `server.server.createMessage(...)`. If the connected MCP client supports sampling, the server asks the client model to write advice. If not, the tool falls back to deterministic rule-based advice so the project still works in simpler clients.
