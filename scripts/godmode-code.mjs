const prompt = process.argv.slice(2).join(" ").trim();

if (!prompt) {
  console.error('Usage: npm run ai:code -- "your coding prompt"');
  process.exit(1);
}

const baseUrl = process.env.GODMODE_API_BASE_URL;
const apiKey = process.env.GODMODE_API_KEY;
const model = process.env.GODMODE_MODEL;

if (!baseUrl || !apiKey || !model) {
  console.error(
    "Missing env vars. Set GODMODE_API_BASE_URL, GODMODE_API_KEY, and GODMODE_MODEL."
  );
  process.exit(1);
}

const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `******
  },
  body: JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a senior software engineer. Return practical implementation guidance and code when requested.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Request failed (${response.status}): ${body}`);
  process.exit(1);
}

const data = await response.json();
const content = data?.choices?.[0]?.message?.content;

if (!content) {
  console.error("No response content returned by API.");
  process.exit(1);
}

if (typeof content === "string") {
  console.log(content);
} else if (Array.isArray(content)) {
  console.log(
    content
      .map((part) =>
        typeof part === "string" ? part : (part?.text ?? JSON.stringify(part))
      )
      .join("\n")
  );
} else {
  console.log(JSON.stringify(content, null, 2));
}
