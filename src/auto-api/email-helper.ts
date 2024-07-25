import { AutoApi } from './auto-api.ts';
import { Inbox } from './email/inbox.ts';

export class EmailHelper {
  constructor(private autoApi: AutoApi) {}

  async getInbox(emailPrefix: string): Promise<Inbox> {
    const generatedAddress: string = (
      await this.autoApi.getEmailAddress(emailPrefix)
    ).data.emailAddress;
    return new Inbox(generatedAddress, this.autoApi);
  }
}

export * from './email/attachment.ts';
export * from './email/inbox.ts';
