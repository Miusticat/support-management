import { TicketCategory } from "@/lib/stats/types";

// Normalize text: lowercase, strip diacritics
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Local ticket categorization system — DB-driven keywords
export class TicketCategorizer {
  private categories: TicketCategory[] = [];

  setCategories(categories: TicketCategory[]): void {
    this.categories = categories;
  }

  async initializeCategories(): Promise<void> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/ticket-categories`);
      if (response.ok) {
        this.categories = await response.json();
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }

  // Score a ticket against all categories using DB-stored keywords + weights
  private scoreTicket(request: string): number {
    const text = normalize(request);
    const scores = new Map<number, number>();

    for (const cat of this.categories) {
      if (!cat.keywords || cat.keywords.trim() === "") continue;

      const keywords = cat.keywords
        .split(",")
        .map((k) => normalize(k.trim()))
        .filter(Boolean);

      let score = 0;
      for (const kw of keywords) {
        // Multi-word keywords: plain includes
        if (kw.includes(" ") || kw.startsWith("/")) {
          if (text.includes(kw)) score += cat.weight;
        } else {
          // Single-word keywords: word-boundary matching
          const regex = new RegExp(`(?:^|\\s|[^a-z0-9])${escapeRegex(kw)}(?:$|\\s|[^a-z0-9])`, "i");
          if (regex.test(text)) score += cat.weight;
        }
      }

      if (score > 0) scores.set(cat.id, score);
    }

    // Find category with highest score
    let maxScore = 0;
    let bestId = this.getFallbackId();

    scores.forEach((score, catId) => {
      if (score > maxScore) {
        maxScore = score;
        bestId = catId;
      }
    });

    // No keywords matched — simple heuristics
    if (maxScore === 0) {
      const generalCat = this.categories.find((c) => c.name === "General");
      if (
        text.includes("?") ||
        text.startsWith("como") ||
        text.startsWith("donde") ||
        text.startsWith("que")
      ) {
        return generalCat?.id ?? this.getFallbackId();
      }
      return this.getFallbackId();
    }

    return bestId;
  }

  private getFallbackId(): number {
    const otros = this.categories.find((c) => c.name === "Otros");
    if (otros) return otros.id;
    const general = this.categories.find((c) => c.name === "General");
    return general?.id ?? (this.categories[0]?.id ?? 1);
  }

  // Main categorization method
  async categorizeTicket(request: string): Promise<number> {
    if (this.categories.length === 0) {
      await this.initializeCategories();
    }
    return this.scoreTicket(request);
  }

  // Batch categorization
  async categorizeTickets(
    tickets: Array<{ id: number; request: string }>
  ): Promise<Array<{ id: number; categoryId: number }>> {
    const BATCH_SIZE = 1000;
    const allResults: Array<{ id: number; categoryId: number }> = [];

    console.log(`Starting local categorization of ${tickets.length} tickets...`);

    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      const batch = tickets.slice(i, i + BATCH_SIZE);

      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tickets.length / BATCH_SIZE)} (${batch.length} tickets)`
      );

      const batchResults = batch.map((ticket) => ({
        id: ticket.id,
        categoryId: this.scoreTicket(ticket.request),
      }));

      allResults.push(...batchResults);

      if (i + BATCH_SIZE < tickets.length) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    console.log(
      `Successfully categorized ${allResults.length} tickets using DB-driven rules`
    );
    return allResults;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Singleton instance
export const ticketCategorizer = new TicketCategorizer();
