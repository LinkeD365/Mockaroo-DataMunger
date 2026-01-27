interface utilsProps {
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export class UtilLib {
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: utilsProps) {
    this.onLog = props.onLog;
  }

  async alert(title: string, message: string): Promise<void> {
    return new Promise<void>((resolve) => {
      window.toolboxAPI.utils.showNotification({
        title: title,
        body: message,
        type: "error",
      });
      this.onLog(`Alert shown: ${message}`, "error");
      resolve();
    });
  }
}
