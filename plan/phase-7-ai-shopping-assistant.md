# Phase 7 — Ask the AI shopping assistant real questions

**Goal:** A chat panel answers real questions ("laptops under $1000?", "compare the ROG Strix and the ThinkPad") by querying the actual product database and grounding its answer in that data — it must never invent a product that doesn't exist.
**Time:** ~4h · **Difficulty:** ●●●○○
**Depends on:** Phase 6 complete (needs search/filter to exist for the assistant to call)

## ✅ What you'll have when this is done

A `POST /api/assistant/chat` endpoint that: takes the user's message, calls the Claude API with a tool definition for "search products," lets the model call that tool against your real `ProductRepository`, and returns an answer grounded in the results. A chat panel on the frontend.

```bash
$ curl -X POST localhost:8080/api/assistant/chat -H 'Content-Type: application/json' \
  -d '{"message":"What laptops do you have under $1000?"}'
{"reply":"I don't currently have any laptops under $1000 in stock. The most affordable is the ROG Strix G16 at $1,499.00."}
```
In the browser: open the chat panel (bottom-right), ask the same question, get the same grounded (not hallucinated) answer.

## Why this phase now

This is the highest-uncertainty phase in the whole project — "will tool-calling against my real schema actually stay grounded" is a genuine unknown, not a known quantity like CRUD. Doing it once the catalog/search API is solid (Phase 6) means the AI has a real tool to call, and doing it before real-time (Phase 8) keeps the two orthogonal features from tangling.

## Before you start

