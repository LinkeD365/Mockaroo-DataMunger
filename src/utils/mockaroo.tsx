import { dvService } from "./dataverse";

interface mockarooServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dataverse: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

// Mockaroo API keys are typically 8 characters long (hexadecimal format)
const MIN_API_KEY_LENGTH = 8;

export class mockarooService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dataverse: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: mockarooServiceProps) {
    this.connection = props.connection;
    this.dataverse = props.dataverse;
    this.onLog = props.onLog;
  }

  async getMockData(recordCount: number, configJson: string, apiKey: string): Promise<any[]> {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      this.onLog("Mockaroo API key is not configured. Please enter your API key.", "error");
      throw new Error("Mockaroo API key is not configured.");
    }
    if (trimmedApiKey.length < MIN_API_KEY_LENGTH) {
      this.onLog("Mockaroo API key appears to be invalid. Please check your API key.", "error");
      throw new Error("Mockaroo API key appears to be invalid.");
    }
    const url = `https://api.mockaroo.com/api/generate.json?key=${encodeURIComponent(trimmedApiKey)}&count=${recordCount}`;
    console.log("configJson:", configJson);
    const request = new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: configJson,
    });
    console.log("Fetching mock data from Mockaroo with config:", request);
    const response = await fetch(request);
    if (!response.ok) {
      this.onLog(`Error fetching mock data: ${response.statusText}`, "error");
      throw new Error(`Error fetching mock data: ${response.statusText}`);
    }
    //console.log(await response.text());
    this.onLog(`Generating ${recordCount} mock data records...`, "info");
    return response.json();
  }
}
