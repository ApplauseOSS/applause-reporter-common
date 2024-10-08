import { readFileSync } from "fs";
import { AutoApi } from "../src/auto-api/auto-api.ts";
import { EmailAddressResponse } from "../src/auto-api/dto.ts";

import { EmailHelper } from "../src/auto-api/email-helper.ts";
import { AddressObject } from "mailparser";
import { randomUUID } from "crypto";

jest.mock('../src/auto-api/auto-api.ts', () => {
    return {
      AutoApi: jest.fn().mockImplementation(() => {
        return {
            getEmailAddress: function(addr: string): Promise<{data: EmailAddressResponse }> {
                return Promise.resolve({
                    data: { emailAddress: addr + "@example.com" },
                    status: 200,
                    statusText: 'Ok',
                  });
            },
            getEmailContent: function (): Promise<{ data: Buffer }> {
            return Promise.resolve({
              data: readFileSync('./test/resources/example.eml'),
              status: 200,
              statusText: 'Ok',
            });
          },
        };
      }),
    };
  });

describe('email tests', () => {

    it('should parse the email correctly', async () => {
        var emailHelper = new EmailHelper(new AutoApi({      
            autoApiBaseUrl: 'http://example.com',
            apiKey: 'apiKey',
            productId: -1,
        }));
        const uuid = randomUUID()
        var inbox = await emailHelper.getInbox(uuid);
        expect(inbox.emailAddress).toBe(uuid + "@example.com");
        var email = await inbox.getEmail();
        expect(email.from?.text).toBe("from@example.com");
        expect((<AddressObject> email.to)?.text).toBe("to@example.com");

        // One Attachment
        expect(email.attachments.length).toBe(1);
        expect(email.attachments[0].filename).toBe("cat.jpg");
    }) 
})