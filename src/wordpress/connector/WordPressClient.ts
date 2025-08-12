/*
 * Minimal WordPress REST API client for Void integration (Phase 1)
 * - Uses Application Passwords (Basic Auth)
 * - Node 18+ global fetch assumed
 */

// Buffer is available at runtime in Node. Declare shape for TS only.
declare const Buffer: {
  from(input: string, encoding?: string): { toString(encoding: "base64"): string };
};

export type WordPressPostStatus = "publish" | "draft" | "private" | "pending";

export interface WordPressClientOptions {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export interface WordPressRESTEntity {
  id: number;
  link: string;
}

export interface WordPressRenderedField {
  rendered: string;
  protected?: boolean;
}

export interface WordPressPage extends WordPressRESTEntity {
  date?: string;
  slug?: string;
  status?: WordPressPostStatus;
  title?: WordPressRenderedField;
  content?: WordPressRenderedField;
}

export interface CreatePageRequest {
  title: string;
  content: string;
  status?: WordPressPostStatus;
}

export class WordPressClient {
  private readonly siteUrl: string;
  private readonly apiUrl: string;
  private readonly basicAuthHeader: string;

  constructor(options: WordPressClientOptions) {
    const { siteUrl, username, applicationPassword } = options;
    this.siteUrl = siteUrl.replace(/\/$/, "");
    this.apiUrl = `${this.siteUrl}/wp-json/wp/v2`;

    const token = Buffer.from(`${username}:${applicationPassword}`).toString(
      "base64"
    );
    this.basicAuthHeader = `Basic ${token}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users/me`, {
        method: "GET",
        headers: {
          Authorization: this.basicAuthHeader,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async createPageWithHTMLContent(
    title: string,
    htmlContent: string,
    status: WordPressPostStatus = "publish"
  ): Promise<WordPressRESTEntity> {
    const body: CreatePageRequest = { title, content: htmlContent, status };

    const response = await fetch(`${this.apiUrl}/pages`, {
      method: "POST",
      headers: {
        Authorization: this.basicAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await safeReadJson(response);
      throw new Error(
        `Failed to create page (${response.status}): ${JSON.stringify(detail)}`
      );
    }

    const data = (await response.json()) as WordPressRESTEntity;
    return data;
  }

  async fetchPageById(pageId: number): Promise<WordPressPage> {
    const response = await fetch(`${this.apiUrl}/pages/${pageId}`, {
      method: "GET",
      headers: {
        Authorization: this.basicAuthHeader,
      },
    });

    if (!response.ok) {
      const detail = await safeReadJson(response);
      throw new Error(
        `Failed to fetch page ${pageId} (${response.status}): ${JSON.stringify(
          detail
        )}`
      );
    }

    const data = (await response.json()) as WordPressPage;
    return data;
  }

  async searchPages(
    query: {
      search?: string;
      slug?: string;
      status?: WordPressPostStatus | WordPressPostStatus[];
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<WordPressPage[]> {
    const url = new URL(`${this.apiUrl}/pages`);
    if (query.search) url.searchParams.set("search", query.search);
    if (query.slug) url.searchParams.set("slug", query.slug);
    if (query.per_page) url.searchParams.set("per_page", String(query.per_page));
    if (query.page) url.searchParams.set("page", String(query.page));
    if (query.status) {
      const value = Array.isArray(query.status)
        ? query.status.join(",")
        : query.status;
      url.searchParams.set("status", value);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: this.basicAuthHeader,
      },
    });

    if (!response.ok) {
      const detail = await safeReadJson(response);
      throw new Error(
        `Failed to search pages (${response.status}): ${JSON.stringify(detail)}`
      );
    }

    const data = (await response.json()) as WordPressPage[];
    return data;
  }

  async updatePageContent(
    pageId: number,
    contentHtml: string,
    status?: WordPressPostStatus
  ): Promise<WordPressPage> {
    const payload: { content: string; status?: WordPressPostStatus } = {
      content: contentHtml,
    };
    if (status) payload.status = status;

    const response = await fetch(`${this.apiUrl}/pages/${pageId}`, {
      method: "POST",
      headers: {
        Authorization: this.basicAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await safeReadJson(response);
      throw new Error(
        `Failed to update page ${pageId} (${response.status}): ${JSON.stringify(
          detail
        )}`
      );
    }

    const data = (await response.json()) as WordPressPage;
    return data;
  }

  // Intentionally avoid Node-specific fs usage here to keep the client environment-agnostic.
}

async function safeReadJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}

export default WordPressClient;


