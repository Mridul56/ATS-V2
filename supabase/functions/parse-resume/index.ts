import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParsedData {
  fullName?: string;
  email?: string;
  phone?: string;
  currentCompany?: string;
  linkedinUrl?: string;
  yearsOfExperience?: number;
}

function extractEmail(text: string): string | undefined {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : undefined;
}

function extractPhone(text: string): string | undefined {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex);
  return matches ? matches[0] : undefined;
}

function extractName(text: string): string | undefined {
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();

    if (line.length < 50 && line.length > 3) {
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const hasNoNumbers = !/\d/.test(line);
        const hasNoSpecialChars = !/[@#$%^&*()+=\[\]{}|\\:;"'<>,.?/]/.test(line);
        const startsWithCapital = /^[A-Z]/.test(line);

        if (hasNoNumbers && hasNoSpecialChars && startsWithCapital) {
          return line;
        }
      }
    }
  }

  return undefined;
}

function extractCompany(text: string): string | undefined {
  const companyKeywords = [
    /(?:at|with|for)\s+([A-Z][A-Za-z\s&,.]+?)(?:\s+(?:as|from|since|\d{4}|$))/gi,
    /(?:experience|worked|working)\s+(?:at|with|for)\s+([A-Z][A-Za-z\s&,.]+?)(?:\s+(?:as|from|since|\d{4}|$))/gi,
  ];

  for (const regex of companyKeywords) {
    const match = regex.exec(text);
    if (match && match[1]) {
      const company = match[1].trim();
      if (company.length > 2 && company.length < 50) {
        return company;
      }
    }
  }

  return undefined;
}

function extractLinkedIn(text: string): string | undefined {
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/gi;
  const matches = text.match(linkedinRegex);
  return matches ? matches[0] : undefined;
}

function extractYearsOfExperience(text: string): number | undefined {
  const yearPatterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
    /experience\s*:?\s*(\d+)\+?\s*years?/gi,
    /(\d+)\+?\s*years?\s+in/gi,
  ];

  for (const regex of yearPatterns) {
    const match = regex.exec(text);
    if (match && match[1]) {
      const years = parseInt(match[1]);
      if (years >= 0 && years <= 50) {
        return years;
      }
    }
  }

  const yearRanges = text.match(/\b(19|20)\d{2}\b/g);
  if (yearRanges && yearRanges.length >= 2) {
    const years = yearRanges.map(y => parseInt(y)).sort();
    const earliestYear = years[0];
    const currentYear = new Date().getFullYear();
    const experience = currentYear - earliestYear;
    if (experience >= 0 && experience <= 50) {
      return experience;
    }
  }

  return undefined;
}

async function parseTextContent(text: string): Promise<ParsedData> {
  const parsed: ParsedData = {};

  parsed.email = extractEmail(text);
  parsed.phone = extractPhone(text);
  parsed.fullName = extractName(text);
  parsed.currentCompany = extractCompany(text);
  parsed.linkedinUrl = extractLinkedIn(text);
  parsed.yearsOfExperience = extractYearsOfExperience(text);

  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { fileContent, fileName } = await req.json();

    if (!fileContent || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing fileContent or fileName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let textContent = "";

    if (fileName.endsWith('.txt')) {
      const decoder = new TextDecoder();
      const bytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
      textContent = decoder.decode(bytes);
    } else if (fileName.endsWith('.pdf')) {
      const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
      const bytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
      const data = await pdfParse(bytes);
      textContent = data.text;
    } else {
      return new Response(
        JSON.stringify({
          error: "Unsupported file format. Please upload PDF or TXT files.",
          parsedData: {}
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsedData = await parseTextContent(textContent);

    return new Response(
      JSON.stringify({
        success: true,
        parsedData,
        textPreview: textContent.substring(0, 500)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error parsing resume:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse resume",
        parsedData: {}
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
