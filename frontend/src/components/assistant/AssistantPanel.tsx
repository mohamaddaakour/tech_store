import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { useProducts } from "../../hooks/useProducts";
import { getBrand, getCategory } from "../../lib/catalog";
import { formatPrice } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import type { Product } from "../../types/product";

/**
 * The AI shopping assistant panel.
 *
 * ## What this honestly is
 *
 * SUBJECT.md Phase 7 specifies a real AI assistant, grounded in the database via
 * RAG. That needs backend work which is explicitly out of scope here, so this is
 * the **interface** for it, answering from the product list already in the cache
 * with deterministic rules — not a language model.
 *
 * It is labelled as such in the UI rather than pretending, and the rules only
 * ever surface products that actually exist. That respects the spec's hardest
 * constraint — "the AI must never invent products that do not exist" — which a
 * mocked chat transcript would violate the moment someone asked about a product
 * that is not in stock.
 *
 * When the backend lands, `answer()` becomes a mutation to `/api/assistant` and
 * the surrounding chat UI is unchanged.
 */

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** Products cited by this answer, rendered as real, clickable cards. */
  products?: Product[];
}

/** Canned prompts, taken from the examples in SUBJECT.md Phase 7. */
const SUGGESTIONS = [
  "What laptops are under $1500?",
  "Which product has the best GPU?",
  "What is in stock right now?",
  "Recommend something for programming",
];

/**
 * Deterministic query handling over the real catalog.
 *
 * Reads as a small rules engine: match intent by keyword, then answer from data.
 * Every branch cites products from `products`, so an answer can never mention
 * something that does not exist.
 */
function answer(question: string, products: Product[]): Message {
  const text = question.toLowerCase();
  const id = Date.now();

  // --- "under $X" / "cheaper than X" -> price filter -------------------------
  const priceMatch = text.match(/(?:under|below|less than|cheaper than)\s*\$?\s*(\d[\d,]*)/);
  if (priceMatch) {
    const limitCents = Number(priceMatch[1].replace(/,/g, "")) * 100;
    const matches = products.filter((product) => product.priceCents <= limitCents);

    return {
      id,
      role: "assistant",
      text: matches.length
        ? `I found ${matches.length} product${matches.length === 1 ? "" : "s"} at or below ${formatPrice(limitCents)}.`
        : `Nothing in the catalogue is at or below ${formatPrice(limitCents)} right now. The cheapest option is ${formatPrice(Math.min(...products.map((p) => p.priceCents)))}.`,
      products: matches,
    };
  }

  // --- stock ---------------------------------------------------------------
  if (/stock|available|availability/.test(text)) {
    const inStock = products.filter((product) => product.inStock);
    return {
      id,
      role: "assistant",
      text: `${inStock.length} of ${products.length} products are in stock.`,
      products: inStock,
    };
  }

  // --- GPU / gaming --------------------------------------------------------
  if (/gpu|graphics|gaming|rtx/.test(text)) {
    const gpuProducts = products.filter((product) =>
      /rtx|gtx|graphics|gaming/i.test(`${product.name} ${product.description}`),
    );
    return {
      id,
      role: "assistant",
      text: gpuProducts.length
        ? "These have discrete graphics mentioned in their specifications:"
        : "No product in the catalogue lists a discrete GPU.",
      products: gpuProducts,
    };
  }

  // --- work / programming --------------------------------------------------
  if (/programming|coding|develop|work|business/.test(text)) {
    const laptops = products.filter((product) => getCategory(product) === "Laptops");
    return {
      id,
      role: "assistant",
      text: laptops.length
        ? "For development work I would look at these — prioritise RAM and screen quality:"
        : "There are no laptops in the catalogue at the moment.",
      products: laptops,
    };
  }

  // --- cheapest / most expensive -------------------------------------------
  if (/cheapest|budget|least expensive/.test(text)) {
    const cheapest = [...products].sort((a, b) => a.priceCents - b.priceCents)[0];
    return {
      id,
      role: "assistant",
      text: cheapest ? "The most affordable option is:" : "The catalogue is empty.",
      products: cheapest ? [cheapest] : [],
    };
  }

  // --- fallback ------------------------------------------------------------
  // Says plainly that it did not understand and shows the catalogue, rather than
  // inventing a plausible-sounding answer.
  return {
    id,
    role: "assistant",
    text:
      "I can answer questions about price, stock, and specifications. " +
      `Here is everything in the catalogue (${products.length} products):`,
    products,
  };
}

export function AssistantPanel() {
  const isOpen = useUiStore((state) => state.openPanel === "assistant");
  const closePanel = useUiStore((state) => state.closePanel);

  const { data: products } = useProducts();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !products) return;

    setMessages((current) => [
      ...current,
      { id: Date.now() - 1, role: "user", text: trimmed },
      answer(trimmed, products),
    ]);
    setInput("");
  }

  function openProduct(productId: number) {
    closePanel();
    navigate(`/product/${productId}`);
  }

  return (
    <Drawer open={isOpen} onClose={closePanel} title="Shopping assistant">
      <div className="flex flex-col gap-4">
        {/* Honest labelling, in the UI and not just in a code comment. */}
        <div className="rounded-control bg-info-soft p-3">
          <p className="text-[11px] leading-relaxed text-info">
            Answers come from live catalogue data using rule-based matching. The
            language-model version arrives with the Phase 7 backend — so it will never
            invent a product that does not exist.
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-ink-muted">Try asking</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => ask(suggestion)}
                className="rounded-control bg-surface-2 px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => (
              <li
                key={message.id}
                className={message.role === "user" ? "flex justify-end" : "flex flex-col gap-2"}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-control bg-accent px-3 py-2 text-xs text-accent-ink"
                      : "flex items-start gap-2 text-xs leading-relaxed text-ink-muted"
                  }
                >
                  {message.role === "assistant" && (
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  )}
                  <span>{message.text}</span>
                </div>

                {/* Cited products, as real cards you can act on. */}
                {message.products && message.products.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {message.products.map((product) => (
                      <li key={product.id}>
                        <button
                          onClick={() => openProduct(product.id)}
                          className="flex w-full items-center gap-2.5 rounded-control bg-surface-2 p-2 text-left transition-colors hover:bg-surface-3"
                        >
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="size-9 shrink-0 rounded object-cover"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-medium text-ink">
                              {product.name}
                            </span>
                            <span className="text-[10px] text-ink-faint">
                              {getBrand(product)}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink">
                            {formatPrice(product.priceCents)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* ---- Composer ---- */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
          className="sticky bottom-0 flex gap-2 bg-surface pt-2"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about a product…"
            className="h-9 flex-1 rounded-control bg-surface-2 px-3 text-xs text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
          />
          <Button type="submit" size="sm" disabled={!input.trim()}>
            Ask
          </Button>
        </form>

        {messages.length > 0 && (
          <Badge tone="neutral" className="self-start">
            {messages.filter((m) => m.role === "user").length} question(s) this session
          </Badge>
        )}
      </div>
    </Drawer>
  );
}