Get an Anthropic API key from the [Claude console](https://console.anthropic.com) → `export ANTHROPIC_API_KEY=sk-ant-...` (never commit it).

```bash
cd backend
```
Add to `pom.xml`: `com.anthropic:anthropic-java:0.15.0` (or use the Anthropic HTTP API directly with `spring-boot-starter-webflux`'s `WebClient` if you'd rather not pull the SDK — both are shown in Anthropic's docs).

## Files in this phase

```
backend/src/main/java/com/techstore/assistant/
├── AssistantController.java     ← NEW
├── AssistantService.java        ← NEW  (the tool-calling loop)
└── ProductSearchTool.java       ← NEW  (wraps ProductRepository as a callable tool)
frontend/src/
├── api/assistant.ts             ← NEW
└── components/ChatPanel.tsx     ← NEW
```

## Steps

### 1. Define the product-search tool

**Why:** grounding means the model can only talk about products it actually looked up through this tool — never products it "remembers" from training or invents.

`backend/src/main/java/com/techstore/assistant/ProductSearchTool.java`
```java
package com.techstore.assistant;

import com.techstore.product.Product;
import com.techstore.product.ProductRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import java.util.List;

import static com.techstore.product.ProductSpecifications.*;
import org.springframework.data.jpa.domain.Specification;

@Component
public class ProductSearchTool {
    private final ProductRepository products;

    public ProductSearchTool(ProductRepository products) { this.products = products; }

    // ← this is the ONLY source of product facts the model is allowed to use
    public List<Product> search(String term, Integer maxPriceCents) {
        Specification<Product> spec = Specification
            .where(nameContains(term));
        if (maxPriceCents != null) spec = spec.and((root, q, cb) -> cb.le(root.get("priceCents"), maxPriceCents));
        return products.findAll(spec, PageRequest.of(0, 10)).getContent();
    }
}
```

### 2. The tool-calling loop

**Why:** the model doesn't answer directly from your first message — it asks to call `search_products`, you run the real query, feed the real results back, and only then does it write the reply. That round trip *is* the grounding.

`backend/src/main/java/com/techstore/assistant/AssistantService.java` (shape, using the Anthropic Java SDK)
```java
package com.techstore.assistant;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import com.techstore.product.Product;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AssistantService {
    private final AnthropicClient client = AnthropicOkHttpClient.fromEnv();   // ← reads ANTHROPIC_API_KEY
    private final ProductSearchTool searchTool;

    public AssistantService(ProductSearchTool searchTool) { this.searchTool = searchTool; }

    private static final String SYSTEM_PROMPT = """
        You are TechStore's shopping assistant. You may ONLY describe products returned
        by the search_products tool. Never invent a product, price, or spec. If the tool
        returns nothing relevant, say so plainly instead of guessing.
        """;   // ← the actual anti-hallucination guardrail is this instruction + tool-only grounding

    public String chat(String userMessage) {
        Tool searchProductsTool = Tool.builder()
            .name("search_products")
            .description("Search the real product catalog by name/keyword and optional max price in cents.")
            .inputSchema(/* JSON schema: {term: string, maxPriceCents?: integer} */ null)
            .build();

        MessageCreateParams params = MessageCreateParams.builder()
            .model(Model.CLAUDE_SONNET_5)
            .maxTokens(1024)
            .system(SYSTEM_PROMPT)
            .addTool(searchProductsTool)
            .addUserMessage(userMessage)
            .build();

        Message response = client.messages().create(params);

        // If the model requested a tool call, execute it for real and send results back
        if (response.stopReason().equals(StopReason.TOOL_USE)) {
            // ... extract tool_use block args, call searchTool.search(term, maxPriceCents),
            // append a tool_result content block with the real Product list as JSON,
            // call client.messages().create(...) again to get the final grounded text reply.
        }

        return extractText(response);   // helper: pulls the text block(s) out of the response
    }
}
```

Follow the Anthropic Java SDK's [tool-use guide](https://docs.claude.com/en/docs/build-with-claude/tool-use) for the exact tool-result round-trip shape — the load-bearing part you must not skip is: **the second API call includes the tool's real return value**, not a paraphrase written by hand.

### 3. Endpoint + frontend panel

`AssistantController.java` — `POST /api/assistant/chat` body `{"message": "..."}`, calls `AssistantService.chat`, returns `{"reply": "..."}`. No auth required for v1 (product Q&A is public); order-specific questions ("where's my order?") are a stretch goal once the assistant also has an order-lookup tool scoped to the authenticated user.

`frontend/src/components/ChatPanel.tsx` — a fixed bottom-right toggle button that opens a small chat log + text input, `POST`ing to `/api/assistant/chat` and appending the reply.

## Verify it works

```bash
curl -X POST localhost:8080/api/assistant/chat -H 'Content-Type: application/json' \
  -d '{"message":"Do you have a gaming laptop?"}'
```
Expected: a reply naming the ROG Strix G16 by its real price ($1,499.00) — ask for something you know isn't in the seed data ("do you sell drones?") and confirm it says no, rather than inventing one.

## Definition of done

- [ ] Asking about a real product returns its real price/stock, not a paraphrase that could drift from the DB
- [ ] Asking about a nonexistent product category gets an honest "we don't carry that," never a fabricated item
- [ ] The tool-calling round trip is visible in backend logs (one request with `tool_use`, one follow-up with `tool_result`)
- [ ] Committed (API key stays in an env var, never in code)

## If it breaks

| Symptom | Cause | Fix |
|---|---|---|
| Model invents a product anyway | System prompt not strict enough, or you answered from the first response instead of completing the tool round-trip | Only return `extractText` after the tool-result follow-up call, never from the initial `TOOL_USE` response |
| `401` from Anthropic | `ANTHROPIC_API_KEY` not exported in the shell running `mvn spring-boot:run` | Re-export and restart |

## Deliberately NOT in this phase

- RAG / embeddings-based semantic search → bonus, this phase's "simple version" (structured DB query as a tool) is what the spec calls out as sufficient for v1
- Order-status lookups via the assistant for authenticated users → stretch, add once comfortable with the pattern
- Streaming responses / typing indicator → polish, fold into Phase 9 if time allows

## Commit

```bash
git commit -am "phase 7: grounded AI shopping assistant via tool-calling"
```
