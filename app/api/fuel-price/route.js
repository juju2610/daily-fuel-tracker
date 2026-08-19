const SOURCE_URL = "https://www.setel.com/latest-fuel-prices-malaysia?lang=ms";

function toCleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function extractDieselPrice(text, label) {
  // Bounded lookahead: the correctly-paired price table has the RM amount
  // within ~80 chars of the label. A wider match risks crossing into an
  // unrelated section of the page and picking up a different fuel's price.
  const escaped = label.replace(/\//g, "\\/");
  const re = new RegExp(escaped + "[\\s\\S]{0,80}?RM\\s*([\\d.]+)");
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

function myDateFromISO(iso) {
  // Setel gives UTC instants for a Malaysia-local (UTC+8) week boundary.
  const d = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      next: { revalidate: 21600 },
    });
    if (!res.ok) throw new Error("Setel responded with status " + res.status);
    const html = await res.text();
    const text = toCleanText(html);

    const dieselB10B20 = extractDieselPrice(text, "Diesel B10/B20");
    const dieselB7 = extractDieselPrice(text, "Diesel B7");

    const weekMatch = html.match(
      /data-week="0"[^>]*data-start-date="([^"]+)"[^>]*data-end-date="([^"]+)"/
    );
    const effectiveFrom = weekMatch ? myDateFromISO(weekMatch[1]) : null;
    // The end instant marks the start of the *next* pricing week, so the
    // last valid day is one day before it (a full week runs Thu-Wed).
    const effectiveTo = effectiveFrom ? addDays(effectiveFrom, 6) : null;

    if (dieselB10B20 == null && dieselB7 == null) {
      throw new Error("Could not find diesel prices on the source page");
    }

    return Response.json({
      dieselB10B20,
      dieselB7,
      effectiveFrom,
      effectiveTo,
      source: SOURCE_URL,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { error: true, message: err.message || "Failed to fetch fuel prices" },
      { status: 502 }
    );
  }
}
