import { afterEach, describe, expect, it, vi } from "vitest";
import evalSet from "../data/enquiries.eval.json";
import { decideLane, triageEnquiry } from "@/lib/ai/classify";
import { unverifiedAmounts } from "@/lib/ai/draft";
import { extractEntities } from "@/lib/ai/extract";

const received = new Date("2026-11-08T10:00:00+05:30");

describe("brief sample enquiries", () => {
  it.each([
    ["Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights", "WEDDING"],
    ["Is a villa free 14-16 Nov for 2 adults and a child?", "ROOM"],
    ["Team of 45 wants a January offsite with a conference hall", "OFFSITE"],
  ])("%s → %s", async (message, expected) => {
    const t = await triageEnquiry(message, received, { useLlm: false });
    expect(t.category).toBe(expected);
    expect(t.lane).toBe(expected);
  });

  it("extracts the facts the draft needs", () => {
    expect(extractEntities("Is a villa free 14-16 Nov for 2 adults and a child?", received)).toMatchObject({
      checkIn: "2026-11-14",
      checkOut: "2026-11-16",
      nights: 2,
      adults: 2,
      children: 1,
      roomPreference: "VILLA",
    });
    expect(extractEntities("Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights", received)).toMatchObject({
      eventMonth: "2027-02",
      guests: 250,
      nights: 2,
    });
    expect(extractEntities("Team of 45 wants a January offsite with a conference hall", received)).toMatchObject({
      eventMonth: "2027-01",
      guests: 45,
      needs: ["Meeting space"],
    });
  });

  it("rolls a date that has passed this year into next year", () => {
    expect(extractEntities("room on 3 Jan for 2 adults", received).checkIn).toBe("2027-01-03");
  });

  it("reads budgets in lakh", () => {
    expect(extractEntities("budget 20 lakh for 180 guests", received)).toMatchObject({ budget: 2_000_000, guests: 180 });
  });
});

describe("routing safety", () => {
  it("held-out set: no enquiry is routed confidently to the wrong lane", async () => {
    let wrongAndRouted = 0;
    for (const ex of evalSet) {
      const t = await triageEnquiry(ex.text, received, { useLlm: false });
      if (t.category !== ex.label && t.lane !== "UNSORTED") wrongAndRouted++;
    }
    expect(wrongAndRouted).toBe(0);
  });

  it("vague messages go to the unsorted lane", async () => {
    for (const msg of ["hello can u share details", "price?", "what's the weather like in december"]) {
      expect((await triageEnquiry(msg, received, { useLlm: false })).lane).toBe("UNSORTED");
    }
  });

  it("complaints alert the GM by rule, even if the model reads it as a booking", () => {
    expect(decideLane("ROOM", 0.95, ["dirty"])).toEqual({ category: "COMPLAINT", lane: "COMPLAINT", gmAlert: true });
  });

  it("a complaint hidden in a booking request still reaches the GM", async () => {
    const t = await triageEnquiry("Want to rebook for 2 nights in Jan but last time the room was dirty and staff were rude", received, { useLlm: false });
    expect(t.lane).toBe("COMPLAINT");
    expect(t.gmAlert).toBe(true);
  });
});

describe("cloud model fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("falls back to the local model when the API errors", async () => {
    vi.stubEnv("LLM_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    const t = await triageEnquiry("Team of 45 wants a January offsite with a conference hall", received);
    expect(t.classifiedBy).toBe("LOCAL");
    expect(t.lane).toBe("OFFSITE");
    expect(t.reasons.join(" ")).toMatch(/Cloud model unavailable/);
  });

  it("rejects malformed model output instead of trusting it", async () => {
    vi.stubEnv("LLM_API_KEY", "test-key");
    const body = { choices: [{ message: { content: JSON.stringify({ category: "SPA", confidence: 2 }) } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
    const t = await triageEnquiry("Is a villa free 14-16 Nov for 2 adults and a child?", received);
    expect(t.classifiedBy).toBe("LOCAL");
    expect(t.category).toBe("ROOM");
  });

  it("uses valid model output, but complaints still follow the rule", async () => {
    vi.stubEnv("LLM_API_KEY", "test-key");
    const body = { choices: [{ message: { content: JSON.stringify({ category: "ROOM", confidence: 0.9 }) } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
    const t = await triageEnquiry("I was charged twice for my room, please refund", received);
    expect(t.classifiedBy).toBe("LLM");
    expect(t.lane).toBe("COMPLAINT");
  });
});

describe("price guard on edited drafts", () => {
  it("flags amounts that didn't come from the rate table", () => {
    const facts = [{ kind: "price" as const, text: "", amount: 41890, source: "rate table" }];
    expect(unverifiedAmounts("Total ₹41,890 incl. GST", facts)).toEqual([]);
    expect(unverifiedAmounts("Special price ₹35,000 for you", facts)).toEqual(["₹35,000"]);
  });
});
