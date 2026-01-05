import { dvService } from "./dataverse";

interface mockarooServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dataverse: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class mockarooService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dataverse: dvService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: mockarooServiceProps) {
    this.connection = props.connection;
    this.dataverse = props.dataverse;
    this.onLog = props.onLog;
  }

  async getMockData(recordCount: number, configJson: string): Promise<any[]> {
    const url = `https://api.mockaroo.com/api/generate.json?key=d2a8ce90&count=${recordCount}`;
    //   const url = `https://api.mockaroo.com/api/generate.json?key=${apiKey}&count=${recordCount}`;
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
