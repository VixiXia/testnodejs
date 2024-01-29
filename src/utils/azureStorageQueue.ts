import { StorageSharedKeyCredential, QueueClient, QueueSendMessageResponse } from "@azure/storage-queue";
import { crypt } from "./helperFunctions";

const connectionStringParts = `${process.env.AzureWebJobsStorage}`.split(";");
const accountName = connectionStringParts[1].replace("AccountName=", "");
const accountKey = connectionStringParts[2].replace("AccountKey=", "");
const queueName = process.env.AZURE_QUEUE_NAME || "taxct-queue";

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const queueClient = new QueueClient(`https://${accountName}.queue.core.windows.net/${queueName}`, sharedKeyCredential);

export interface queueEmail {
  id: string;
  sentTo: string[];
  header: string;
  content: string;
}

export async function addEmailToQueue(message: queueEmail): Promise<QueueSendMessageResponse> {
  if (message.header) {
    message.header = crypt(accountKey, message.header);
  }
  if (message.content) {
    message.content = crypt(accountKey, message.content);
  }
  return await queueClient.sendMessage(JSON.stringify(message));
}
