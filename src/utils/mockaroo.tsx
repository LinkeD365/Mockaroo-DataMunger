import { validateRecordCount } from "./bulkOperations";

interface mockarooServiceProps {
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export class mockarooService {
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: mockarooServiceProps) {
    this.onLog = props.onLog;
  }

  async getMockData(recordCount: number, configJson: string, apiKey: string): Promise<Record<string, unknown>[]> {
    validateRecordCount(recordCount);
    const url = `https://api.mockaroo.com/api/generate.json?key=${encodeURIComponent(apiKey)}&count=${recordCount}`;

    const request = new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: configJson,
    });

    const response = await fetch(request);
    if (!response.ok) {
      this.onLog(`Error fetching mock data: ${response.statusText}`, "error");
      throw new Error(`Error fetching mock data: ${response.statusText}`);
    }
    this.onLog(`Generating ${recordCount} mock data records...`, "info");
    const generatedData: unknown = await response.json();
    if (!Array.isArray(generatedData) || !generatedData.every((row) => row !== null && typeof row === "object")) {
      throw new Error("Mockaroo returned an invalid data response.");
    }
    return generatedData as Record<string, unknown>[];
  }
}
