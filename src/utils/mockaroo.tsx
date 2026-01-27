import { dvService } from "./dataverse";

interface mockarooServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

// Mockaroo API keys are typically 8 characters long (hexadecimal format)

export class mockarooService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: mockarooServiceProps) {
    this.connection = props.connection;
    this.dvSvc = props.dvSvc;
    this.onLog = props.onLog;
  }

  async getMockData(recordCount: number, configJson: string, apiKey: string): Promise<any[]> {
    this.onLog(`Mockaroo config: ${configJson}`, "info");
    // Security: The Mockaroo API key is sent over the network. Ensure that a read-only or limited-scope key is used and kept secret.
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
    //
    this.onLog(`Generating ${recordCount} mock data records...`, "info");
    return response.json();
  }
}
