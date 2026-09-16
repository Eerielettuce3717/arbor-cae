import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./pdmApi";

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  useStarttls: boolean;
  defaultRecipients: string;
  hasPassword: boolean;
}

export interface PushRecord {
  at: string;
  to: string;
  subject: string;
  commitId: string | null;
  attachmentName: string;
}

export const EMPTY_SMTP: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 587,
  username: "",
  fromAddress: "",
  useStarttls: true,
  defaultRecipients: "",
  hasPassword: false,
};

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("Mail commands require the Tauri desktop runtime");
  }
  return invoke<T>(cmd, args);
}

export const mailer = {
  getConfig: () => call<SmtpConfig>("mailer_get_config"),
  saveConfig: (args: {
    host: string;
    port: number;
    username: string;
    fromAddress: string;
    useStarttls: boolean;
    defaultRecipients: string;
    password?: string | null;
  }) => call<SmtpConfig>("mailer_save_config", args),
  listPushes: () => call<PushRecord[]>("mailer_list_pushes"),
  send: (args: {
    to: string;
    subject: string;
    body: string;
    commitId?: string | null;
    attachment?: string | null;
  }) => call<PushRecord>("mailer_send", args),
};
