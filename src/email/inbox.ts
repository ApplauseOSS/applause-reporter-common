import { AutoApi } from '../auto-api.ts';
import { ParsedMail, simpleParser } from 'mailparser';

export class Inbox {
  constructor(
    public readonly emailAddress: string,
    private autoApi: AutoApi
  ) {}

  async getEmail(): Promise<ParsedMail> {
    const res = await this.autoApi.getEmailContent({
      emailAddress: this.emailAddress,
    });
    return await simpleParser(res.data);
  }
}
